'use strict'

const createMergeStop = require('find-hafas-data-in-another-hafas/merge-stop')
const createFindStop = require('./find-stop')

const createMatchStop = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findStop = createFindStop(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findStop(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const mergeStop = createMergeStop(gtfsRtInfo, gtfsInfo, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	return mergeStop(fromGtfsRt, fromGtfs)
}

module.exports = createMatchStop
