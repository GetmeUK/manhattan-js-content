ContentTools = require 'ContentTools'


class ImageUploader
    # An image uploader class for manhattan

    constructor: (dialog, baseParams={}) ->
        # A reference to the UI dialog being used to upload an image
        @dialog = dialog

        # A table of params to include when uploading or transforming images
        @baseParams = baseParams

        # Check if the image upload is for an image fixture and if so extract
        # any transform stack.
        @postTransforms = []
        @element = ContentEdit.Root.get().focused()
        if @element.type() is 'ImageFixture'
            @postTransforms = JSON.parse(
                @element.domElement().getAttribute('data-transforms') or '[]'
            )

        # Listen to and map events from the dialog to handlers
        dialog.addEventListener 'imageuploader.cancelupload', () =>
            @onCancelUpload()

        dialog.addEventListener 'imageuploader.clear', () =>
            @onClear()

        dialog.addEventListener 'imageuploader.clear', () =>
            @onClear()

        dialog.addEventListener 'imageuploader.fileready', (ev) =>
            if ev.detail().file
                @onFileReady(ev.detail().file)

        dialog.addEventListener 'imageuploader.rotateccw', (ev) =>
            @onRotate(-90)

        dialog.addEventListener 'imageuploader.rotatecw', (ev) =>
            @onRotate(90)

        dialog.addEventListener 'imageuploader.save', () =>
            @onSave()

    # Methods

    getTransformURL: () ->
        # Return the transform URL
        return '/manage/transform-asset'

    getUploadURL: () ->
        # Return the upload URL
        return '/manage/upload-asset'

    transform: (transforms, callback) ->
        # Transform the image

        # Build the form data to transform the image
        formData = new FormData()
        for k, v of @baseParams
            formData.append(k, v)
        formData.append('key', @image.key)
        formData.append('transforms', JSON.stringify(transforms))

        # Build a request to send the file
        xhr = new XMLHttpRequest()
        xhr.open('POST', @getTransformURL(), true)

        xhr.addEventListener 'load', (ev) =>
            if parseInt(ev.target.status) is 200
                # Handle successful upload

                # Unpack the repsonse
                response = JSON.parse(ev.target.responseText)

                # Trigger the callback
                callback(response.payload.asset)

            else
                # Handle failed upload
                new ContentTools.FlashUI('no')

            # Clear the XHR
            @xhr = null

        # Transform the image
        xhr.send(formData)

    # Dialog event handlers

    onCancelUpload: () ->
        # Handle a request to cancel an upload

        # Stop any current upload
        if @xhr
            @xhr.upload.removeEventListener('progress', @xhrProgress)
            @xhr.upload.removeEventListener('load', @xhrComplete)
            @xhr.abort()

        # Set the dialog to empty
        @dialog.state('empty')

    onClear: () ->
        # Handle a request to clear the image
        @dialog.clear()
        @image = null

    onFileReady: (file) ->
        # Handle a request to upload a file

        # Set the dialog state to uploading
        @dialog.progress(0)
        @dialog.state('uploading')

        # Build the form data to upload the image
        formData = new FormData()
        for k, v of @baseParams
            formData.append(k, v)
        formData.append('file', file)

        # Build a request to send the file
        @xhr = new XMLHttpRequest()
        @xhr.open('POST', @getUploadURL(), true)

        # Add handlers for progress and load

        @xhrProgress = (ev) =>
            # Update the progress bar
            @dialog.progress((ev.loaded / ev.total) * 100)

        @xhr.upload.addEventListener('progress', @xhrProgress)

        @xhrComplete = (ev) =>
            if parseInt(ev.target.status) is 200
                # Handle successful upload

                # Unpack the repsonse
                response = JSON.parse(ev.target.responseText)
                asset = response.payload.asset

                # Make sure an image was uploaded
                if asset['type']

                    # Build the image from the resposne
                    @image = {
                        angle: 0,
                        height: asset['core_meta']['image']['size'][1],
                        key: asset['key'],
                        maxWidth: asset['core_meta']['image']['size'][0],
                        url: asset['variations']['--draft--']['url'],
                        width: asset['core_meta']['image']['size'][0]
                    }

                    # Update the dialog to display the new image
                    @dialog.populate(@image.url, [@image.width, @image.height])

                else
                    # Handle upload of non-image
                    new ContentTools.FlashUI('no')

            else
                # Handle failed upload
                new ContentTools.FlashUI('no')

            # Clear the XHR
            @xhr = null

        @xhr.addEventListener('load', @xhrComplete)

        # Upload the file
        @xhr.send(formData)

    onRotate: (angle) ->
        # Handle a request to rotate the image

        # Update the angle of the image
        @image.angle += angle

        # Stay within 360 degress
        if @image.angle < 0
            @image.angle += 360
        else if @image.angle > 270
            @image.angle -= 360

        # Build the transform
        transforms = [
            {'id': 'image.rotate', 'settings': {'angle': @image.angle}}
        ]

        # Perfom the transform
        @transform transforms, (asset) =>
            # Update the image from the resposne
            @image.url = asset['variations']['--draft--']['url']

            # Flip the image width/height based on the angle
            if @image.angle is 90 or @image.angle = 270
                @image.height = asset['core_meta']['image']['size'][0]
                @image.maxWidth = asset['core_meta']['image']['size'][1]
                @image.width = width = asset['core_meta']['image']['size'][1]
            else
                @image.height = asset['core_meta']['image']['size'][1]
                @image.maxWidth = asset['core_meta']['image']['size'][0]
                @image.width = width = asset['core_meta']['image']['size'][0]

            # Update the dialog to display the new image
            @dialog.populate(@image.url, [@image.width, @image.height])

    onSave: () ->
        # Handle a request to save the image

        # Build the transforms for the final image
        transforms = []

        # Angle
        unless @image.angle is 0
            transforms.push({
                'id': 'image.rotate',
                'settings': {'angle': @image.angle}
            })

        # Crop
        region = @dialog.cropRegion()
        maxWidth = @image.maxWidth
        unless region.toString() is [0, 0, 1, 1].toString()
            transforms.push({
                'id': 'image.crop',
                'settings': {
                    'top': Math.max(0, region[0]),
                    'left': Math.max(0, region[1]),
                    'bottom': Math.min(1, region[2]),
                    'right': Math.min(1, region[3])
                }
            })
            maxWidth = parseInt(maxWidth * (region[3] - region[1]))

        # Apply any post transforms
        transforms = transforms.concat(@postTransforms)

        # Perform the transform
        @transform transforms, (asset) =>
            # Insert the image into the page
            draft = asset['variations']['--draft--']
            @dialog.save(
                draft['url'],
                [
                    draft['core_meta']['image']['size'][0],
                    draft['core_meta']['image']['size'][1]
                ],
                {
                    'alt': '',
                    'data-ce-max-width': maxWidth,
                    'data-mh-asset-key': asset['key']
                }
            )

            # For image fixtures the attributes must be set independently
            if @element.type() is 'ImageFixture'
                @element.attr('data-mh-asset-key', asset['key'])
                unless @element.attr('alt')
                    @element.attr('alt', '')


module.exports = {ImageUploader: ImageUploader}