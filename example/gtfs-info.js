'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./util')

const gtfsInfo = {
	idNamespace: 'hvv',
	endpointName: 'hvv',
	normalizeStopName,
	normalizeLineName,
}

module.exports = gtfsInfo
