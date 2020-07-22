import * as contenttools from 'ContentTools'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'
import * as $ from 'manhattan-essentials'

import {ImageUploader} from './../../ui/image-uploader'
import {transformsToServer} from './utils'


// Private

/**
 * Return crop instructions for the given image, or sensible defaults if there
 * are none.
 */
export function getCropOptions(elm, naturalRatio) {
    let cropRatio = naturalRatio
    let fixCropRatio = false

    // New approach
    let proxy = $.closest(elm.domElement(), '[data-mh-image-proxy]')
    if (proxy) {
        if (proxy.dataset.mhImageCropAspectRatio) {
            cropRatio = parseFloat(proxy.dataset.mhImageCropAspectRatio)
        }
        if ('mhImageFixedCrop' in proxy.dataset) {
            fixCropRatio = true
        }
        return [cropRatio, fixCropRatio]
    }

    // Past approach (for backwards compatibility)
    if (typeof elm.attr('data-mh-transform-proxied') === 'undefined') {
        if (elm.attr('data-mh-crop-ratio')) {
            cropRatio = parseFloat(elm.attr('data-mh-crop-ratio'))
        }
        if (typeof elm.attr('data-mh-fix-crop-ratio') !== 'undefined') {
            fixCropRatio = true
        }
        return [cropRatio, fixCropRatio]
    }

    proxy = $.closest(elm.domElement(), '[data-mh-transform-proxy]')
    if (proxy) {
        if (proxy.dataset.mhCropRatio) {
            cropRatio = parseFloat(proxy.dataset.mhCropRatio)
        }
        if ('mhFixCropRatio' in proxy.dataset) {
            fixCropRatio = true
        }
    }
    return [cropRatio, fixCropRatio]
}

/**
 * Get the local transforms defined for the image fixture.
 */
function getLocalTransforms(elm) {
    let localTransforms = []

    // New approach
    let proxy = $.closest(elm.domElement(), '[data-mh-image-proxy]')
    if (proxy && proxy.dataset.mhImageTransforms) {
        return JSON.parse(proxy.dataset.mhImageTransforms)
    }

    // Past approach (for backwards compatibility)
    if (!proxy) {
        if (typeof elm.attr('data-mh-transform-proxied') === 'undefined') {
            if (elm.attr('data-mh-local-transforms')) {
                return JSON.parse(elm.attr('data-mh-local-transforms'))
            }
        } else {
            proxy = $.closest(elm.domElement(), '[data-mh-transform-proxy]')
            if (proxy && proxy.dataset.mhLocalTransforms) {
                return JSON.parse(proxy.dataset.mhLocalTransforms)
            }
        }
    }

    return []
}

/**
 * Update the image fixture using the given attributes.
 */
function updateImage(elm, attrs) {
    elm.src(attrs['src'])
    elm.attr('data-mh-asset-key', attrs['data-mh-asset-key'])
    elm.attr('data-mh-draft', attrs['data-mh-draft'])
    elm.attr('data-mh-base-transforms', attrs['data-mh-base-transforms'])
    elm.attr('data-mh-local-transforms', attrs['data-mh-local-transforms'])
}

/**
 * Create a UI to allow a user to edit an image.
 */
function editImage(
    elm,
    onDone,
    key,
    imageURL,
    naturalRatio,
    transition
) {
    // Get crop options
    const [cropRatio, fixCropRatio] = getCropOptions(elm, naturalRatio)

    // Create UI to allow the user to edit the image
    const imageEditor = new ImageEditor(
        imageURL,
        cropRatio,
        fixCropRatio,
        [600, 600],
        $.one('[data-mh-content-ui]')
    )
    imageEditor.init()
    imageEditor.show()

    $.listen(
        imageEditor.overlay,
        {
            'okay': (event) => {
                imageEditor.previewDataURI.then(([dataURI, size]) => {

                    // Build the attributes for the image
                    const attrs = {
                        'alt': '',
                        'src': dataURI,
                        'width': size.width,
                        'height': size.height,
                        'data-ce-max-width': size.maxWidth,
                        'data-mh-asset-key': key,
                        'data-mh-draft': imageURL
                    }

                    const baseTransforms
                        = transformsToServer(imageEditor.transforms)

                    if (baseTransforms) {
                        attrs['data-mh-base-transforms']
                            = JSON.stringify(baseTransforms)
                    }

                    const localTransforms = getLocalTransforms(elm)

                    if (baseTransforms) {
                        attrs['data-mh-local-transforms']
                            = JSON.stringify(localTransforms)
                    }

                    // Insert / update the image
                    updateImage(elm, attrs)

                    // Trigger the 'done' callback
                    onDone(true)

                    imageEditor.hide()
                })
            },
            'cancel': () => {
                // User cancelled editing the image
                if (elm.restoreState) {
                    elm.restoreState()
                }

                onDone(false)
                imageEditor.hide()
            },
            'hidden': () => {
                // The image editor UI has been closed (remove it)
                imageEditor.destroy()
            }
        }
    )

    // If switching from the uploader to the editor we don't
    // transition (using a fade).
    if (!transition) {
        imageEditor.overlay.classList.add('mh-overlay--no-fade')
        $.dispatch(imageEditor.overlay, 'transitionend')
        imageEditor.overlay.classList.remove('mh-overlay--no-fade')
    }
}

// Public

/**
 * Apply the image fixture tool.
 */
export function apply(elm, onDone, uploadURL) {

    if (elm.attr('data-mh-asset-key')) {
        // Edit existing image
        editImage(
            elm,
            onDone,
            elm.attr('data-mh-asset-key'),
            elm.attr('data-mh-draft'),
            1.0
        )

    } else {
        // Insert a new image

        // Create UI to allow the user to upload an image
        const imageUploader = new ImageUploader(
            uploadURL,
            $.one('[data-mh-content-ui]')
        )
        imageUploader.init()
        imageUploader.show()

        $.listen(
            imageUploader.overlay,
            {
                'imageready': (event) => {
                    // New image uploaded

                    // Destroy the image uploader
                    imageUploader.destroy()

                    // Switch to the editing environment
                    const {asset} = event
                    const meta = event.asset['core_meta']['image']
                    const {variations} = event.asset
                    editImage(
                        elm,
                        onDone,
                        asset['key'],
                        variations['--draft--']['url'],
                        meta['size'][0] / meta['size'][1],
                        false
                    )
                },
                'cancel': (event) => {
                    // User cancelled uploading the image

                    imageUploader.hide()

                    if (elm.restoreState) {
                        elm.restoreState()
                    }

                    onDone(false)

                    if (event.error) {
                        const flash = new ContentTools.FlashUI('no')
                    }
                },
                'hidden': () => {
                    // The image editor UI has been closed (remove it)
                    imageUploader.destroy()
                }
            }
        )
    }
}
