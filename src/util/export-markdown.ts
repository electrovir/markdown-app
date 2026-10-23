import {sanitizeFileName} from '@augment-vir/common';
import {marked} from 'marked';

const blockTag = String.raw`<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote|pre|hr|table|thead|tbody|tr|th|td)\b[^>]*>`;
/**
 * Html-to-pdfmake turns whitespace between tags into blank lines, and marked puts a newline after
 * every block tag. Whitespace between inline tags is left alone because it separates words.
 */
const whitespaceBetweenBlockTags = new RegExp(String.raw`(${blockTag})\s+(?=${blockTag})`, 'gi');

function toFileName({title, extension}: Readonly<{title: string; extension: string}>) {
    return [
        sanitizeFileName(title) || 'untitled',
        extension,
    ].join('.');
}

export function downloadMarkdown({title, content}: Readonly<{title: string; content: string}>) {
    const url = URL.createObjectURL(
        new Blob(
            [
                content,
            ],
            {
                type: 'text/markdown',
            },
        ),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = toFileName({
        title,
        extension: 'md',
    });
    link.click();
    URL.revokeObjectURL(url);
}

/**
 * Builds a PDF from the markdown and downloads it. Uses the PDF format's built-in Helvetica and
 * Courier fonts so no font files have to be fetched, but those fonts can't draw characters outside
 * Western European scripts (such as emoji).
 */
export async function downloadMarkdownPdf({
    title,
    content,
}: Readonly<{title: string; content: string}>) {
    const [
        {default: pdfMake},
        {default: htmlToPdfmake},
    ] = await Promise.all([
        import('pdfmake'),
        import('html-to-pdfmake'),
    ]);
    Object.assign(globalThis, {
        pdfMake,
    });
    await import('./pdf-standard-fonts.js');

    /** Merged into html-to-pdfmake's default heading styles, which only have a bottom margin. */
    const headingStyle = {
        marginTop: 10,
    };
    const codeStyle = {
        font: 'Courier',
        fontSize: 10,
        background: '#eeeeee',
    };

    await pdfMake
        .createPdf({
            info: {
                title,
            },
            pageMargins: 50,
            defaultStyle: {
                font: 'Helvetica',
                fontSize: 11,
                lineHeight: 1.25,
            },
            content: htmlToPdfmake(
                (await marked.parse(content))
                    .replaceAll(whitespaceBetweenBlockTags, '$1')
                    /**
                     * A `blockquote` default style lands on the quote's paragraphs, whose own
                     * margins override it, so the indent goes on the quote node itself.
                     */
                    .replaceAll('<blockquote>', `<blockquote data-pdfmake='{"margin":[12,0,0,0]}'>`)
                    .trim(),
                {
                    defaultStyles: {
                        code: codeStyle,
                        pre: {
                            ...codeStyle,
                            margin: [
                                0,
                                5,
                                0,
                                10,
                            ],
                            preserveLeadingSpaces: true,
                        },
                        blockquote: {
                            color: '#555555',
                            italics: false,
                        },
                        h1: headingStyle,
                        h2: headingStyle,
                        h3: headingStyle,
                        h4: headingStyle,
                        h5: headingStyle,
                        h6: headingStyle,
                        li: {
                            marginBottom: 3,
                        },
                        ul: {
                            marginBottom: 10,
                        },
                        ol: {
                            marginBottom: 10,
                        },
                    },
                },
            ),
        })
        .download(
            toFileName({
                title,
                extension: 'pdf',
            }),
        );
}
