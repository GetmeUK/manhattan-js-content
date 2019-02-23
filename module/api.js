import * as contentflow from 'content-flow'
import * as $ from 'manhattan-essentials'


export class FlowAPI extends contentflow.BaseAPI {

    constructor(baseURL='/', baseParams={}, updateSignalKey=null) {
        super(baseURL, baseParams)

        this._updateSignalKey = updateSignalKey
    }

    _callEndpoint(method, endpoint, params={}) {
        const response = super._callEndpoint(method, endpoint, params)

        // Signal that a content update may have occurred
        if (method.toLowerCase() !== 'get') {
            $.dispatch(
                window,
                'contentupdatesignalled',
                {'key': this._updateSignalKey}
            )
        }

        return response
    }

}
