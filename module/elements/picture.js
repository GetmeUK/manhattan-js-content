
/**
 * A manage a picture element as a fixture.
 */
export class PictureElement extends ContentEdit.Element {

    constructor(attributes, src) {
        super('picture', attributes)

        // The image source
        this._src = src
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
        const alt = `alt="${this._attributes['alt'] || ''}"`
        const attributes = this._attributesToString()
        const img = `${indent}<img src="${this.src()}" ${alt}>`
        const le = ContentEdit.LINE_ENDINGS

        return [
            `${indent}<${this.tagName()} ${attributes}>${le}`,
            `${ContentEdit.INDENT}${img}${le}`,
            `${indent}</${this.tagName()}>`
        ].join('')
    }

    mount() {
        this._domElement = document.createElement(this.tagName())

        for (let [name, value] of Object.entries(this._attributes)) {
            if (name !== 'alt') {
                this._domElement.setAttribute(name, value)
            }
        }
        this._domElement.setAttribute('class', this._attributes['class'])

        const imgElm = document.createElement('img')
        imgElm.src = this.src()
        this._domElement.appendChild(imgElm)

        super.mount()
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
        for (const childNode of [...domElement.childNodes]) {
            if (childNode.nodeType === 1
                && childNode.tagName.toLowerCase() === 'img') {

                src = childNode.getAttribute('src') || ''
                alt = childNode.getAttribute('alt') || ''
                break
            }
        }

        attributes = PictureElement.getDOMElementAttributes(domElement)
        attributes['alt'] = alt

        return new PictureElement(attributes, src)
    }
}

PictureElement.droppers = {
    'Image': ContentEdit.Element._dropVert,
    'PreText': ContentEdit.Element._dropVert,
    'Static': ContentEdit.Element._dropVert,
    'Text': ContentEdit.Element._dropVert
}

