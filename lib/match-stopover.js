'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:match-stopover')
const createFindArrDep = require('./find-trip')
const stopoverToArrDep = require('./stopover-to-arr-dep')
const {
	createMatchDeparture, createMatchArrival,
} = require('./match-arrival-departure')
const {withMatchedFlag} = require('./matched')
const {copyCachedFlag} = require('./caching')

const arrDepToStopover = (type, arrDep) => {
	const typeU = type[0].toUpperCase() + type.slice(1)
	return {
		[type]: arrDep.when,
		['planned' + typeU]: arrDep.plannedWhen,
		[type + 'Platform']: arrDep.platform,
		['planned' + typeU + 'Platform']: arrDep.plannedPlatform,

		stop: arrDep.stop,
	}
}

const createMatchStopover = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt, tripFromGtfsRt) => {
	debug(fromGtfsRt, 'trip', tripFromGtfsRt)

	const arrFromGtfsRt = stopoverToArrDep('arrival', fromGtfsRt, tripFromGtfsRt)
	const depFromGtfsRt = stopoverToArrDep('departure', fromGtfsRt, tripFromGtfsRt)

	const matchDep = createMatchDeparture(gtfsRtInfo, gtfsInfo)
	const matchArr = createMatchArrival(gtfsRtInfo, gtfsInfo)
	const [arrFromGtfs, depFromGtfs] = await Promise.all([
		matchArr(arrFromGtfsRt),
		matchDep(depFromGtfsRt),
	])
	debug('arrFromGtfs', arrFromGtfs)
	debug('depFromGtfs', depFromGtfs)
	if (!arrFromGtfs || !depFromGtfs) return fromGtfsRt

	// todo: what about fields that are in fromGtfsRt, but get dropped by
	// stopoverToArrDep/findArr/findDep?
	return copyCachedFlag(arrFromGtfs, withMatchedFlag({ // todo: depFromGtfs
		...fromGtfsRt,
		// todo: what if they have `delay: undefined` & fromGtfsRt has `delay: 0`?
		...arrDepToStopover('arrival', arrFromGtfs),
		...arrDepToStopover('departure', depFromGtfs),

		// routeId: arrFromGtfs.routeId,
		// tripId: arrFromGtfs.tripId,
		// tripIds: arrFromGtfs.tripIds,
	}))
}

module.exports = createMatchStopover
