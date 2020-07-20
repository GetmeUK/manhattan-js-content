
import * as $ from 'manhattan-essentials'


/**
 * Convert a set of transforms from the image editor into the manhattan format.
 */
export function convertTransforms(transforms) {
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
