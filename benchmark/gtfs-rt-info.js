'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./normalize')

const gtfsRtInfo = {
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsRtInfo
