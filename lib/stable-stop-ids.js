import {
	createGetStableStopIds as createGetStopIds,
} from '@derhuerst/stable-public-transport-ids/stop.js'

const createGetStableStopIds = (gtfsOrGtfsRtInfo) => {
	// todo [breaking]: make .idNamespace mandatory
	const idNamespace = gtfsOrGtfsRtInfo.idNamespace || gtfsOrGtfsRtInfo.endpointName
	return createGetStopIds(idNamespace, gtfsOrGtfsRtInfo.normalizeStopName)
}

export {
	createGetStableStopIds,
}
