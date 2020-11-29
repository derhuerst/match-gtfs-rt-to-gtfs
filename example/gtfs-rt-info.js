'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./util')

const gtfsRtInfo = {
	endpointName: 'hvv-hafas',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsRtInfo
