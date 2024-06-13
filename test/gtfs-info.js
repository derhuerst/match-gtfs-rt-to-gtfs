'use strict'

const {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} = require('./normalize')

const gtfsInfo = {
	idNamespace: 'tEst',
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

module.exports = gtfsInfo
