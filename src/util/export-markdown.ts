import {sanitizeFileName} from '@augment-vir/common';
import {marked} from 'marked';

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
            },
            content: htmlToPdfmake(await marked.parse(content), {
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
                        margin: [
                            12,
                            5,
                            0,
                            10,
                        ],
                    },
                },
            }),
        })
        .download(
            toFileName({
                title,
                extension: 'pdf',
            }),
        );
}
