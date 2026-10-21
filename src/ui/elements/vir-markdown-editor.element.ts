import {EditorState} from '@codemirror/state';
import {EditorView} from '@codemirror/view';
import {css, defineElement, defineElementEvent, html, onDomCreated} from 'element-vir';
import {createMarkdownExtensions} from '../editor/markdown-extensions.js';

export const VirMarkdownEditor = defineElement<{
    /** Changing this loads `initialContent` and resets the undo history. */
    fileId: string;
    /**
     * Only read when `fileId` changes. After that the editor owns the text, because the saved copy
     * lags behind typing while it is written to IndexedDB.
     */
    initialContent: string;
}>()({
    tagName: 'vir-markdown-editor',
    events: {
        contentChange: defineElementEvent<string>(),
    },
    state() {
        return {
            view: undefined as EditorView | undefined,
            loadedFileId: '',
        };
    },
    styles: css`
        :host {
            display: block;
            height: 100%;
            overflow: hidden;
        }

        .editor-parent {
            height: 100%;
        }
    `,
    cleanup({state}) {
        state.view?.destroy();
    },
    render({inputs, state, updateState, host, dispatch, events}) {
        function createState() {
            return EditorState.create({
                doc: inputs.initialContent,
                extensions: createMarkdownExtensions((content) => {
                    dispatch(
                        new events.contentChange({
                            detail: content,
                        }),
                    );
                }),
            });
        }

        if (state.view && state.loadedFileId !== inputs.fileId) {
            state.view.setState(createState());
            state.view.focus();
            updateState({
                loadedFileId: inputs.fileId,
            });
        }

        return html`
            <div
                class="editor-parent"
                ${onDomCreated((element) => {
                    if (state.view) {
                        return;
                    }
                    const view = new EditorView({
                        parent: element,
                        root: host.shadowRoot,
                        state: createState(),
                    });
                    view.focus();
                    updateState({
                        view,
                        loadedFileId: inputs.fileId,
                    });
                })}
            ></div>
        `;
    },
});
