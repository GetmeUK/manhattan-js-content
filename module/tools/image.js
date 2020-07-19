import * as contenttools from 'ContentTools'
import * as $ from 'manhattan-essentials'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'

import * as image from './imagery/image.js'
import * as imageFixture from './imagery/image-fixture.js'
import * as pictureFixture from './imagery/picture-fixture.js'

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
                || elm.type() === 'PictureFixture'
        }
        return true
    }

    /**
     * Apply the tool (insert/update) an image within the page content.
     */
    static apply(elm, selection, onDone) {

        // Wrap the `onDone` callback so that we can trigger the
        // 'tool-applied' event when the application of the tool is done.
        const onDoneWrapped = (done) => {
            onDone(done)

            if (done) {
                ImageTool.dispatchEditorEvent(
                    'tool-applied',
                    {
                        'tool': ImageTool,
                        'element': elm,
                        selection
                    }
                )
            }
        }

        // Dispatch the apply event
        const allow = ImageTool.dispatchEditorEvent(
            'tool-apply',
            {
                'tool': ImageTool,
                'element': elm,
                selection
            }
        )

        if (!allow) {
            return
        }

        // If supported store the state of the current element so we can
        // restore if the user cancels the action.
        if (elm.storeState) {
            elm.storeState()
        }

        // Based on the type of element call the relevant apply
        switch (elm.type()) {

        case 'ImageFixture':
            imageFixture.apply(elm, onDoneWrapped, ImageTool.uploadURL)
            break

        case 'PictureFixture':
            pictureFixture.apply(elm, onDoneWrapped, ImageTool.uploadURL)
            break

        default:
            image.apply(elm, onDoneWrapped, ImageTool.uploadURL)

        }
    }
}


// Tool settings

ImageTool.uploadURL = '/manage/upload-asset'


// Register the tool

ImageTool.label = 'Image'
ImageTool.icon = 'image'

ContentTools.ToolShelf.stow(ImageTool, 'manhattan-image')

