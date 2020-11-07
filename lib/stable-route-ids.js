'use strict'

const createGetLineIds = require('@derhuerst/stable-public-transport-ids/line')

const createGetStableRouteIds = (gtfsRtInfo, gtfsInfo) => {
	return createGetLineIds(gtfsInfo.endpointName, gtfsInfo.normalizeLineName)
}

module.exports = createGetStableRouteIds
