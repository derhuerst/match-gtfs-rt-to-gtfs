'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-movement')
const {DateTime, IANAZone} = require('luxon')
const createFindArrDep = require('./find-arrival-departure')
const createMatchStop = require('./match-stop')
const withCaching = require('./caching')
const db = require('./db')

const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindMovement = (gtfsRtInfo, gtfsInfo) => async (m) => {
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
	const findDep = await createFindArrDep(gtfsRtInfo, gtfsInfo, 'departure')
	const gtfsDep0 = await findDep(dep0)
	if (!gtfsDep0) {
		debug(`couldn't find 0th departure`, dep0)
		return null
	}

	debug('matching all stopovers')
	const matchStop = createMatchStop(gtfsRtInfo, gtfsInfo)
	const matchedStopovers = await Promise.all(m.nextStopovers.map(async (st) => {
		return {
			...st,
			stop: await matchStop(st.stop),
		}
	}))
	debug('done matching!')

	debug('looking up trip departure/arrival')
	const {rows: tripRows} = await db.query(`
		SELECT ad.*
		FROM (
			SELECT
				min(stop_sequence) as min_seq,
				max(stop_sequence) as max_seq
			FROM arrivals_departures
			WHERE trip_id = $1 AND date = $2
		) _
		JOIN arrivals_departures ad ON
			(ad.stop_sequence = _.min_seq OR ad.stop_sequence = _.max_seq)
			AND ad.trip_id = $1
			AND ad.date = $2
		ORDER BY stop_sequence
	`, [
		gtfsDep0.tripId,
		gtfsDep0.gtfsTripDate,
	])
	const tripDep = tripRows[0] || {}
	debug('trip departure', tripDep)
	const tripArr = tripRows[1] || {}
	debug('trip arrival', tripArr)

	return {
		...m,

		tripId: gtfsDep0.tripId,
		routeId: gtfsDep0.routeId,
		direction: gtfsDep0.direction,
		line: gtfsDep0.line,

		nextStopovers: matchedStopovers,

		// todo: pull departure/arrival platform from GTFS
		tripOrigin: {
			type: 'stop',
			id: tripDep.stop_id,
			name: tripDep.stop_name,
			station: tripDep.station_id && tripDep.station_name ? {
				type: 'station',
				id: tripDep.station_id,
				name: tripDep.station_name,
			} : null,
		},
		// todo: don't hardcode this
		tripPlannedDeparture: tripDep.t_departure
			? inBerlinTime(tripDep.t_departure)
			: null,

		tripDestination: {
			type: 'stop',
			id: tripArr.stop_id,
			name: tripArr.stop_name,
			station: tripArr.station_id && tripArr.station_name ? {
				type: 'station',
				id: tripArr.station_id,
				name: tripArr.station_name,
			} : null,
		},
		// todo: don't hardcode this
		tripPlannedArrival: tripArr.t_arrival
			? inBerlinTime(tripArr.t_arrival)
			: null,
	}
}

const createCachedFindMovement = (gtfsRtInfo, gtfsInfo) => {
	return withCaching(
		createFindMovement(gtfsRtInfo, gtfsInfo),
		_ => 'm:' + _.tripId,
	)
}

module.exports = createCachedFindMovement
