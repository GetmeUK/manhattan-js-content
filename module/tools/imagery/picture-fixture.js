import * as contenttools from 'ContentTools'
import * as $ from 'manhattan-essentials'

import {ImageUploader} from './../../ui/image-uploader'
import {convertTransforms} from './utils'


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

                    // @@ Edit the image uploaded along with providing options
                    // to switch version.
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
