
import * as $ from 'manhattan-essentials'
import {ImageEditor} from 'manhattan-assets/module/ui/image-editor'
import {Overlay} from 'manhattan-assets/module/ui/overlay'


// -- Class definition --

/**
 * An image editor that allows a version within an image set to be edited.
 */
export class VersionEditor extends ImageEditor {

    constructor(
        version,
        versionLabels,
        imageURL,
        cropAspectRatio=1.0,
        fixCropAspectRatio=false,
        maxPreviewSize=[600, 600],
        container=null
    ) {
        super(
            imageURL,
            cropAspectRatio,
            fixCropAspectRatio,
            maxPreviewSize,
            container
        )

        // The version currently being edited
        this._version = version

        // A map of versions to their associated labels
        this._versionLabels = Object.assign({}, versionLabels)

        // Event handlers

        this._handlers['closeVersionSelect'] = (ev) => {

            // Close the version select.
            const cls = this.constructor
            const openCSS = cls.css['versionsOpen']

            // Ignore this event if the version select is closed
            if (this._dom.versions.classList.contains(openCSS)) {

                // Ignore this event if the user clicked on the versions
                // element.
                const versionsElm = $.closest(
                    ev.target,
                    `.${cls.css['versions']}`
                )
                if (!versionsElm) {
                    this._dom.versions.classList.remove(openCSS)
                }
            }
        }

        this._handlers['versionSelect'] = (ev) => {

            // Handle the version select interactions.
            const cls = this.constructor
            const openCSS = cls.css['versionsOpen']

            if (this._dom.versions.classList.contains(openCSS)) {

                // Close version select
                this._dom.versions.classList.remove(openCSS)

                // Switch to the selected version (if changed)
                const versionElm = $.closest(
                    ev.target,
                    `.${cls.css['version']}`
                )
                if (versionElm) {
                    if (versionElm.dataset.version !== this._version) {
                        $.dispatch(
                            this.overlay,
                            'versionChange',
                            {'version': versionElm.dataset.version}
                        )
                    }
                }

            } else {
                // Open version select
                this._dom.versions.classList.add(openCSS)
            }
        }
    }

    /**
     * Remove the version editor overlay.
     */
    destroy() {
        if (this._dom.versions !== null) {
            $.ignore(document, {'mousedown': this._handlers.closeVersionSelect})
            this._dom.versions = null
        }

        super.destroy()
    }

    /**
     * Initialize the version editor overlay.
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

        // Create the version selector
        this._dom.versions = $.create('div', {'class': cls.css['versions']})

        for (const [version, label] of Object.entries(this._versionLabels)) {
            const versionElm = $.create(
                'div',
                {
                    'class': cls.css['version'],
                    'data-version': version
                }
            )
            versionElm.textContent = label

            if (version === this._version) {
                versionElm.classList.add(cls.css['versionSelected'])
            }

            this._dom.versions.appendChild(versionElm)
        }

        // Handle events for versions
        $.listen(this._dom.versions, {'click': this._handlers.versionSelect})
        $.listen(document, {'mousedown': this._handlers.closeVersionSelect})

        this._dom['buttonRegions']['left'].appendChild(this._dom.versions)

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
    'table': 'mh-version-editor__table',

    /**
     * Applied to each version (item) in the version selector.
     */
    'version': 'mh-version-editor__version',

    /**
     * Applied to the version (item) currently selected.
     */
    'versionSelected': 'mh-version-editor__version--selected',

    /**
     * Applied to the version selector.
     */
    'versions': 'mh-version-editor__versions',

    /**
     * Applied to the version selector when open.
     */
    'versionsOpen': 'mh-version-editor__versions--open'
}
