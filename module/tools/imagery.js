import * as contenttools from 'ContentTools'
import * as $ from 'manhattan-essentials'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'

import {ImageUploader} from './../ui/imagery'

/**
 * A custom insert/update image tool for ContentTools / Manhattan.
 */
class ImageTool extends ContentTools.Tool {

    /**
     * Return true if the tool can be applied with the current
     * element/selection.
     */
    static canApply(elm, selection) {
        if (elm.isFixed()) {
            return elm.type() === 'ImageFixture'
        }
        return true
    }

    /**
     * Apply the tool (insert/update) an image within the page content.
     */
    static apply(elm, selection, onDone) {

        // Dispatch the apply event
        const eventDetails = {
            'tool': ImageTool,
            'element': elm,
            selection
        }

        if (!ImageTool.dispatchEditorEvent('tool-apply', eventDetails)) {
            return
        }

        // If supported store the state of the current element so we can
        // restore if if the user cancels the action.
        if (elm.storeState) {
            elm.storeState()
        }

        // Determine if we are updating an existing image or inserting a new
        // one.
        let isExisting = elm.type() === 'Image'
            || (elm.type() === 'ImageFixture' && elm.attr('data-mh-asset-key'))

        if (isExisting) {

            // Extract information about the image in order to be able to edit
            // it.
            let aspectRatio = 1.0
            if (elm.aspectRatio) {
                aspectRatio = 1.0 / elm.aspectRatio()
            }

            ImageTool.editImage(
                elm,
                selection,
                onDone,
                elm.attr('data-mh-asset-key'),
                elm.attr('data-mh-draft'),
                aspectRatio
            )

        } else {

            // Make the upload URL configurable
            const imageUploader = new ImageUploader(ImageTool.uploadURL)
            imageUploader.init()
            imageUploader.show()

            // Handle user interactions with the uploader
            $.listen(
                imageUploader.overlay,
                {
                    'imageready': (event) => {

                        // Destroy the image uploader
                        imageUploader.destroy()

                        // Switch to the editing environment
                        const imageSize = event
                            .asset['core_meta']['image']['size']

                        ImageTool.editImage(
                            elm,
                            selection,
                            onDone,
                            event.asset['key'],
                            event.asset['variations']['--draft--'].url,
                            imageSize[0] / imageSize[1],
                            false
                        )
                    },
                    'cancel': (event) => {
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
                        imageUploader.destroy()
                    }
                }
            )
        }
    }

