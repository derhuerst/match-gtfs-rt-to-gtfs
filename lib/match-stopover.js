import createDebug from 'debug'
import {stopoverToArrDep} from './stopover-to-arr-dep.js'
import {
	createMatchDeparture, createMatchArrival,
} from './match-arrival-departure.js'
import {withMatchedFlag} from './matched.js'
import {copyCachedFlag} from './caching.js'

const debug = createDebug('match-gtfs-rt-to-gtfs:match-stopover')

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

export {
	createMatchStopover,
}
