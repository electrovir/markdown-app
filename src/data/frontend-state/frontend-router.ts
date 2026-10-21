import {isCuid} from '@paralleldrive/cuid2';
import {type FullSpaRoute, SpaRouter} from 'spa-router-vir';
import {type FrontendPaths, frontendPathTree} from './frontend-path-tree.js';

const githubPagesBasePath = 'markdown-app';

export type FrontendRoute = Readonly<FullSpaRoute<FrontendPaths>>;
export type FrontendRouter = SpaRouter<FrontendPaths>;

/** Returns the route's doc id, or `undefined` when the route is not a `/doc/<doc-id>` route. */
export function getRouteDocId(route: FrontendRoute) {
    return route.paths[0] === 'doc' ? route.paths[1] : undefined;
}

export function createDocPaths(docId: string): FrontendPaths {
    return [
        'doc',
        docId,
    ];
}

export function createFrontendRouter() {
    return new SpaRouter<FrontendPaths>({
        basePath: githubPagesBasePath,
        sanitizeRoute(rawRoute: Readonly<FullSpaRoute>) {
            const paths = frontendPathTree.sanitizePaths(rawRoute.paths);

            return {
                hash: undefined,
                paths: paths[0] === 'doc' && !isCuid(paths[1] || '') ? [] : paths,
                search: undefined,
            };
        },
    });
}
