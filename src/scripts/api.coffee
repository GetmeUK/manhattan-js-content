ContentFlow = require 'content-flow'


class FlowAPI extends ContentFlow.BaseAPI

    # The standard API for manhattan / content flow

    constructor: (baseUrl='/', baseParams={}) ->
        super(baseUrl, baseParams)


module.exports = {FlowAPI: FlowAPI}