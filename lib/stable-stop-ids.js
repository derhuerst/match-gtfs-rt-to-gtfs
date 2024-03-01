'use strict'

const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')

const createGetStableStopIds = (gtfsOrGtfsRtInfo) => {
	return createGetStopIds(gtfsOrGtfsRtInfo.endpointName, gtfsOrGtfsRtInfo.normalizeStopName)
}

module.exports = createGetStableStopIds
