import * as $ from 'manhattan-essentials'

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

        // The URL images should be uploaded to
        this._uploadURL = uploadURL

        // The current image editor (the image set editor displays)
        this._editor = null

        // The current version of the image set being edited
        this._version = null

        // Domain for related DOM elements
        this._dom = {container}

        // Event handlers
        this._handlers = {
            'cancel': (ev) => {
                this._imageEditor.hide()
                $.dispatch(this._dom.container, 'cancel')
            },
            'clear': (ev) => {
                // Remove the image URL and base transforms associated with
                // this version.
                delete this._imageURLs[this.version]
                delete this._baseTransforms[this.version]
                this._edit(this.version, false, false)
            },
            'hidden': (ev) => {
                this._imageEditor.destroy()
            },
            'versionChange': (ev) => {
                this._edit(ev.version, false)
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

    get version() {
        return this._version
    }

    // Public methods

    /**
     * Remove the image set editor.
     */
    destroy() {
        // @@
        console.log(this, 'destroy')
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
     * Hide the image set editor.
     */
    hide() {
        // @@
        console.log(this, 'hide')
    }

    /**
     * Initialize the image set editor.
     */
    init(transition) {

        // Edit the base version
        this._edit(this.baseVersion, transition)
    }

    // Private

    /**
     * Edit the given version of the image in the editor.
     */
    _edit(version, transition, storeTransforms=true) {
        if (this._imageEditor) {

            if (storeTransforms) {
                // Store the transforms for the current version before
                // switching.
                this._baseTransforms[this._version]
                    = this._imageEditor.transforms
            }

            // Remove the existing image editor
            this._imageEditor.destroy()
            this._imageEditor = null
        }

        // Change the version
        this._version = version

        // Create a new editor for this version of the image set
        this._imageEditor = new VersionEditor(
            this.baseVersion,
            this.version,
            this._versionLabels,
            this.getImageURL(version),
            this.getImageURL(version) !== this.getImageURL(this.baseVersion),
            this._baseTransforms[this._version],
            this._cropAspectRatios[version] || 1.0,
            Object.keys(this._cropAspectRatios).length > 0,
            [600, 600],
            this._dom.container
        )
        this._imageEditor.init()
        this._imageEditor.show()

        // Listen for events
        $.listen(
            this._imageEditor.overlay,
            {
                'cancel': this._handlers.cancel,
                'clear': this._handlers.clear,
                'hidden': this._handlers.hidden,
                'versionchange': this._handlers.versionChange
            }
        )

        // @@ other events

        // If switching from the uploader to the editor we don't
        // transition (using a fade).
        if (!transition) {
            this._imageEditor.overlay.classList.add('mh-overlay--no-fade')
            $.dispatch(this._imageEditor.overlay, 'transitionend')
            this._imageEditor.overlay.classList.remove('mh-overlay--no-fade')
        }
    }

}
