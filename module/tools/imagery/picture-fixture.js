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
    localTransforms,
    transition
) {
    let proxy = $.closest(elm.domElement(), '[data-mh-image-set-proxy]')
    const versions = JSON.parse(proxy.dataset.mhImageSetVersions)
    const versionLabels = JSON.parse(proxy.dataset.mhImageSetVersionLabels)
    const cropAspectRatios
        = JSON.parse(proxy.dataset.mhImageSetCropAspectRatios)

    // Create UI to allow the user to edit the image
    const imageEditor = new ImageSetEditor(
        assetKeys,
        imageURLs,
        localTransforms,
        versions,
        versionLabels,
        cropAspectRatios,
        uploadURL,
        $.one('[data-mh-content-ui]')
    )
    imageEditor.init()
    imageEditor.show(transition)

}


// Public

/**
 * Apply the picture fixture tool.
 */
export function apply(elm, onDone, uploadURL) {

    if (elm.sources().length > 0) {
        // Edit existing image
        console.log('Existing image')

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
                    const meta = event.asset['core_meta']['image']
                    const {variations} = event.asset

                    const assetKeys = {}
                    assetKeys[versions[0]] = asset['key']

                    const imageURLs = {}
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


// # TODO
//
// - Send the image set editor the local transforms (in editor format). Get
//   the imagined code for editing an image set in place and see if we can't
//   use this for testing to shorten the process.
//
// - Get the image set editor to open up the version editor for the base
//   version initially. Don't use a version property for this it doesn't have
//   enough control as we can't send it the the transition flag. Instead create
//   an edit method that accepts a version and transition flag, call this
//   instead of show (which can be removed as a method).
//
// - Create a custom version control in our version editor. When the version
//   is changed this should trigger an event against overlay that the image set
//   editor can listen to and on receiving can use the edit method to swich to
//   editing a different version, we'll need to send the version labels dict
//   and the current version to the version editor.
//
// - Sources will hold the information relevant for each version of the image
//   set, e.g:
//
//   <picture>
//       <source
//           srcset="..."
//           media="(...)"
//           data-mh-version="l"
//           data-mh-asset-key="..." // Optional if uses base version
//           data-mh-draft="..." // Optional if uses base version
//           data-base-transforms="..." // Optional (should always have a value)
//           data-local-transforms="..." // Contains the crop/rotate transforms
//       >
//   </picture>
//
