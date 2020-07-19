import * as contenttools from 'ContentTools'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'
import * as $ from 'manhattan-essentials'

import {ImageUploader} from './../../ui/image-uploader'
import {convertTransforms} from './utils'


// Private

/**
 * Insert an image using the given attributes.
 */
function insertImage(elm, attrs) {
    const image = new ContentEdit.Image(attrs)
    let [node, index] = ContentTools.Tool._insertAt(elm)
    node.parent().attach(image, index)
    image.focus()
}

/**
 * Update the focused image using the given attributes.
 */
function updateImage(elm, attrs) {
    elm.attr('src', attrs['src'])
    elm.attr('data-mh-base-transforms', attrs['data-mh-base-transforms'])
    elm.attr('data-mh-local-transforms', attrs['data-mh-local-transforms'])
    elm._aspectRatio = attrs['height'] / attrs['width']
    elm.size([attrs['width'], attrs['height']])
    elm.unmount()
    elm.mount()
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

    // Create UI to allow the user to edit the image
    const imageEditor = new ImageEditor(
        imageURL,
        naturalRatio,
        false,
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
                        = convertTransforms(imageEditor.transforms)

                    if (baseTransforms) {
                        attrs['data-mh-base-transforms']
                            = JSON.stringify(baseTransforms)
                    }

                    // Insert / update the image
                    if (elm.type() === 'Image') {
                        updateImage(elm, attrs)
                    } else {
                        insertImage(elm, attrs)
                    }

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
 * Apply the image tool.
 */
export function apply(elm, onDone, uploadURL) {

    if (elm.type() === 'Image') {
        // Edit existing image
        editImage(
            elm,
            onDone,
            elm.attr('data-mh-asset-key'),
            elm.attr('data-mh-draft'),
            1.0 / elm.aspectRatio()
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
