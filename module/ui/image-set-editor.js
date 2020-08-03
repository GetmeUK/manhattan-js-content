import * as $ from 'manhattan-essentials'

import {ImageUploader} from './image-uploader'
import {VersionEditor} from './version-editor'


/**
 * A manager that allows users to edit versions of an image set (including
 * uploading imagery for non-base versions of the image set).
 */
export class ImageSetEditor {

    constructor(
        assetKeys,
        imageURLs,
        baseTransforms,
        versions,
        versionLabels,
        cropAspectRatios,
        fixCropAspectRatio,
        uploadURL,
        container
    ) {

        // A map of asset keys for versions
        this._assetKeys = Object.assign({}, assetKeys)

        // A map of image URLs for versions
        this._imageURLs = Object.assign({}, imageURLs)

        // A map of base transforms for versions
        this._baseTransforms = Object.assign({}, baseTransforms)

        // A list of versions defined for the image set
        this._versions = versions.slice()

        // A map of labels for each version in the image set
        this._versionLabels = Object.assign({}, versionLabels)

        // A map of crop ratios to be applied for each version in the image set
        this._cropAspectRatios = Object.assign({}, cropAspectRatios || {})

        // Flag indicating if the aspect ratio of the crop region for the image
        // versions should be fixed.
        this._fixCropAspectRatio = fixCropAspectRatio

        // The URL images should be uploaded to
        this._uploadURL = uploadURL

        // A map of preview URLs generated for versions
        this._previewURIs = {}

        // The current image editor (the image set editor displays)
        this._editor = null

        // The current version of the image set being edited
        this._version = null

        // Flag indicating if the editor is being hidden
        this._hiding = false

        // Domain for related DOM elements
        this._dom = {

            // The element the image set editor is added to
            container,

            // An element created by the editor used purely to dispatch events
            // against for external listeners.
            'eventTarget': null
        }

        // Event handlers
        this._handlers = {
            'cancel': () => {
                $.dispatch(this.eventTarget, 'cancel')
            },
            'clear': () => {
                // Remove the image URL and base transforms associated with
                // this version.
                delete this._assetKeys[this.version]
                delete this._imageURLs[this.version]
                delete this._baseTransforms[this.version]
                this._edit(this.version, false, false)
            },
            'hidden': () => {
                this._versionEditor.destroy()
                this._versionEditor = null

                if (this._hiding) {
                    $.dispatch(this.eventTarget, 'hidden')
                    this._hiding = false
                }
            },
            'okay': () => {
                this._capture(() => {
                    const versionData = {}

                    for (const version of this._versions) {
                        versionData[version] = {
                            'assetKey': this._assetKeys[version],
                            'baseTransforms':
                                this._baseTransforms[version] || [],
                            'draftURL': this._imageURLs[version],
                            'previewURI': this._previewURIs[version]
                        }
                    }

                    $.dispatch(
                        this.eventTarget,
                        'okay',
                        {versionData}
                    )
                })
            },
            'upload': (event) => {
                // Remove the existing image editor
                this._versionEditor.destroy()
                this._versionEditor = null

                // Add an uploader
                const imageUploader = new ImageUploader(
                    this._uploadURL,
                    this.container
                )
                imageUploader.init()
                imageUploader.show()

                $.listen(
                    imageUploader.overlay,
                    {
                        'imageready': (imageReadyEvent) => {
                            // New image uploaded

                            // Destroy the image uploader
                            imageUploader.destroy()

                            // Set the new image for the version
                            const {asset} = imageReadyEvent
                            const {variations} = asset

                            this._assetKeys[this.version] = asset['key']
                            this._imageURLs[this.version]
                                = variations['--draft--']['url']
                            delete this._baseTransforms[this.version]

                            // Edit this
                            this._edit(this.version, false, false)
                        },
                        'cancel': () => {
                            // User cancelled uploading the image
                            imageUploader.destroy()
                            this._edit(this.version, false, false)
                        }
                    }
                )

                imageUploader.upload(event.files[0])

                // Don't transition to the uploader
                imageUploader.overlay.classList.add('mh-overlay--no-fade')
                $.dispatch(imageUploader.overlay, 'transitionend')
                imageUploader.overlay.classList.remove('mh-overlay--no-fade')
            },
            'versionChange': (event) => {
                this._edit(event.version, false)
            }
        }
    }

