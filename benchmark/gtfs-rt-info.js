'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./normalize')

const gtfsRtInfo = {
	idNamespace: 'bench',
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsRtInfo
