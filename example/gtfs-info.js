'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./util')

const gtfsInfo = {
	endpointName: 'hvv',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsInfo
