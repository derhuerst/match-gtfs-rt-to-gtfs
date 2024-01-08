'use strict'

const {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} = require('./normalize')

const gtfsInfo = {
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

module.exports = gtfsInfo
