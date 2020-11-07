'use strict'

const {
	createMergeDeparture,
	createMergeArrival,
} = require('find-hafas-data-in-another-hafas/merge-arr-dep')
const createFindArrDep = require('./find-arrival-departure')

const createMatchArrDep = (find, merge) => async (fromGtfsRt) => {
	const fromGtfs = await find(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const merged = merge(fromGtfsRt, fromGtfs)
	return {
		...merged,

		tripId: fromGtfs.tripId,
		routeId: fromGtfs.routeId,
		line: {
			...merged.line,
			id: fromGtfs.line.id,
		},

		// Currently, find-hafas-data-in-another-hafas/merge-* does not support
		// specifying the precedence, so we have to override it here.
		// see find-hafas-data-in-another-hafas#2
		stop: {
			...merged.stop,
			id: fromGtfs.stop.id,
			station: merged.stop.station && fromGtfs.stop.station ? {
				...merged.stop.station,
				id: fromGtfs.stop.station.id,
			} : null,
		},
	}
}

const createMatchDeparture = (gtfsRtInfo, gtfsInfo) => {
	const findDep = createFindArrDep(gtfsRtInfo, gtfsInfo, 'departure')
	const mergeDep = createMergeDeparture(gtfsRtInfo, gtfsInfo)
	return createMatchArrDep(findDep, mergeDep)
}

const createMatchArrival = (gtfsRtInfo, gtfsInfo) => {
	const findArr = createFindArrDep(gtfsRtInfo, gtfsInfo, 'arrival')
	const mergeArr = createMergeArrival(gtfsRtInfo, gtfsInfo)
	return createMatchArrDep(findArr, mergeArr)
}

module.exports = {
	createMatchDeparture,
	createMatchArrival,
}
