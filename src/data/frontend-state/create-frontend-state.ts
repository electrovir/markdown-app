import {check} from '@augment-vir/assert';
import {type AnyObject} from '@augment-vir/common';
import {Observable} from 'element-vir';
import {LocalDbClientValueUpdateEvent} from 'local-db-client';
import {ViraThemeClient} from 'vira';
import {createMarkdownDb, createMarkdownFile} from '../markdown-db.js';
import {createDocPaths, createFrontendRouter, getRouteDocId} from './frontend-router.js';

const welcomeContent = [
    '# Welcome',
    '',
    'Write **markdown** here. The _syntax_ stays visible while it is formatted as you type.',
    '',
    '- Files save automatically in this browser.',
    '- Use `PDF` or the download button at the top of the sidebar to export.',
    '',
    '```ts',
    "const greeting = 'hello';",
    '```',
    '',
].join('\n');

export type FrontendStateObservable = Awaited<ReturnType<typeof createFrontendState>>;
export type FrontendState = FrontendStateObservable['value'];

export async function createFrontendState() {
    const localDbClient = await createMarkdownDb();
    if (!localDbClient.value.files?.length) {
        await localDbClient.set.files([
            {
                ...createMarkdownFile(),
                content: welcomeContent,
            },
        ]);
    }

    const themeClient = new ViraThemeClient();
    const router = createFrontendRouter();

    const rawFrontendStateObservable = new Observable({
        equalityCheck: check.strictEquals,
        defaultValue: {
            localDbClient,
            themeClient,
            router,
            currentRoute: router.readCurrentRoute(),
        },
    });

    function update(
        this: void,
        updateValue: Partial<(typeof rawFrontendStateObservable)['value']> = {},
    ) {
        rawFrontendStateObservable.setValue({
            ...rawFrontendStateObservable.value,
            ...updateValue,
        });
    }

    /** Keeps the route on an existing doc, so a deleted doc or a bare URL lands on the first doc. */
    async function redirectToExistingDoc() {
        const files = localDbClient.value.files || [];
        const docId = getRouteDocId(rawFrontendStateObservable.value.currentRoute);
        const firstFile = files[0];

        if (!firstFile) {
            await localDbClient.set.files([
                createMarkdownFile(),
            ]);
        } else if (!files.some((file) => file.id === docId)) {
            router.setRoute(
                {
                    paths: createDocPaths(firstFile.id),
                },
                {
                    replace: true,
                },
            );
        }
    }

    const unlistenRouter = router.listen(false, async (newRoute) => {
        update({
            currentRoute: newRoute,
        });
        await redirectToExistingDoc();
    });
    const unlistenLocalDb = localDbClient.listen(LocalDbClientValueUpdateEvent, async () => {
        update();
        await redirectToExistingDoc();
    });
    await redirectToExistingDoc();

    return Object.assign(
        rawFrontendStateObservable as AnyObject as Omit<
            typeof rawFrontendStateObservable,
            'destroy' | 'setValue'
        >,
        {
            update,
            destroy() {
                unlistenRouter();
                unlistenLocalDb();
                router.destroy();
                themeClient.destroy();
                rawFrontendStateObservable.destroy();
            },
        },
    );
}
