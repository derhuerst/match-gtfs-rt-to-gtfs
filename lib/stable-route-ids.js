import {
	createGetStableLineIds as createGetLineIds,
} from '@derhuerst/stable-public-transport-ids/line.js'

const createGetStableRouteIds = (gtfsOrGtfsRtInfo) => {
	// todo [breaking]: make .idNamespace mandatory
	const idNamespace = gtfsOrGtfsRtInfo.idNamespace || gtfsOrGtfsRtInfo.endpointName
	return createGetLineIds(idNamespace, gtfsOrGtfsRtInfo.normalizeLineName)
}

export {
	createGetStableRouteIds
}
