
import * as $ from 'manhattan-essentials'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'
import {Overlay} from 'manhattan-assets/module/ui/overlay'


// -- Class definition --

/**
 * An image editor that allows a version within an image set to be edited.
 */
export class VersionEditor extends ImageEditor {

    /**
     * Initialize the image editor overlay.
     */
    init() {
        const cls = this.constructor
        super.init()

        // Clear any buttons created initializing the image editor
        this.buttons.innerHTML = ''

        // Create 3 regions into which buttons (controls) can be placed
        const regionCSS = cls.css['controlRegion']

        this._dom['buttonRegions'] = {}

        this._dom['buttonRegions']['left'] = $.create(
            'div',
            {'class': `${regionCSS} ${regionCSS}--left`}
        )
        this.buttons.appendChild(this._dom['buttonRegions']['left'])

        this._dom['buttonRegions']['center'] = $.create(
            'div',
            {'class': `${regionCSS} ${regionCSS}--center`}
        )
        this.buttons.appendChild(this._dom['buttonRegions']['center'])

        this._dom['buttonRegions']['right'] = $.create(
            'div',
            {'class': `${regionCSS} ${regionCSS}--right`}
        )
        this.buttons.appendChild(this._dom['buttonRegions']['right'])

        // Create the controls

        // Buttons
        this.addRegionButton('center', 'rotate', 'rotate', 'rotate')
        this.addRegionButton('right', 'okay', 'okay', 'okay')
        this.addRegionButton('right', 'cancel', 'cancel', 'cancel')
    }

    /**
     * Add a button to the overlay within a region.
     */
    addRegionButton(region, css, eventType, tooltip) {

        // Create the button
        const buttonElm = $.create(
            'div',
            {'class': Overlay.css[css]}
        )
        if (tooltip) {
            buttonElm.setAttribute('title', Overlay.tooltips[tooltip])
        }

        // Add event handlers
        $.listen(
            buttonElm,
            {
                'click': (event) => {
                    event.preventDefault()
                    if (event.buttons === 0) {
                        $.dispatch(this.overlay, eventType)
                    }
                }
            }
        )

        // Add the button to the buttons container
        this._dom['buttonRegions'][region].appendChild(buttonElm)

        return buttonElm
    }
}


// -- CSS classes --

VersionEditor.css = {

    /**
     * Applied to a region within buttons.
     */
    'controlRegion': 'mh-version-editor__control-region',

    /**
     * Applied to the image.
     */
    'image': 'mh-version-editor__image',

    /**
     * Applied to the version editor overlay.
     */
    'imageEditor': 'mh-version-editor',

    /**
     * Applied to the image mask.
     */
    'mask': 'mh-version-editor__image-mask',

    /**
     * Applied to the editing table when no transition should be applied to
     * the image (e.g during a resize).
     */
    'noTransitions': 'mh-version-editor__table--no-transitions',

    /**
     * Applied to the editing table.
     */
    'table': 'mh-version-editor__table'
}
