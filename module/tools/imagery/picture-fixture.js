import * as contenttools from 'ContentTools'
import * as $ from 'manhattan-essentials'

import {ImageSetEditor} from './../../ui/image-set-editor'
import {ImageUploader} from './../../ui/image-uploader'
import {transformsToClient, transformsToServer} from './utils'


// Private

/**
 * Create a UI to allow a user to edit an image.
 */
function editImage(
    elm,
    onDone,
    uploadURL,
    assetKeys,
    imageURLs,
    baseTransforms,
    transition
) {
    let proxy = $.closest(elm.domElement(), '[data-mh-image-set-proxy]')
    const versions = JSON.parse(proxy.dataset.mhImageSetVersions)
    const versionLabels = JSON.parse(proxy.dataset.mhImageSetVersionLabels)
    const cropAspectRatios
        = JSON.parse(proxy.dataset.mhImageSetCropAspectRatios)

    // Create UI to allow the user to edit the image
    const imageSetEditor = new ImageSetEditor(
        assetKeys,
        imageURLs,
        baseTransforms,
        versions,
        versionLabels,
        cropAspectRatios,
        'mhImageSetFixCropAspectRatio' in proxy.dataset,
        uploadURL,
        $.one('[data-mh-content-ui]')
    )
    imageSetEditor.init(transition)

    $.listen(
        imageSetEditor.eventTarget,
        {
            'okay': (event) => {
                console.log(event.versionData)

                // - srcset use previewURI if one, else use existing URL,
                //   else use base version draft image.
                // - media (should always have a value)
                // - mh-asset-key is optional (has to have its own asset)
                // - base versions is optional (may not have been set for the
                //   image).
                // - data-mh-draft is optional (has to have its own asset)
                // - data-local-transforms (should always have a value)
                //
                //
                //   <picture>
                //       <source
                //           srcset="..."
                //           media="(...)"
                //           data-mh-version="l"
                //           data-mh-asset-key="..."
                //           data-mh-draft="..."
                //           data-base-transforms="..."
                //           data-local-transforms="..."
                //       >
                //   </picture>
                //

                onDone(true)
                imageSetEditor.hide()
            },
            'cancel': () => {
                // User cancelled editing the image
                if (elm.restoreState) {
                    elm.restoreState()
                }

                onDone(false)
                imageSetEditor.hide()
            },
            'hidden': () => {
                imageSetEditor.destroy()
            }
        }
    )
}


// Public

/**
 * Apply the picture fixture tool.
 */
export function apply(elm, onDone, uploadURL) {

    let assetKeys = null
    let imageURLs = null

    if (elm.sources().length > 0) {

        // Edit existing image
        assetKeys = {}
        imageURLs = {}
        const baseTransforms = {}

        for (const source of elm.sources()) {
            const version = source['data-mh-version']
            assetKeys[version] = source['data-mh-asset-key']
            imageURLs[version] = source['data-mh-draft']
            baseTransforms[version]
                = transformsToClient(source['data-mh-base-transforms'] || [])
        }

        editImage(
            elm,
            onDone,
            uploadURL,
            assetKeys,
            imageURLs,
            baseTransforms,
            true
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

                    let proxy = $.closest(
                        elm.domElement(),
                        '[data-mh-image-set-proxy]'
                    )
                    const versions
                        = JSON.parse(proxy.dataset.mhImageSetVersions)

                    // Switch to the editing environment
                    const {asset} = event
                    const {variations} = event.asset

                    assetKeys = {}
                    assetKeys[versions[0]] = asset['key']

                    imageURLs = {}
                    imageURLs[versions[0]] = variations['--draft--']['url']

                    editImage(
                        elm,
                        onDone,
                        uploadURL,
                        assetKeys,
                        imageURLs,
                        {},
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
