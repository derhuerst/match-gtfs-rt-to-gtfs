'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-trip')
const stopoverToArrDep = require('./stopover-to-arr-dep')
const createFindArrDep = require('./find-arrival-departure')
const createMatchStop = require('./match-stop')
const withCaching = require('./caching')

const createFindTrip = (gtfsRtInfo, gtfsInfo) => async (t) => {
	debug(t)
	if (!Array.isArray(t.stopovers) || t.stopovers.length === 0) return null;

	debug('finding first & last stopover')
	const firstDep = stopoverToArrDep('departure', t.stopovers[0], t)
	const lastArr = stopoverToArrDep('arrival', t.stopovers[t.stopovers.length - 1], t)
	const findDep = createFindArrDep(gtfsRtInfo, gtfsInfo, 'departure')
	const findArr = createFindArrDep(gtfsRtInfo, gtfsInfo, 'arrival')
	const [
		gtfsFirstDep,
		gtfsLastArr,
	] = await Promise.all([
		findDep(firstDep),
		findArr(lastArr),
	])
	if (!gtfsFirstDep) {
		debug(`couldn't find first departure`, firstDep)
		return null;
	}
	if (!gtfsLastArr) {
		debug(`couldn't find last arrival`, lastArr)
		return null;
	}

	debug('matching all stopovers')
	const matchStop = createMatchStop(gtfsRtInfo, gtfsInfo)
	const gtfsStopovers = await Promise.all(t.stopovers.map(async (st) => {
		return {
			...st,
			stop: await matchStop(st.stop),
		}
	}))
	debug('done matching!')

	return {
		...t,

		id: gtfsFirstDep.tripId,
		routeId: gtfsFirstDep.routeId,
		direction: gtfsFirstDep.direction,
		line: gtfsFirstDep.line,

		origin: gtfsFirstDep.stop,
		plannedDeparture: gtfsFirstDep.plannedWhen,
		plannedDeparturePlatform: gtfsFirstDep.plannedPlatform,
		destination: gtfsLastArr.stop,
		plannedArrival: gtfsLastArr.plannedWhen,
		plannedArrivalPlatform: gtfsLastArr. plannedPlatform,

		stopovers: gtfsStopovers,
	}
}

const createCachedFindTrip = (gtfsRtInfo, gtfsInfo) => {
	return withCaching(
		createFindTrip(gtfsRtInfo, gtfsInfo),
		_ => 't:' + _.id,
	)
}

module.exports = createCachedFindTrip
