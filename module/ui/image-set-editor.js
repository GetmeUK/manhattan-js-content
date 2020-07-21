import * as $ from 'manhattan-essentials'

import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'


/**
 * A manager that allows users to edit versions of an image set (including
 * uploading imagery for non-base versions of the image set).
 */
export class ImageSetEditor {

    constructor(
        assetKeys,
        imageURLs,
        versions,
        versionLabels,
        cropAspectRatios,
        uploadURL,
        container=null
    ) {

        // @@ Local transforms???

        // A list of versions defined for the image set
        this._versions = versions.slice()

        // A map of labels for each version in the image set
        this._versionLabels = Object.assign({}, versionLabels)

        // A map of crop ratios to be applied for each version in the image set
        this._cropAspectRatios = Object.assign({}, cropAspectRatios || {})

        // The URL images should be uploaded to
        this._uploadURL = uploadURL

        // A map of asset keys for versions
        this._assetKeys = Object.assign({}, assetKeys)

        // A map of image URLs for versions
        this._imageURLs = Object.assign({}, imageURLs)

        // The current image editor (the image set editor displays)
        this._editor = null

        // The current version of the image set being edited
        this._version = this.baseVersion

        // Domain for related DOM elements
        this._dom = {container}
    }

    // Getters & Setters

    get baseVersion() {
        return this._versions[0]
    }

    get version() {
        return this._version
    }

    set version(version) {
        if (version !== this._version) {
            return
        }

        // Change the version
        this._version = version

        // ?? What if version is called before we've initialized the editor?

        // Create a new editor for this version of the image set
        this._imageEditor = new ImageEditor(
            this.getImageURL(version),
            this._cropAspectRatios[version],
            true,
            [600, 600],
            this._dom.container
        )
        this._imageEditor.init()
    }

    // Public methods

    /**
     * Remove the image set editor.
     */
    destroy() {
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
        console.log(this, 'hide')
    }

    /**
     * Initialize the image set editor.
     */
    init() {
        this.version = this.baseVersion
    }

    /**
     * Show the image set editor.
     */
    show(transition) {
        this._imageEditor.show()

        // If switching from the uploader to the editor we don't
        // transition (using a fade).
        if (!transition) {
            this._imageEditor.overlay.classList.add('mh-overlay--no-fade')
            $.dispatch(this._imageEditor.overlay, 'transitionend')
            this._imageEditor.overlay.classList.remove('mh-overlay--no-fade')
        }
    }
}
