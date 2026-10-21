import {createId} from '@paralleldrive/cuid2';
import {defineLocalDbClientKey, LocalDbClient} from 'local-db-client';
import {defineShape} from 'object-shape-tester';

export const markdownFileShape = defineShape({
    id: '',
    content: '',
    updatedAt: 0,
});

export type MarkdownFile = typeof markdownFileShape.runtimeType;

export async function createMarkdownDb() {
    return await LocalDbClient.createClient(
        {
            files: defineLocalDbClientKey(
                defineShape([
                    markdownFileShape,
                ]),
                () => {
                    return {
                        shouldUpdate: false,
                    };
                },
            ),
        },
        {
            storeName: 'markdown-app',
        },
    );
}

export type MarkdownDb = Awaited<ReturnType<typeof createMarkdownDb>>;

export function createMarkdownFile() {
    return {
        id: createId(),
        content: '',
        updatedAt: Date.now(),
    };
}

/** The first non-empty line with leading markdown block markers (`#`, `>`, `-`, etc.) removed. */
export function getFileTitle(file: Readonly<Pick<MarkdownFile, 'content'>>) {
    const firstLine = file.content
        .split('\n')
        .map((line) => line.replace(/^[\s#>*\-+]+/, '').trim())
        .find((line) => line);

    return firstLine || 'Untitled';
}

/**
 * Moves a file to `insertIndex`, which counts positions in the list before the file is taken out
 * (so `files.length` moves it to the end). Returns `files` unchanged if the id isn't found.
 */
export function moveFile({
    files,
    fileId,
    insertIndex,
}: Readonly<{
    files: ReadonlyArray<Readonly<MarkdownFile>>;
    fileId: string;
    insertIndex: number;
}>) {
    const fromIndex = files.findIndex((file) => file.id === fileId);
    const file = files[fromIndex];

    if (!file) {
        return files;
    }

    return files
        .toSpliced(fromIndex, 1)
        .toSpliced(fromIndex < insertIndex ? insertIndex - 1 : insertIndex, 0, file);
}
