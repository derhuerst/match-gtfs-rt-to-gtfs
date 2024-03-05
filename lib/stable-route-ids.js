import createGetLineIds from '@derhuerst/stable-public-transport-ids/line.js'

const createGetStableRouteIds = (gtfsOrGtfsRtInfo) => {
	return createGetLineIds(gtfsOrGtfsRtInfo.endpointName, gtfsOrGtfsRtInfo.normalizeLineName)
}

export {
	createGetStableRouteIds,
}
