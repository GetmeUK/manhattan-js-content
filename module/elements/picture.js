
/**
 * A manage a picture element as a fixture.
 */
export class PictureFixture extends ContentEdit.Element {

    constructor(attributes, sources) {
        super('picture', attributes)

        // The source for the picture
        this._sources = []
        if (sources) {
            for (const source of sources) {
                this._sources.push(Object.assign({}, source))
            }
        }
    }

    cssTypeName() {
        return 'picture'
    }

    type() {
        return 'PictureFixture'
    }

    typeName() {
        return 'Picture'
    }

    html(indent='') {
        const le = ContentEdit.LINE_ENDINGS

        const lines = []

        const pictureAttributes = Object.assign({}, this._attributes)
        delete pictureAttributes['alt']
        const pictureAttributesString = ContentEdit
            .attributesToString(pictureAttributes)

        lines.push(`${indent}`
            + `<${this.tagName()} ${pictureAttributesString}>`)

        for (const source of this._sources) {
            const sourceAttributesString = ContentEdit
                .attributesToString(source)
            lines.push(`${indent}${ContentEdit.INDENT}`
                + `<source ${sourceAttributesString}>${le}`)
        }

        if (this._sources.length > 0) {
            lines[0] = `${lines[0]}${le}`

            const imageAttributes = {
                'src': this._sources[0].srcset,
                'alt': this._attributes['alt'] || ''
            }
            const imageAttributesString = ContentEdit
                .attributesToString(imageAttributes)

            lines.push(`${indent}${ContentEdit.INDENT}`
                + `<img ${imageAttributesString}>${le}`)

            lines.push(`${indent}</${this.tagName()}>`)
        } else {

            // Avoid spaces in the tag if the picture element is blank
            lines.push(`</${this.tagName()}>`)
        }

        return lines.join('')
    }

    mount() {

        // Picture
        this._domElement = document.createElement(this.tagName())

        for (let [name, value] of Object.entries(this._attributes)) {
            if (name !== 'alt') {
                this._domElement.setAttribute(name, value)
            }
        }
        this._domElement.setAttribute('class', this._attributes['class'])

        // Sources
        for (const source of this._sources) {
            const sourceElm = document.createElement('source')
            sourceElm.setAttribute('srcset', source.srcset)
            if (source.media) {
                sourceElm.setAttribute('media', source.media)
            }
            this._domElement.appendChild(sourceElm)
        }

        // Image
        if (this._sources.length > 0) {
            const imgElm = document.createElement('img')
            imgElm.src = this._sources[0].srcset
            this._domElement.appendChild(imgElm)
        }
        super.mount()
    }

    sources(sources) {
        let source = null

        if (typeof sources === 'undefined') {
            const cloned = []
            for (source of this._sources) {
                cloned.push(Object.assign({}, source))
            }
            return cloned
        }

        this._sources = []
        for (source of this._sources) {
            this._sources.push(Object.assign({}, source))
        }

        if (this.isMounted()) {
            this.unmount()
            this.mount()
        }

        this.taint()

        return null
    }

    unmount() {
        const wrapper = document.createElement('div')
        wrapper.innerHTML = this.html()
        const domElement = wrapper.firstElementChild

        this._domElement.parentNode.replaceChild(domElement, this._domElement)
        this._domElement = domElement
        this.parent()._domElement = this._domElement
    }

    static fromDOMElement(domElement) {
        const {tagName} = domElement
        let attributes = PictureFixture.getDOMElementAttributes(domElement)

        let src = ''
        let alt = ''
        const sources = []
        for (const childNode of [...domElement.childNodes]) {
            if (childNode.nodeType === 1) {
                if (childNode.tagName.toLowerCase() === 'source') {
                    let source = PictureFixture
                        .getDOMElementAttributes(childNode)
                    sources.push(source)
                }
            }
        }

        attributes = PictureFixture.getDOMElementAttributes(domElement)
        attributes['alt'] = alt

        return new PictureFixture(attributes, sources)
    }
}

PictureFixture.droppers = {
    'Image': ContentEdit.Element._dropVert,
    'PreText': ContentEdit.Element._dropVert,
    'Static': ContentEdit.Element._dropVert,
    'Text': ContentEdit.Element._dropVert
}

