import {PathTree} from 'spa-router-vir';

export const frontendPathTree = new PathTree({
    allowBare: true,
    children: {
        doc: {
            allowBare: true,
            children: {
                ':doc-id': {},
            },
        },
    },
});

export type FrontendPaths = Readonly<typeof frontendPathTree.PathsType>;
