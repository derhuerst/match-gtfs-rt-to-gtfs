'use strict'

const {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} = require('./normalize')

const gtfsRtInfo = {
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

module.exports = gtfsRtInfo
