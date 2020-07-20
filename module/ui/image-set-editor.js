
/**
 * A manager that allows users to edit versions of an image set (including
 * uploading imagery for non-base versions of the image set).
 */
export class ImageSetEditor {

    constructor(uploadURL, container=null) {
        super(container)

        // The URL images should be uploaded to
        this._uploadURL = uploadURL
    }

    // - Versions
    // - Crop ratios
    // - Preview size
    // - Container

    // imageURL,
    // cropRatio,
    // [600, 600],
    // $.one('[data-mh-content-ui]')
}
