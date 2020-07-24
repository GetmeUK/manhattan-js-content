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
    const imageEditor = new ImageSetEditor(
        assetKeys,
        imageURLs,
        baseTransforms,
        versions,
        versionLabels,
        cropAspectRatios,
        uploadURL,
        $.one('[data-mh-content-ui]')
    )
    imageEditor.init(transition)
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
                    const meta = event.asset['core_meta']['image']
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


// # TODO
//
// - We need to get the transforms from the editor whenever the version changes
//   and update the base transforms model we have (we'd do the same on
//   confirm and on upload where the transforms would be reset).
//
// - Once we have some local transforms defined to play with add support for
//   presetting the crop / rotate for an image in the version editor. I think
//   this might well be a pain to do :/
//
// - Add support for closing the editor and taking no action.
//
// - Add upload / clear buttons (dependent on version and own image url)
//
// - Add support for clearing a version (e.g the test m version).
//
// - Add an upload (acceptor) button.
//
// - Add support for uploading an asset (uploader to show during the upload).
//
// - We need to be able to generate preview URIs via the image editor without
//   initializing it (this should be fine, worst case not showing it) in order
//   to generate data URIs for for all sources on confirm.
//
//   Some potential issues that exist are:
//
//   - Preview URIs are a fixed size, the picture really needs to be set up
//     within a frame that can use `object-fit` in order to be able to preview
//     images.
//   - We'll need to be able to populate crop/rotate transforms against the
//     image editor. Potentially we can just cheat at this by setting the
//     values against the crop tool with a false bounds.
//
// - ...
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
