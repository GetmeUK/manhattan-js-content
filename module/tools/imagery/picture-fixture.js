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
    const media = JSON.parse(proxy.dataset.mhImageSetMedia)
    const localTransforms = JSON.parse(proxy.dataset.mhImageSetTransforms)
    let cropAspectRatios = null
    if (proxy.dataset.mhImageSetCropAspectRatios) {
        cropAspectRatios = JSON.parse(proxy.dataset.mhImageSetCropAspectRatios)
    }

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

                // Get the base draft image

                // Build a map of existing sources for the picture.
                const sources = {}
                for (const source of elm.sources()) {
                    if (source['data-mh-version']) {
                        sources[source['data-mh-version']] = source
                    }
                }

                // Build a new list of sources for the picture
                const newSources = []
                for (const version of versions) {
                    if (version in event.versionData) {
                        const data = event.versionData[version]
                        const source = sources[version]
                        const newSource = {
                            'media': media[version],
                            'data-mh-version': version
                        }

                        // srcset
                        newSource['srcset'] = data.previewURI
                        if (!newSource['srcset'] && source) {
                            newSource['srcset'] = source['srcset']
                        }
                        if (!newSource['srcset']) {
                            newSource['srcset'] = imageSetEditor
                                .getImageURL(version)
                        }

                        // data-mh-asset-key
                        if (data.assetKey) {
                            newSource['data-mh-asset-key'] = data.assetKey
                        }

                        // data-mh-draft
                        if (data.draftURL) {
                            newSource['data-mh-draft'] = data.draftURL
                        }

                        // data-mh-base-transforms
                        if (data.baseTransforms.length > 0) {
                            newSource['data-mh-base-transforms']
                                = JSON.stringify(transformsToServer(data
                                    .baseTransforms))
                        }

                        // data-local-transforms
                        if ((localTransforms[version] || []).length > 0) {
                            newSource['data-mh-local-transforms']
                                = JSON.stringify(localTransforms[version])
                        }

                        newSources.push(newSource)
                    }
                }

                // Update the sources for the picture element
                elm.sources(newSources)

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

            if (source['data-mh-asset-key']) {
                assetKeys[version] = source['data-mh-asset-key']
            }

            if (source['data-mh-draft']) {
                imageURLs[version] = source['data-mh-draft']
            }

            baseTransforms[version] = []
            if (source['data-mh-base-transforms']) {
                baseTransforms[version]
                    = transformsToClient(JSON
                        .parse(source['data-mh-base-transforms']))
            }
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
