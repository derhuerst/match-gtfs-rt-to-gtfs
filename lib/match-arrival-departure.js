'use strict'

const {
	createMergeDeparture,
	createMergeArrival,
} = require('find-hafas-data-in-another-hafas/merge-arr-dep')
const createFindArrDep = require('./find-arrival-departure')
const {withMatchedFlag} = require('./matched')
const {copyCachedFlag} = require('./caching')

const createMatchArrDep = (find, merge) => async (fromGtfsRt) => {
	const fromGtfs = await find(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const merged = merge(fromGtfsRt, fromGtfs)
	return copyCachedFlag(fromGtfs, withMatchedFlag({
		...merged,
		routeId: fromGtfs.routeId,
	}))
}

const createMatchDeparture = (gtfsRtInfo, gtfsInfo) => {
	const findDep = createFindArrDep(gtfsRtInfo, gtfsInfo, 'departure')
	const mergeDep = createMergeDeparture(gtfsRtInfo, gtfsInfo, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	return createMatchArrDep(findDep, mergeDep)
}

const createMatchArrival = (gtfsRtInfo, gtfsInfo) => {
	const findArr = createFindArrDep(gtfsRtInfo, gtfsInfo, 'arrival')
	const mergeArr = createMergeArrival(gtfsRtInfo, gtfsInfo, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	return createMatchArrDep(findArr, mergeArr)
}

module.exports = {
	createMatchDeparture,
	createMatchArrival,
}
