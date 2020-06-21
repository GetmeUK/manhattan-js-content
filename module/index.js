import * as contenttools from 'ContentTools'
import * as contentflow from 'content-flow'
import * as $ from 'manhattan-essentials'

import {FlowAPI} from './api'
import {PictureElement} from './elements/picture.js'
import {ImageTool} from './tools/imagery.js'
import {RemoveTool} from './tools/remove.js'
import {Lock} from './utils/locks.js'


// -- Utils --

/**
 * Define a process for saving content (e.g flow or global region content).
 */
function defineSaveProcess(url, params, lock, contentFunc) {

    function _process(event) {

        const editor = contenttools.EditorApp.get()
        const {regions} = event.detail()

        // Check that there are changes to save
        if (Object.keys(regions).length === 0) {
            return
        }

        // Build the contents we'll be saving
        const contents = contentFunc(regions)

        // Check there's content to save
        if (Object.keys(contents).length === 0) {
            return
        }

        // Flag the editor as busy
        lock.inc()
        editor.busy(true)

        // Make the request to save the content

        const formData = new FormData()
        for (let k of Object.keys(params)) {
            formData.append(k, params[k])
        }
        formData.append('contents', JSON.stringify(contents))

        fetch(
            url,
            {
                'body': formData,
                'credentials': 'include',
                'method': 'POST'
            }
        )
            .then((response) => {
                // Update the busy status of the editor
                lock.dec()
                editor.busy(lock.locked)

                // Flag that the save succeeded/failed
                let flash = null
                if (response.status === 200) {
                    flash = new ContentTools.FlashUI('ok')
                } else {
                    flash = new ContentTools.FlashUI('no')
                }
            })
            .catch(() => {
                // Update the busy status of the editor
                lock.dec()
                editor.busy(lock.locked)

                // Flag that the save failed
                const flash = new ContentTools.FlashUI('no')
            })

    }

    return _process
}


// -- Initializer --

export function init(
    baseURL='/',
    baseFlowURL='/',
    baseParams={},
    updateSignalKey=null
) {
    // Register additional elements
    ContentEdit.TagNames.get().register(PictureElement, 'picture')

    // Set-up the editor and flow manager
    const editor = contenttools.EditorApp.get()
    const flowMgr = contentflow.FlowMgr.get()

    // Set up a lock to manage simultaneous save requests
    const lock = new Lock()

    // Restrict special attributes
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-ce-tag')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-fixture')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-asset-key')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-draft')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-crop-ratio')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-fix-crop-ratio')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-base-transforms')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-local-transforms')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-proxy')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-transform-proxied')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-transforms')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-name')

    // Apply common modifications
    ContentTools.Tools.Heading.tagName = 'h2'
    ContentTools.Tools.Subheading.tagName = 'h3'

    // Manhattan specific behaviour

    // Tooling
    const tools = [
        [
            'bold',
            'italic',
            'link',
            'align-left',
            'align-center',
            'align-right'
        ], [
            'heading',
            'subheading',
            'paragraph',
            'unordered-list',
            'ordered-list',
            'table',
            'indent',
            'unindent',
            'line-break'
        ], [
            'manhattan-image',
            'video',
            'preformatted'
        ], [
            'undo',
            'redo',
            'manhattan-remove'
        ]
    ]
    ContentTools.DEFAULT_TOOLS = tools

    // Flag relevant elements when the editor is in user
    editor.addEventListener(
        'start',
        () => {
            for (let elm of $.many('[data-disable-when-editing]')) {
                elm.classList.add('ct-editing')
            }
        }
    )

    editor.addEventListener(
        'stop',
        () => {
            for (let elm of $.many('[data-disable-when-editing]')) {
                elm.classList.remove('ct-editing')
            }
        }
    )

    // Initialize the page content editor
    editor.init(
        '[data-allow-edits] [data-editable], [data-allow-edits] [data-fixture]',
        'data-name'
    )

    // Initialize the page flow manager
    if ($.one('[data-cf-flow]')) {
        flowMgr.init(
            '[data-cf-flow]',
            new FlowAPI(
                baseFlowURL,
                baseParams,
                updateSignalKey
            )
        )
    } else {
        // Flag that the page has no data flows
        document.body.dataset.mhNoDataFlows = ''
    }

    // Create an element in which manhattan specific UI elements should be
    // rooted.
    document.body.appendChild($.create('div', {'data-mh-content-ui': ''}))

    // Configure save behaviour for flows and global content

    // Flows
    editor.addEventListener(
        'saved',
        defineSaveProcess(
            `${baseFlowURL}update-flow-contents`,
            baseParams,
            lock,
            (regions) => {
                const contents = {}

                for (let k of Object.keys(regions)) {
                    let v = regions[k]

                    // Check the region belongs to a snippet
                    if(k.startsWith('snippet:')) {

                        // Extract the snippet Id and region name
                        const [_, snippetId, regionName] = k.split(':')

                        // Add the region's content to the snippet
                        if(!contents[snippetId]) {
                            contents[snippetId] = {}
                        }
                        contents[snippetId][regionName] = v
                    }
                }

                return contents
            }
        )
    )

    // Global regions
    editor.addEventListener(
        'saved',
        defineSaveProcess(
            `${baseURL}update-global-contents`,
            baseParams,
            lock,
            (regions) => {
                const contents = {}

                for (let k of Object.keys(regions)) {
                    let v = regions[k]

                    // Check the region belongs to a snippet
                    if(k.startsWith('global:')) {

                        // Extract the snippet Id and region name
                        const [_, regionName] = k.split(':')

                        // Add the region's content to the snippet
                        contents[regionName] = v
                    }
                }

                return contents
            }
        )
    )

    if (updateSignalKey) {

        // Set up content update signalling for related tabs
        editor.addEventListener(
            'saved',
            () => {
                $.dispatch(
                    window,
                    'contentupdatesignalled',
                    {'key': updateSignalKey}
                )
            }
        )

        $.listen(
            window,
            {
                'contentupdatesignalled': (event) => {
                    // Signal a contentchange to any other tabs listening
                    localStorage.setItem(event.key, Date.now())
                }
            }
        )
    }

}
