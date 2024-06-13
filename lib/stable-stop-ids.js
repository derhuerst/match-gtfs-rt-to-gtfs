'use strict'

const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')

const createGetStableStopIds = (gtfsOrGtfsRtInfo) => {
	// todo [breaking]: make .idNamespace mandatory
	const idNamespace = gtfsOrGtfsRtInfo.idNamespace || gtfsOrGtfsRtInfo.endpointName
	return createGetStopIds(idNamespace, gtfsOrGtfsRtInfo.normalizeStopName)
}

module.exports = createGetStableStopIds
