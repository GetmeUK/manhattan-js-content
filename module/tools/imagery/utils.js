
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

/**
 * @@
 * Return crop instructions for the given image, or sensible defaults if there
 * are none.
 */
export function getCropOptions(elm, naturalRatio) {
    let cropRatio = naturalRatio
    let fixCropRatio = false

    // @@ This no longer needs to cope with images

    if (typeof elm.attr('data-mh-transform-proxied') === 'undefined') {
        if (elm.attr('data-mh-crop-ratio')) {
            cropRatio = parseFloat(elm.attr('data-mh-crop-ratio'))
        }
        if (typeof elm.attr('data-mh-fix-crop-ratio') !== 'undefined') {
            fixCropRatio = true
        }
    } else {
        const proxyElm = $.closest(
            elm.domElement(),
            '[data-mh-transform-proxy]'
        )
        if (proxyElm) {
            if (proxyElm.dataset.mhCropRatio) {
                cropRatio = parseFloat(proxyElm.dataset.mhCropRatio)
            }
            if ('mhFixCropRatio' in proxyElm.dataset) {
                fixCropRatio = true
            }
        }
    }

    return [cropRatio, fixCropRatio]
}
