'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-trip')
const findArrDep = require('./find-arrival-departure')
const matchStop = require('./match-stop')
const withCaching = require('./caching')

const stopoverToArrDep = (type, st, t) => {
	const typeU = type[0].toUpperCase() + type.slice(1)
	return {
		tripId: t.id,
		direction: t.direction,
		line: t.line,

		when: st[type],
		plannedWhen: st['planned' + typeU],
		platform: st[type + 'Platform'],
		plannedPlatform: st['planned' + typeU + 'Platform'],

		stop: st.stop,
	}
}

const findTrip = async (t) => {
	debug(t)
	if (!Array.isArray(t.stopovers) || t.stopovers.length === 0) return null;

	debug('finding first & last stopover')
	const firstDep = stopoverToArrDep('departure', t.stopovers[0], t)
	const lastArr = stopoverToArrDep('arrival', t.stopovers[t.stopovers.length - 1], t)
	const [
		gtfsFirstDep,
		gtfsLastArr,
	] = await Promise.all([
		findArrDep('departure', firstDep),
		findArrDep('arrival', lastArr),
	])
	if (!gtfsFirstDep) {
		debug(`couldn't find 0th departure`, firstDep)
		return null;
	}
	if (!gtfsLastArr) {
		debug(`couldn't find 1st arrival`, lastArr)
		return null;
	}

	debug('matching all stopovers')
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

const cachedFindTrip = withCaching(findTrip, _ => _.id)

module.exports = cachedFindTrip
