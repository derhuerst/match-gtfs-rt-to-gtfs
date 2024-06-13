'use strict'

const {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} = require('./normalize')

const gtfsRtInfo = {
	idNamespace: 'tEst',
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

module.exports = gtfsRtInfo
