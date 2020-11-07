'use strict'

const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')

const createGetStableStopIds = (gtfsRtInfo, gtfsInfo) => {
	return createGetStopIds(gtfsInfo.endpointName, gtfsInfo.normalizeStopName)
}

module.exports = createGetStableStopIds
