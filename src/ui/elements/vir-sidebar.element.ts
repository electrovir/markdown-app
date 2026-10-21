import {extractEventTarget} from '@augment-vir/web';
import {css, defineElement, defineElementEvent, html, listen} from 'element-vir';
import {
    createSizedIcon,
    LucideDownloadIcon,
    LucideFilePlusIcon,
    LucideTrashIcon,
    ViraButton,
    ViraColorVariant,
    ViraEmphasis,
    ViraSize,
    viraThemeByKeys,
    type ViraThemeClient,
    ViraThemeSwitcher,
} from 'vira';
import {getFileTitle, type MarkdownFile} from '../../data/markdown-db.js';

const buttonIconSize = 16;
const downloadIcon = createSizedIcon(LucideDownloadIcon, buttonIconSize);
const newFileIcon = createSizedIcon(LucideFilePlusIcon, buttonIconSize);
const trashIcon = createSizedIcon(LucideTrashIcon, 14);

const dropLineColor = viraThemeByKeys.blue.foreground.body.foreground.value;
const borderColor = viraThemeByKeys.grey['behind-bg'].decoration.background.value;

export const VirSidebar = defineElement<{
    files: ReadonlyArray<Readonly<MarkdownFile>>;
    selectedFileId: string;
    themeClient: Readonly<ViraThemeClient>;
}>()({
    tagName: 'vir-sidebar',
    events: {
        fileSelect: defineElementEvent<string>(),
        fileDelete: defineElementEvent<string>(),
        /** `insertIndex` counts positions in the list before the dragged file is taken out. */
        fileMove: defineElementEvent<{
            fileId: string;
            insertIndex: number;
        }>(),
        newFile: defineElementEvent<void>(),
        downloadMarkdown: defineElementEvent<void>(),
        exportPdf: defineElementEvent<void>(),
    },
    state() {
        return {
            draggedFileId: undefined as string | undefined,
            dropIndex: undefined as number | undefined,
        };
    },
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            height: 100%;
            font-family: ui-sans-serif, system-ui, sans-serif;
            font-size: 13px;
            border-right: 1px solid ${borderColor};
        }

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px;
            border-bottom: 1px solid ${borderColor};
            gap: 6px;
        }

        .header-actions {
            display: flex;
            gap: 6px;
            align-items: center;
        }

        .list {
            flex-grow: 1;
            min-height: 0;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 4px 0;
        }

        .row {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 2px 4px 2px 12px;
            cursor: pointer;
            user-select: none;
            min-height: 28px;

            &:hover {
                background-color: ${viraThemeByKeys.blue['behind-bg'].invisible.background.value};
            }

            &.selected {
                background-color: ${viraThemeByKeys.blue['behind-bg'].placeholder.background.value};
            }

            &:not(:hover) ${ViraButton} {
                visibility: hidden;
            }

            &.dragged {
                opacity: 0.5;
            }

            &.drop-before {
                box-shadow: inset 0 2px 0 ${dropLineColor};
            }

            &.drop-after {
                box-shadow: inset 0 -2px 0 ${dropLineColor};
            }
        }

        .name {
            flex-grow: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .footer {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 8px 10px;
            border-top: 1px solid ${borderColor};
        }

        .local-note {
            font-size: 11px;
            text-align: center;
            color: ${viraThemeByKeys.grey.foreground.placeholder.foreground.value};
        }
    `,
    render({inputs, state, dispatch, events, updateState}) {
        function clearDrag() {
            updateState({
                draggedFileId: undefined,
                dropIndex: undefined,
            });
        }

        return html`
            <div class="header">
                <${ViraButton.assign({
                    icon: newFileIcon,
                    buttonSize: ViraSize.Small,
                    color: ViraColorVariant.Positive,
                })}
                    title="New file"
                    ${listen('click', () => {
                        dispatch(
                            new events.newFile({
                                detail: undefined,
                            }),
                        );
                    })}
                ></${ViraButton}>
                <span class="header-actions">
                    <${ViraButton.assign({
                        text: 'PDF',
                        buttonSize: ViraSize.Small,
                        buttonEmphasis: ViraEmphasis.Subtle,
                        color: ViraColorVariant.Neutral,
                    })}
                        title="Export as PDF"
                        ${listen('click', () => {
                            dispatch(
                                new events.exportPdf({
                                    detail: undefined,
                                }),
                            );
                        })}
                    ></${ViraButton}>
                    <${ViraButton.assign({
                        icon: downloadIcon,
                        buttonSize: ViraSize.Small,
                        buttonEmphasis: ViraEmphasis.Subtle,
                        color: ViraColorVariant.Neutral,
                    })}
                        title="Download markdown"
                        ${listen('click', () => {
                            dispatch(
                                new events.downloadMarkdown({
                                    detail: undefined,
                                }),
                            );
                        })}
                    ></${ViraButton}>
                </span>
            </div>
            <div class="list">
                ${inputs.files.map((file, index) => {
                    return html`
                        <div
                            class=${[
                                'row',
                                file.id === inputs.selectedFileId ? 'selected' : '',
                                file.id === state.draggedFileId ? 'dragged' : '',
                                state.dropIndex === index ? 'drop-before' : '',
                                state.dropIndex === inputs.files.length &&
                                index === inputs.files.length - 1
                                    ? 'drop-after'
                                    : '',
                            ].join(' ')}
                            draggable="true"
                            ${listen('dragstart', (event) => {
                                /** Firefox won't start a drag without data set. */
                                event.dataTransfer?.setData('text/plain', file.id);
                                updateState({
                                    draggedFileId: file.id,
                                });
                            })}
                            ${listen('dragover', (event) => {
                                if (!state.draggedFileId) {
                                    return;
                                }
                                /** Without this the browser rejects the drop. */
                                event.preventDefault();
                                const rect = extractEventTarget(
                                    event,
                                    HTMLElement,
                                ).getBoundingClientRect();
                                const dropIndex =
                                    event.clientY < rect.top + rect.height / 2 ? index : index + 1;
                                if (dropIndex !== state.dropIndex) {
                                    updateState({
                                        dropIndex,
                                    });
                                }
                            })}
                            ${listen('drop', (event) => {
                                event.preventDefault();
                                if (state.draggedFileId && state.dropIndex != undefined) {
                                    dispatch(
                                        new events.fileMove({
                                            detail: {
                                                fileId: state.draggedFileId,
                                                insertIndex: state.dropIndex,
                                            },
                                        }),
                                    );
                                }
                                clearDrag();
                            })}
                            ${listen('dragend', () => {
                                clearDrag();
                            })}
                            ${listen('click', () => {
                                dispatch(
                                    new events.fileSelect({
                                        detail: file.id,
                                    }),
                                );
                            })}
                        >
                            <span class="name">${getFileTitle(file)}</span>
                            <${ViraButton.assign({
                                icon: trashIcon,
                                buttonSize: ViraSize.Small,
                                buttonEmphasis: ViraEmphasis.Subtle,
                                color: ViraColorVariant.Danger,
                            })}
                                title="Delete file"
                                ${listen('click', (event) => {
                                    event.stopPropagation();
                                    dispatch(
                                        new events.fileDelete({
                                            detail: file.id,
                                        }),
                                    );
                                })}
                            ></${ViraButton}>
                        </div>
                    `;
                })}
            </div>
            <div class="footer">
                <span class="local-note">Docs are saved locally only.</span>
                <${ViraThemeSwitcher.assign({
                    themeClient: inputs.themeClient,
                })}></${ViraThemeSwitcher}>
            </div>
        `;
    },
});
