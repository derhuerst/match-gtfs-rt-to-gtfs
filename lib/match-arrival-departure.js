import _merge from 'find-hafas-data-in-another-hafas/merge-arr-dep.js'
const {
	createMergeDeparture,
	createMergeArrival,
} = _merge
import {createFindArrDep} from './find-arrival-departure.js'
import {withMatchedFlag} from './matched.js'
import {copyCachedFlag} from './caching.js'

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

export {
	createMatchDeparture,
	createMatchArrival,
}
