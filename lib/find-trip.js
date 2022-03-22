'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-trip')
const {DateTime, IANAZone} = require('luxon')
const {ok} = require('assert')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const stopoverToArrDep = require('./stopover-to-arr-dep')
const createFindArrDep = require('./find-arrival-departure')
const db = require('./db')
const {withCaching} = require('./caching')

// todo: upgrade @derhuerst/stable-public-transport-ids
// todo: upgrade find-hafas-data-in-another-hafas
// const STABLE_IDS = require('@derhuerst/stable-public-transport-ids/symbol')
const STABLE_IDS = Symbol.for('@derhuerst/stable-public-transport-ids')

// todo: DRY with find-arrival-departure
const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindTrip = (gtfsRtInfo, gtfsInfo) => async (t) => {
	if (!Array.isArray(t.stopovers) || t.stopovers.length === 0) return null;

	debug('finding first & last stopover', t.id, t.line && t.line.name)
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

	const gtfsTripId = gtfsFirstDep.tripId
	ok(gtfsRtInfo, 'gtfsFirstDep.tripId must not be empty')
	const gtfsDate = gtfsFirstDep.gtfsTripDate
	ok(gtfsDate, 'gtfsFirstDep.gtfsTripDate must not be empty')

	debug(`fetching trip's stopovers`)
	// stop_stable_ids & station_stable_ids each contain duplicate items because arrivals_departures_with_stable_ids contains every unique (stop_stable_id, station_stable_id) pair.
	// todo: make them unique to optimise query performance
	const query = `
		SELECT DISTINCT ON (trip_id, date, stop_sequence)
			trip_id, trip_short_name,
			route_id, route_short_name, route_type,
			trip_headsign,
			date,
			stop_sequence,
			t_arrival,
			t_departure,
			a_d_s.stop_id, a_d_s.stop_name,
			ST_Y(stops.stop_loc::geometry) as stop_lat, ST_X(stops.stop_loc::geometry) as stop_lon,
			array_agg(stop_stable_id) OVER (PARTITION BY trip_id, date, stop_sequence) AS stop_stable_ids,
			station_id, station_name,
			ST_Y(stations.stop_loc::geometry) as station_lat, ST_X(stations.stop_loc::geometry) as station_lon,
			array_agg(station_stable_id) OVER (PARTITION BY trip_id, date, stop_sequence) AS station_stable_ids
		FROM arrivals_departures_with_stable_ids a_d_s
		LEFT JOIN stops ON stops.stop_id = a_d_s.stop_id
		LEFT JOIN stops stations ON stations.stop_id = a_d_s.station_id
		WHERE True
		AND trip_id = $1
		AND date = $2
		ORDER BY trip_id, date, stop_sequence
	`
	const {rows} = await db.query(query, [
		gtfsTripId,
		gtfsDate,
	])
	ok(rows.length > 0, `there must be >0 stopover rows for trip ${gtfsTripId} on ${gtfsDate}`)

	// todo: DRY with find-arrival-departure
	const line = {
		id: null, // todo
		name: rows[0].route_short_name,
		mode: gtfsToFptf(parseInt(rows[0].route_type)),
		product: null, // todo
		// todo: is this only valid for the VBB GTFS?
		fahrtNr: rows[0].trip_short_name,
	}
	const gtfsStopovers = rows.map((s) => {
		let station = null
		// todo: stable IDs
		if (s.station_id && s.station_name && s.station_lat !== null && s.station_lon !== null) {
			station = {
				type: 'station',
				id: s.station_id,
				name: s.station_name,
				location: {type: 'location', latitude: s.station_lat, longitude: s.station_lon},
			}
			Object.defineProperty(station, STABLE_IDS, {value: s.station_stable_ids})
		}
		const stop = {
			type: 'stop',
			id: s.stop_id,
			name: s.stop_name,
			location: {type: 'location', latitude: s.stop_lat, longitude: s.stop_lon},
		}
		Object.defineProperty(stop, STABLE_IDS, {value: s.stop_stable_ids})

		return {
			tripId: s.trip_id,
			direction: s.trip_headsign,
			routeId: s.route_id,
			line,

			departure: null,
			// todo: don't hardcode Berlin tz
			plannedDeparture: inBerlinTime(s.t_departure),
			departurePlatform: null,
			plannedDeparturePlatform: null, // todo

			arrival: null,
			// todo: don't hardcode Berlin tz
			plannedArrival: inBerlinTime(s.t_arrival),
			arrivalPlatform: null,
			plannedArrivalPlatform: null, // todo

			stopoverIndex: s.stop_sequence,
			stop,
		}
	})
	debug('gtfsStopovers', gtfsStopovers)

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
