import * as $ from 'manhattan-essentials'
import {Acceptor} from 'manhattan-assets/module/ui/acceptor'
import {Overlay} from 'manhattan-assets/module/ui/overlay'
import {Uploader} from 'manhattan-assets/module/ui/uploader'

// -- Class definition --


/**
 * An overlay that allows users to upload an image.
 */
export class ImageUploader extends Overlay {

    constructor(uploadURL, container=null) {
        super(container)

        // The URL images should be uploaded to
        this._uploadURL = uploadURL

        // Handle to a file acceptor for the dialog
        this._acceptor = null

        // Handle to a file uploader for the dialog
        this._uploader = null
    }

    // -- Public methods --

    /**
     * Remove the image uploader overlay.
     */
    destroy() {
        super.destroy()

        // Destroy the file acceptor
        if (this._acceptor) {
            this._acceptor.destroy()
        }

        // Destroy the file uploader
        if (this._uploader) {
            this._uploader.destroy()
        }
    }

    /**
     * Initialize the image uploader.
     */
    init () {
        const cls = this.constructor

        // Initialize the overlay
        super.init(cls.css['imageUploader'])

        // Add an acceptor into the content area
        this._acceptor = new Acceptor(
            this.content,
            'content__acceptor',
            'Select an image...',
            'Drop image here',
            true,
            '',
            false
        )
        this._acceptor.init()

        $.listen(
            this._acceptor.acceptor,
            {
                'accepted': (event) => {
                    this._upload(event.files[0])
                }
            }
        )

        // Create the buttons
        this.addButton('cancel', 'cancel')

    }

    // -- Private methods --

    /**
     * Upload a file.
     */
    _upload(file) {

        // Remove the acceptor
        if (this._acceptor) {
            this._acceptor.destroy()
            this._acceptor = null
        }

        // Build the form data to upload the image
        const formData = new FormData()
        formData.append(
            'csrf_token',
            window.MANHATTAN_CONTENT_BASE_PARAMS['csrf_token']
        )
        formData.append('file', file)
        formData.append('file_type', 'image')
        formData.append('in_page', 'in_page')

        this._uploader = new Uploader(
            this.content,
            this._uploadURL,
            formData,
            'horizontal'
        )
        this._uploader.init()


        $.listen(
            this._uploader.uploader,
            {
                'aborted cancelled error': () => {
                    $.dispatch(this.overlay, 'cancel')
                },
                'uploaded': (event) => {
                    const {payload} = JSON.parse(event.response)

                    if (payload.asset) {

                        // Success
                        $.dispatch(
                            this.overlay,
                            'imageready',
                            {'asset': payload.asset}
                        )

                    } else {

                        // Fail
                        $.dispatch(this.overlay, 'cancel', {'error': true})
                    }
                }
            }
        )
    }

}


// -- CSS classes --

ImageUploader.css = {

    /**
     * Applied to the image uploader overlay.
     */
    'imageUploader': 'mh-content-image-uploader'

}
