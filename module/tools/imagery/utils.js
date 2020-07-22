
import * as $ from 'manhattan-essentials'

/**
 * Convert a set of transforms from the server into a suitable format for the
 * client-side image editor.
 */
export function transformsToClient(transforms) {
    const clientTransforms = []

    for (let transform of transforms) {
        switch (transform.id) {

        case 'image.rotate':
            clientTransforms.push(['rotate', transform.settings.angle])
            break

        case 'image.crop':
            clientTransforms.push([
                'crop',
                [
                    [
                        transform.settings.left,
                        transform.settings.top
                    ],
                    [
                        transform.settings.right,
                        transform.settings.bottom
                    ]
                ]
            ])
            break

        // no default

        }
    }

    return clientTransforms
}

/**
 * Convert a set of client transforms from the image editor into a suitable
 * format for the server.
 */
export function transformsToServer(transforms) {
    const mhTransforms = []

    for (let transform of transforms) {
        switch (transform[0]) {

        case 'rotate':
            mhTransforms.push({
                'id': 'image.rotate',
                'settings': {'angle': transform[1]}
            })
            break

        case 'crop':
            mhTransforms.push({
                'id': 'image.crop',
                'settings': {
                    'top': transform[1][0][1],
                    'left': transform[1][0][0],
                    'bottom': transform[1][1][1],
                    'right': transform[1][1][0]
                }
            })
            break

        // no default

        }
    }

    return mhTransforms
}

// @@ User terms transformsToClient
