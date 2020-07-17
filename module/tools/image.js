import * as contenttools from 'ContentTools'
import * as $ from 'manhattan-essentials'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'

import {ImageUploader} from './../ui/image-uploader'


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
        // restore if the user cancels the action.
        if (elm.storeState) {
            elm.storeState()
        }

        // @@ Based on the type of element call the relevant apply
        switch (elm.type()) {

        case 'ImageFixture':
            console.log('image fixture')
            break

        case 'PictureFixture':
            console.log('picture fixture')
            break

        default:
            console.log('image')

        }
    }
}


// Tool settings

ImageTool.uploadURL = '/manage/upload-asset'


// Register the tool

ImageTool.label = 'Image'
ImageTool.icon = 'image'

ContentTools.ToolShelf.stow(ImageTool, 'manhattan-image')

