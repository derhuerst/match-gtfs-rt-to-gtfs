'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./normalize')

const gtfsInfo = {
	idNamespace: 'bench',
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsInfo
