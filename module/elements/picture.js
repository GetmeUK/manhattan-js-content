
/**
 * A manage a picture element as a fixture.
 */
export class PictureElement extends ContentEdit.Element {

    constructor(attributes, src, sources) {
        super('picture', attributes)

        // The image source
        this._src = src

        // The source for the picture
        this._sources = []
        if (sources) {
            for (const source of sources) {
                this._sources.push(Object.assign(source))
            }
        }
    }

    cssTypeName() {
        return 'picture'
    }

    type() {
        return 'Picture'
    }

    typeName() {
        return 'Picture'
    }

    html(indent='') {
        const le = ContentEdit.LINE_ENDINGS

        const alt = `alt="${this._attributes['alt'] || ''}"`
        const attributes = this._attributesToString()
        const img = `${indent}<img src="${this.src()}" ${alt}>`

        const lines = []
        lines.push(`${indent}<${this.tagName()} ${attributes}>${le}`)
        for (const source of this._sources) {
            let mediaAttr = ''
            if (source.media) {
                mediaAttr = ` media="${source.media}"`
            }

            lines.push(`${indent}${ContentEdit.INDENT}`
                + `<source srcset="${source.srcset}"`
                + `{mediaAttr}>${le}`)
        }
        lines.push(`${ContentEdit.INDENT}${img}${le}`)
        lines.push(`${indent}</${this.tagName()}>`)

        lines.join('')
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
            sourceElm.setAttr('srcset', source.srcset)
            if (source.media) {
                sourceElm.setAttr('media', source.media)
            }
        }

        // Image
        const imgElm = document.createElement('img')
        imgElm.src = this.src()
        this._domElement.appendChild(imgElm)

        super.mount()
    }

    sources(sources) {
        let source = null

        if (typeof sources === 'undefined') {
            const cloned = []
            for (source of this._sources) {
                cloned.push(Object.assign(source))
            }
            return cloned
        }

        this._sources = []
        for (source of this._sources) {
            this._sources.push(Object.assign(source))
        }

        if (this.isMounted()) {
            this.unmount()
            this.mount()
        }

        this.taint()

        return null
    }

    src(src) {
        if (typeof src === 'undefined') {
            return this._src
        }

        this._src = src

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
        let attributes = PictureElement.getDOMElementAttributes(domElement)

        let src = ''
        let alt = ''
        const sources = []
        for (const childNode of [...domElement.childNodes]) {
            if (childNode.nodeType !== 1) {
                if (childNode.tagName.toLowerCase() === 'img') {
                    src = childNode.getAttribute('src') || ''
                    alt = childNode.getAttribute('alt') || ''

                } else if (childNode.tagName.toLowerCase() === 'source') {
                    let source = {'srcset': childNode.getAttribute('srcset')}
                    if (childNode.getAttribute('media')) {
                        source['media'] = childNode.getAttribute('media')
                    }
                    sources.push(source)
                }
            }
        }

        attributes = PictureElement.getDOMElementAttributes(domElement)
        attributes['alt'] = alt

        return new PictureElement(attributes, src, sources)
    }
}

PictureElement.droppers = {
    'Image': ContentEdit.Element._dropVert,
    'PreText': ContentEdit.Element._dropVert,
    'Static': ContentEdit.Element._dropVert,
    'Text': ContentEdit.Element._dropVert
}

