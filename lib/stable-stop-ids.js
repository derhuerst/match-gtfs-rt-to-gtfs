import createGetStopIds from '@derhuerst/stable-public-transport-ids/stop.js'

const createGetStableStopIds = (gtfsOrGtfsRtInfo) => {
	return createGetStopIds(gtfsOrGtfsRtInfo.endpointName, gtfsOrGtfsRtInfo.normalizeStopName)
}

export {
	createGetStableStopIds,
}
