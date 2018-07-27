import * as contenttools from 'ContentTools'


/**
 * A custom remove tool for ContentTools / Manhattan that allows image
 * fixtures to be cleared using the remove tool.
 */
class RemoveTool extends ContentTools.Tool {

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
     * Apply the default remove tool behaviour but also support for clearing
     * images from image fixtures.
     */
    static apply(elm, selection, onDone) {
        if (elm.type() === 'ImageFixture') {

            const eventDetails = {
                'tool': RemoveTool,
                'element': elm,
                selection
            }

            if (!RemoveTool.dispatchEditorEvent('tool-apply', eventDetails)) {
                return
            }

            // Clear the image fixture's image
            elm.src('')
            elm.removeAttr('data-mh-asset-key')
            elm.removeAttr('data-mh-draft')
            elm.removeAttr('data-mh-base-transforms')
            elm.removeAttr('data-mh-local-transforms')

            RemoveTool.dispatchEditorEvent('tool-apply', eventDetails)

        } else {
            ContentTools.Tools.Remove.apply(elm, selection, onDone)
        }
    }
}


// Register the tool

RemoveTool.label = 'Remove'
RemoveTool.icon = 'remove'

ContentTools.ToolShelf.stow(RemoveTool, 'manhattan-remove')

