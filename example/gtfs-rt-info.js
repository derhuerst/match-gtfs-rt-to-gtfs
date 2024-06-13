'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./util')

const gtfsRtInfo = {
	idNamespace: 'hvv',
	endpointName: 'hvv-hafas',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsRtInfo
