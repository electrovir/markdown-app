import {ensureErrorAndPrependMessage} from '@augment-vir/common';
import {colorCss} from '@electrovir/color';
import {type AsyncValue, css, defineElement, html, listen} from 'element-vir';
import {viraTheme} from 'vira';
import {
    createFrontendState,
    type FrontendStateObservable,
} from '../../data/frontend-state/create-frontend-state.js';
import {createDocPaths, getRouteDocId} from '../../data/frontend-state/frontend-router.js';
import {
    createMarkdownFile,
    getFileTitle,
    type MarkdownFile,
    moveFile,
} from '../../data/markdown-db.js';
import {downloadMarkdown, downloadMarkdownPdf} from '../../util/export-markdown.js';
import {VirMarkdownEditor} from './vir-markdown-editor.element.js';
import {VirSidebar} from './vir-sidebar.element.js';

export const VirApp = defineElement()({
    tagName: 'vir-app',
    state() {
        return {
            frontendState: createFrontendState() as AsyncValue<FrontendStateObservable>,
        };
    },
    styles: css`
        :host {
            display: flex;
            height: 100dvh;
            width: 100%;
            overflow: hidden;
            ${colorCss(viraTheme.colors['theme-default'])};
        }

        ${VirSidebar} {
            width: 240px;
            flex-shrink: 0;
        }

        ${VirMarkdownEditor} {
            flex-grow: 1;
            min-width: 0;
        }
    `,
    init({state, updateState}) {
        if (state.frontendState instanceof Promise) {
            state.frontendState
                .then((frontendState) => {
                    frontendState.listen(true, () => {
                        updateState({
                            frontendState,
                        });
                    });
                })
                .catch((error: unknown) => {
                    updateState({
                        frontendState: ensureErrorAndPrependMessage(error, 'Failed to load.'),
                    });
                });
        }
    },
    cleanup({state}) {
        if (!(state.frontendState instanceof Promise) && !(state.frontendState instanceof Error)) {
            state.frontendState.destroy();
        }
    },
    render({state}) {
        if (state.frontendState instanceof Promise) {
            return '';
        } else if (state.frontendState instanceof Error) {
            return state.frontendState.message;
        }

        /** `saveFiles` and `openDoc` below lose the `instanceof` narrowing on `state`. */
        const frontendState = state.frontendState.value;
        const files = frontendState.localDbClient.value.files || [];
        const docId = getRouteDocId(frontendState.currentRoute);
        const selectedFile = files.find((file) => file.id === docId);

        async function saveFiles(newFiles: ReadonlyArray<Readonly<MarkdownFile>>) {
            await frontendState.localDbClient.set.files([...newFiles]);
        }

        function openDoc(fileId: string) {
            frontendState.router.setRoute({
                paths: createDocPaths(fileId),
            });
        }

        return html`
            <${VirSidebar.assign({
                files,
                selectedFileId: docId || '',
                themeClient: frontendState.themeClient,
            })}
                ${listen(VirSidebar.events.fileSelect, (event) => {
                    openDoc(event.detail);
                })}
                ${listen(VirSidebar.events.newFile, async () => {
                    const newFile = createMarkdownFile();
                    /** The route redirects away from doc ids that aren't saved yet. */
                    await saveFiles([
                        newFile,
                        ...files,
                    ]);
                    openDoc(newFile.id);
                })}
                ${listen(VirSidebar.events.fileDelete, async (event) => {
                    const file = files.find((entry) => entry.id === event.detail);
                    if (file && globalThis.confirm(`Delete "${getFileTitle(file)}"?`)) {
                        await saveFiles(files.filter((entry) => entry.id !== file.id));
                    }
                })}
                ${listen(VirSidebar.events.fileMove, async (event) => {
                    await saveFiles(
                        moveFile({
                            files,
                            ...event.detail,
                        }),
                    );
                })}
                ${listen(VirSidebar.events.downloadMarkdown, () => {
                    if (selectedFile) {
                        downloadMarkdown({
                            title: getFileTitle(selectedFile),
                            content: selectedFile.content,
                        });
                    }
                })}
                ${listen(VirSidebar.events.exportPdf, async () => {
                    if (selectedFile) {
                        await downloadMarkdownPdf({
                            title: getFileTitle(selectedFile),
                            content: selectedFile.content,
                        });
                    }
                })}
            ></${VirSidebar}>
            ${selectedFile
                ? html`
                      <${VirMarkdownEditor.assign({
                          fileId: selectedFile.id,
                          initialContent: selectedFile.content,
                      })}
                          ${listen(VirMarkdownEditor.events.contentChange, async (event) => {
                              await saveFiles(
                                  (frontendState.localDbClient.value.files || []).map((file) => {
                                      return file.id === selectedFile.id
                                          ? {
                                                ...file,
                                                content: event.detail,
                                                updatedAt: Date.now(),
                                            }
                                          : file;
                                  }),
                              );
                          })}
                      ></${VirMarkdownEditor}>
                  `
                : ''}
        `;
    },
});