    // Getters & Setters

    get baseVersion() {
        return this._versions[0]
    }

    get container() {
        return this._dom.container
    }

    get eventTarget() {
        return this._dom.eventTarget
    }

    get version() {
        return this._version
    }

    // Public methods

    /**
     * Remove the image set editor.
     */
    destroy() {
        if (this._versionEditor) {
            this._versionEditor.destroy()
        }

        // Clear the event target element
        this.eventTarget.remove()
    }

    /**
     * Get an image URL for a version of the image set.
     */
    getImageURL(version) {
        if (version in this._imageURLs) {
            return this._imageURLs[version]
        }
        return this._imageURLs[this.baseVersion]
    }

    /**
     * Return true if the given version has its own image.
     */
    hasOwnImage(version) {
        return this.getImageURL(version) !== this.getImageURL(this.baseVersion)
    }

    /**
     * Hide the image set editor.
     */
    hide() {
        if (this._versionEditor) {
            this._hiding = true
            this._versionEditor.hide()
        } else {
            $.dispatch(this.eventTarget, 'hidden')
        }
    }

    /**
     * Initialize the image set editor.
     */
    init(transition) {

        // Create an element to dispatch events against for external listeners
        this._dom.eventTarget = $.create('div')
        this.container.appendChild(this.eventTarget)

        // Edit the base version
        this._edit(this.baseVersion, transition)
    }

    // Private

    /**
     * Capture the editor values.
     */
    _capture(callback) {
        const newTransforms = this._versionEditor.transforms

        // Have the transforms changed
        const currentTransforms = this._baseTransforms[this.version] || []

        if (JSON.stringify(newTransforms)
            !== JSON.stringify(currentTransforms)) {

            // Transforms
            this._baseTransforms[this._version] = newTransforms

            // PreviewURL
            const preview
                = this._versionEditor.previewDataURI.then(([dataURI, size]) => {
                    this._previewURIs[this._version] = dataURI
                    callback()
                })

            return
        }
        callback()
    }

    /**
     * Edit the given version of the image in the editor.
     */
    _edit(version, transition, capture=true) {

        const afterCapture = () => {
            if (this._versionEditor) {
                // Remove the existing image editor
                this._versionEditor.destroy()
                this._versionEditor = null
            }

            // Change the version
            this._version = version

            // Create a new editor for this version of the image set
            this._versionEditor = new VersionEditor(
                this.baseVersion,
                this.version,
                this._versionLabels,
                this.getImageURL(version),
                this._baseTransforms[this._version],
                this.hasOwnImage(version),
                this._cropAspectRatios[version] || null,
                this._fixCropAspectRatio,
                [600, 600],
                this.container
            )
            this._versionEditor.init()
            this._versionEditor.show()

            // Listen for events
            $.listen(
                this._versionEditor.overlay,
                {
                    'cancel': this._handlers.cancel,
                    'clear': this._handlers.clear,
                    'hidden': this._handlers.hidden,
                    'okay': this._handlers.okay,
                    'upload': this._handlers.upload,
                    'versionchange': this._handlers.versionChange
                }
            )

            // If switching from the uploader to the editor we don't
            // transition (using a fade).
            if (!transition) {
                this._versionEditor.overlay.classList.add('mh-overlay--no-fade')
                $.dispatch(this._versionEditor.overlay, 'transitionend')
                this._versionEditor
                    .overlay
                    .classList
                    .remove('mh-overlay--no-fade')
            }
        }

        if (this._versionEditor && capture) {
            this._capture(afterCapture)
        } else {
            afterCapture()
        }

    }

}
