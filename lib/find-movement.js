'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-movement')
const findArrDep = require('./find-arrival-departure')
const matchStop = require('./match-stop')
const withCaching = require('./caching')

const findMovement = async (m) => {
	debug(m)
	if (!Array.isArray(m.nextStopovers) || m.nextStopovers.length === 0) return null

	debug('finding first departure')
	const st0 = m.nextStopovers[0]
	const dep0 = {
		...st0,
		tripId: m.tripId,
		direction: m.direction,
		line: m.line,
		when: st0.departure,
		plannedWhen: st0.plannedDeparture,
		platform: st0.departurePlatform,
		plannedPlatform: st0.plannedDeparturePlatform,
	}
	const gtfsDep0 = await findArrDep('departure', dep0)
	if (!gtfsDep0) {
		debug(`couldn't find 0th departure`, dep0)
		return null
	}

	debug('matching all stopovers')
	const matchedStopovers = await Promise.all(m.nextStopovers.map(async (st) => {
		return {
			...st,
			stop: await matchStop(st.stop),
		}
	}))
	debug('done matching!')

	return {
		...m,

		tripId: gtfsDep0.tripId,
		routeId: gtfsDep0.routeId,
		direction: gtfsDep0.direction,
		line: gtfsDep0.line,

		nextStopovers: matchedStopovers,
	}
}

const cachedFindMovement = withCaching(findMovement, _ => 'm:' + _.tripId)

module.exports = cachedFindMovement
