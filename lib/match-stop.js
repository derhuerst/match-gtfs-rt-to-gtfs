'use strict'

const mergeStop = require('find-hafas-data-in-another-hafas/lib/merge-stop')
const createFindStop = require('./find-stop')

const createMatchStop = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findStop = createFindStop(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findStop(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const merged = mergeStop(gtfsRtInfo.endpointName, fromGtfsRt, gtfsInfo.endpointName, fromGtfs)
	return {
		...merged,

		// Currently, find-hafas-data-in-another-hafas/merge-* does not support
		// specifying the precedence, so we have to override it here.
		// see find-hafas-data-in-another-hafas#2
		id: fromGtfs.id,
		station: merged.station ? {
			...merged.station,
			id: fromGtfs.station.id,
		} : null,
	}
}

module.exports = createMatchStop