    /**
     * Convert a set of transforms from the image editor into the manhattan
     * format.
     */
    static convertTransforms(transforms) {

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

    static editImage(
        elm,
        selection,
        onDone,
        key,
        imageURL,
        naturalRatio,
        fadeIn=true
    ) {

        const [cropRatio, fixCropRatio] = ImageTool.getCropInstruction(
            elm,
            naturalRatio
        )

        // Set up the image editor dialog
        const imageEditor = new ImageEditor(
            imageURL,
            cropRatio,
            fixCropRatio,
            [600, 600]
        )
        imageEditor.init()
        imageEditor.show()

        // If switching from the uploader to the editor we don't
        // fade/transition.
        if (!fadeIn) {
            imageEditor.overlay.classList.add('mh-overlay--no-fade')
            $.dispatch(imageEditor.overlay, 'transitionend')
            imageEditor.overlay.classList.remove('mh-overlay--no-fade')
        }

        $.listen(
            imageEditor.overlay,
            {
                'okay': (event) => {
                    imageEditor.previewDataURI.then(([dataURI, sizeInfo]) => {

                        const imageAttrs = {
                            'alt': '',
                            'src': dataURI,
                            'width': sizeInfo.width,
                            'height': sizeInfo.height,
                            'data-ce-max-width': sizeInfo.maxWidth,
                            'data-mh-asset-key': key,
                            'data-mh-draft': imageURL
                        }

                        // Get the base transforms
                        const baseTransforms = ImageTool
                            .convertTransforms(imageEditor.transforms)

                        if (baseTransforms) {
                            imageAttrs['data-mh-base-transforms'] = JSON
                                .stringify(baseTransforms)
                        }

                        // Extract any local transforms from the element
                        const localTransforms = ImageTool
                            .getLocalTransforms(elm)

                        if (localTransforms) {
                            imageAttrs['data-mh-local-transforms'] = JSON
                                .stringify(localTransforms)
                        }

                        ImageTool.insertImage(elm, imageAttrs)

                        onDone(true)

                        const eventDetails = {
                            'tool': ImageTool,
                            'element': elm,
                            selection
                        }
                        ImageTool.dispatchEditorEvent(
                            'tool-apply',
                            eventDetails
                        )

                        imageEditor.hide()
                    })
                },
                'cancel': () => {
                    if (elm.restoreState) {
                        elm.restoreState()
                    }

                    onDone(false)
                    imageEditor.hide()
                },
                'hidden': () => {
                    imageEditor.destroy()
                }
            }
        )
    }

    /**
     * Return crop instructions for the image, or sensible defaults if there
     * are none.
     */
    static getCropInstruction(elm, naturalRatio) {
        let cropRatio = naturalRatio
        let fixCropRatio = false

        if (elm.type() !== 'ImageFixture') {
            return [naturalRatio, false]
        }

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

    /**
     * Return local transform definitions from the DOM.
     */
    static getLocalTransforms(elm) {
        let localTransforms = []

        if (typeof elm.attr('data-mh-transform-proxied') === 'undefined') {
            if (elm.attr('data-mh-local-transforms')) {
                localTransforms = JSON
                    .parse(elm.attr('data-mh-local-transforms'))
            }
        } else {
            const proxyElm = $.closest(
                elm.domElement(),
                '[data-mh-transform-proxy]'
            )
            if (proxyElm && proxyElm.dataset.mhLocalTransforms) {
                localTransforms = JSON
                    .parse(proxyElm.dataset.mhLocalTransforms)
            }
        }

        return localTransforms
    }

    /**
     * Insert an uploaded/modified image into the page.
     */
    static insertImage(elm, imageAttrs) {

        if (elm.type() === 'ImageFixture') {

            // Fixtures
            elm.src(imageAttrs['src'])

            elm.attr('data-mh-asset-key', imageAttrs['data-mh-asset-key'])
            elm.attr('data-mh-draft', imageAttrs['data-mh-draft'])
            elm.attr(
                'data-mh-base-transforms',
                imageAttrs['data-mh-base-transforms']
            )
            elm.attr(
                'data-mh-local-transforms',
                imageAttrs['data-mh-local-transforms']
            )

        } else if (elm.type() === 'Image') {

            elm.attr('src', imageAttrs['src'])
            elm.attr(
                'data-mh-base-transforms',
                imageAttrs['data-mh-base-transforms']
            )
            elm.attr(
                'data-mh-local-transforms',
                imageAttrs['data-mh-local-transforms']
            )
            elm._aspectRatio = imageAttrs['height'] / imageAttrs['width']
            elm.size([imageAttrs['width'], imageAttrs['height']])
            elm.unmount()
            elm.mount()

        } else {

            // Create the new image element
            const image = new ContentEdit.Image(imageAttrs)

            // Find the insert position
            let [node, index] = ImageTool._insertAt(elm)
            node.parent().attach(image, index)

            // Focus the new image
            image.focus()
        }

        // Ensure an alt tag is set (even if it's empty)
        if (!elm.attr('alt')) {
            elm.attr('alt', '')
        }
    }
}


// Tool settings

ImageTool.uploadURL = '/manage/upload-asset'
ImageTool.transform = '/manage/transform-asset'


// Register the tool

ImageTool.label = 'Image'
ImageTool.icon = 'image'

ContentTools.ToolShelf.stow(ImageTool, 'manhattan-image')

