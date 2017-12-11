$ = require 'manhattan-essentials'
ContentTools = require 'ContentTools'
ContentFlow = require 'content-flow'
FlowAPI = require('./api.coffee').FlowAPI
ImageUploader = require('./image-uploader.coffee').ImageUploader


class SaveSemaphore
    # Simple semaphore to manage the busy state of the editor when saving
    # changes.

    @_saving = 0

    @dec: () ->
        # Decrement the semaphore count
        @_saving = Math.max(0, @_saving - 1)

    @inc: () ->
        # Increment the semaphore count
        @_saving += 1

    @saving: () ->
        # Return true if the editor is still saving
        return @_saving > 0


addSaveProcess = (url, params, buildContentsFunc) ->
    # Set up a save process based on the content built using the given
    # function.
    editor = ContentTools.EditorApp.get()

    editor.addEventListener 'saved', (ev) ->

        # If nothing has changed exit early
        regions = ev.detail().regions
        unless Object.keys(regions).length > 0
            return

        # Build the contents object we'll be saving
        contents = buildContentsFunc(regions)

        # If we have no content changes to save exit early
        unless Object.keys(contents).length > 0
            return

        # Mark the editor as busy while we save the page
        SaveSemaphore.inc()
        editor.busy(true)

        # Create a save request
        xhr = new XMLHttpRequest()
        xhr.open('POST', url)

        # Add the form data for the save request
        formData = new FormData()
        for k, v of (params or {})
            formData.append(k, v)
        formData.append('contents', JSON.stringify(contents))
        xhr.send(formData)

        # Handle the save request response
        xhr.addEventListener 'load', (ev) ->

            # Check if were still saving changes and if not mark the editor as
            # no longer busy.
            SaveSemaphore.dec()
            unless SaveSemaphore.saving()
                editor.busy(false)

            # Handle the result of the save request
            if parseInt(ev.target.status) is 200
                new ContentTools.FlashUI('ok')
            else
                new ContentTools.FlashUI('no')


init = (baseURL='/', baseFlowURL='/', baseParams={}) ->

    # Set-up the editor and flow manager
    editor = ContentTools.EditorApp.get()
    flowMgr = ContentFlow.FlowMgr.get()

    # Use minimal whitespace in the HTML output as it's easier to deal with
    ContentEdit.INDENT = ''
    ContentEdit.LINE_ENDINGS = ''

    # Restrict special attributes
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-ce-tag')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-fixture')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-transforms')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-mh-asset-key')
    ContentTools.RESTRICTED_ATTRIBUTES['*'].push('data-name')

    # Assign an image uploader for the editor
    ContentTools.IMAGE_UPLOADER = (dialog) ->
        return new ImageUploader(dialog, baseParams)

    # Initialize the editor
    editor.init(
        '[data-allow-edits] [data-editable], [data-allow-edits] [data-fixture]',
        'data-name'
    )

    # Initialize the content flow manager
    api = new FlowAPI(baseFlowURL, baseParams)
    flowMgr.init('[data-cf-flow]', api)

    # Setup save processes for flows and global content

    # Flows
    updateFlowsURL = baseFlowURL + 'update-flow-contents'
    addSaveProcess updateFlowsURL, baseParams, (regions) ->
        contents = {}

        for k, v of regions
            # Check the region belongs to a snippet
            unless k.startsWith('snippet:')
                continue

            # Extract the snippet Id and region name
            [_, snippetId, region_name] = k.split(':')

            # Add the region's content to the snippet
            unless contents[snippetId]
                contents[snippetId] = {}
            contents[snippetId][region_name] = v

        return contents

    # Global
    updateGlobalURL = baseURL + 'update-global-contents'
    addSaveProcess updateGlobalURL, baseParams, (regions) ->
        contents = {}

        for k, v of regions
            # Check the region is global
            unless k.startsWith('global:')
                continue

            # Extract the region name
            [_, region_name] = k.split(':')
            contents[region_name] = v

        return contents


module.exports = {
    # Standard init
    init: init,

    # Provide access to other standard set up classes/functions
    addSaveProcess: addSaveProcess,
    FlowAPI: FlowAPI,
    ImageUploader: ImageUploader,
    SaveSemaphore: SaveSemaphore
    }