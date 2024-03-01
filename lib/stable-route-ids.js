'use strict'

const createGetLineIds = require('@derhuerst/stable-public-transport-ids/line')

const createGetStableRouteIds = (gtfsOrGtfsRtInfo) => {
	return createGetLineIds(gtfsOrGtfsRtInfo.endpointName, gtfsOrGtfsRtInfo.normalizeLineName)
}

module.exports = createGetStableRouteIds
