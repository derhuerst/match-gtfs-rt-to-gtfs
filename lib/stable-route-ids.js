'use strict'

const createGetLineIds = require('@derhuerst/stable-public-transport-ids/line')

const createGetStableRouteIds = (gtfsOrGtfsRtInfo) => {
	// todo [breaking]: make .idNamespace mandatory
	const idNamespace = gtfsOrGtfsRtInfo.idNamespace || gtfsOrGtfsRtInfo.endpointName
	return createGetLineIds(idNamespace, gtfsOrGtfsRtInfo.normalizeLineName)
}

module.exports = createGetStableRouteIds
