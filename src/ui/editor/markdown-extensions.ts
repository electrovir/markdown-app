// cspell:words keymap menlo

import {createArray} from '@augment-vir/common';
import {defaultKeymap, history, historyKeymap, indentWithTab} from '@codemirror/commands';
import {markdown, markdownLanguage} from '@codemirror/lang-markdown';
import {HighlightStyle, syntaxHighlighting, syntaxTree} from '@codemirror/language';
import {languages} from '@codemirror/language-data';
import {RangeSetBuilder} from '@codemirror/state';
import {
    Decoration,
    type DecorationSet,
    EditorView,
    keymap,
    placeholder,
    ViewPlugin,
    type ViewUpdate,
} from '@codemirror/view';
import {tags} from '@lezer/highlight';
import {viraThemeByKeys} from 'vira';

const monospaceFont = 'ui-monospace, SFMono-Regular, Menlo, monospace';
const codeBackground = String(viraThemeByKeys.grey['behind-bg'].invisible.background.value);
const dimColor = String(viraThemeByKeys.grey.foreground.placeholder.foreground.value);
const linkColor = String(viraThemeByKeys.blue.foreground.body.foreground.value);

/**
 * Formats the markdown in place, Discord style: the syntax characters stay visible but dimmed while
 * the text they wrap is rendered bold, italic, as a heading, etc. The markdown colors are Vira CSS
 * variables so they follow the light/dark theme without reconfiguring the editor.
 */
const markdownHighlightStyle = HighlightStyle.define([
    {
        tag: tags.heading1,
        fontSize: '1.6em',
        fontWeight: '700',
    },
    {
        tag: tags.heading2,
        fontSize: '1.35em',
        fontWeight: '700',
    },
    {
        tag: tags.heading3,
        fontSize: '1.15em',
        fontWeight: '700',
    },
    {
        tag: [
            tags.heading4,
            tags.heading5,
            tags.heading6,
        ],
        fontWeight: '700',
    },
    {
        tag: tags.strong,
        fontWeight: '700',
    },
    {
        tag: tags.emphasis,
        fontStyle: 'italic',
    },
    {
        tag: tags.strikethrough,
        textDecoration: 'line-through',
    },
    {
        tag: [
            tags.processingInstruction,
            tags.contentSeparator,
            tags.labelName,
        ],
        color: dimColor,
    },
    {
        tag: tags.quote,
        color: String(viraThemeByKeys.grey.foreground['non-body'].foreground.value),
    },
    {
        tag: tags.link,
        color: linkColor,
    },
    {
        tag: tags.url,
        color: linkColor,
        textDecoration: 'underline',
    },
    {
        tag: tags.monospace,
        fontFamily: monospaceFont,
        fontSize: '0.9em',
        backgroundColor: codeBackground,
        borderRadius: '3px',
    },
    /**
     * Token colors for fenced code blocks that name a language. These are mid-tones so they read on
     * both the light and dark backgrounds.
     */
    {
        tag: [
            tags.keyword,
            tags.operatorKeyword,
            tags.modifier,
        ],
        color: '#a35bd6',
    },
    {
        tag: [
            tags.string,
            tags.regexp,
        ],
        color: '#3f9e57',
    },
    {
        tag: [
            tags.number,
            tags.bool,
            tags.null,
            tags.atom,
        ],
        color: '#c7801a',
    },
    {
        tag: [
            tags.comment,
            tags.lineComment,
            tags.blockComment,
        ],
        color: dimColor,
        fontStyle: 'italic',
    },
    {
        tag: [
            tags.typeName,
            tags.className,
        ],
        color: '#2b9aa8',
    },
    {
        tag: [
            tags.function(tags.variableName),
            tags.function(tags.propertyName),
        ],
        color: '#3d7fd9',
    },
]);

const codeBlockLine = Decoration.line({
    class: 'cm-code-block-line',
});

function buildCodeBlockDecorations(view: EditorView) {
    const builder = new RangeSetBuilder<Decoration>();

    view.visibleRanges.forEach(({from, to}) => {
        syntaxTree(view.state).iterate({
            from,
            to,
            enter(node) {
                if (node.name !== 'FencedCode' && node.name !== 'CodeBlock') {
                    return;
                }
                const firstLine = view.state.doc.lineAt(node.from).number;
                const lastLine = view.state.doc.lineAt(node.to).number;
                createArray(lastLine - firstLine + 1, (index) => {
                    return view.state.doc.line(firstLine + index).from;
                }).forEach((lineStart) => {
                    builder.add(lineStart, lineStart, codeBlockLine);
                });
                return false;
            },
        });
    });

    return builder.finish();
}

/**
 * Gives whole code block lines a monospace font and background. Highlight styles alone only reach
 * the text spans, and a fenced block with a language has no single span covering its contents.
 */
const codeBlockPlugin = ViewPlugin.fromClass(
    class {
        public decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildCodeBlockDecorations(view);
        }

        public update(update: ViewUpdate) {
            if (
                update.docChanged ||
                update.viewportChanged ||
                syntaxTree(update.state) !== syntaxTree(update.startState)
            ) {
                this.decorations = buildCodeBlockDecorations(update.view);
            }
        }
    },
    {
        decorations(plugin) {
            return plugin.decorations;
        },
    },
);

const editorTheme = EditorView.theme({
    '&': {
        height: '100%',
        fontSize: '16px',
        color: 'inherit',
        backgroundColor: 'transparent',
    },
    '&.cm-focused': {
        outline: 'none',
    },
    '.cm-scroller': {
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    },
    '.cm-content': {
        padding: '24px 32px 50vh',
        maxWidth: '860px',
        caretColor: 'currentColor',
    },
    '.cm-cursor': {
        borderLeftColor: 'currentColor',
    },
    '.cm-placeholder': {
        color: dimColor,
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection':
        {
            backgroundColor: String(viraThemeByKeys.blue['behind-bg'].placeholder.background.value),
        },
    '.cm-code-block-line': {
        fontFamily: monospaceFont,
        fontSize: '0.9em',
        backgroundColor: codeBackground,
    },
    '.cm-code-block-line > span': {
        backgroundColor: 'transparent',
    },
});

export function createMarkdownExtensions(onDocChange: (content: string) => void) {
    return [
        history(),
        keymap.of([
            ...defaultKeymap,
            ...historyKeymap,
            indentWithTab,
        ]),
        markdown({
            base: markdownLanguage,
            codeLanguages: languages,
        }),
        syntaxHighlighting(markdownHighlightStyle),
        codeBlockPlugin,
        EditorView.lineWrapping,
        placeholder('Start writing…'),
        editorTheme,
        EditorView.updateListener.of((update) => {
            if (update.docChanged) {
                onDocChange(update.state.doc.toString());
            }
        }),
    ];
}
