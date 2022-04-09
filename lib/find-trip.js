'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-trip')
const {DateTime, IANAZone} = require('luxon')
const {ok} = require('assert')
const pgFormat = require('pg-format')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const STABLE_IDS = require('@derhuerst/stable-public-transport-ids/symbol')
const createGetStableStopIds = require('./stable-stop-ids')
const createGetStableRouteIds = require('./stable-route-ids')
const db = require('./db')
const {withCaching} = require('./caching')

// todo: DRY with find-arrival-departure
const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindTrip = (gtfsRtInfo, gtfsInfo) => async (t) => {
	if (!Array.isArray(t.stopovers) || t.stopovers.length === 0) return null;

	const stopover0 = t.stopovers[0]
	const dep0 = stopover0 && stopover0.plannedDeparture
	if (!Number.isInteger(Date.parse(dep0))) {
		debug('t.stopovers[0].plannedDeparture should be an ISO 8601 string', {
			tripId: t.id,
			lineName: t.line && t.line.name,
			stopover0: t.stopovers[0],
		})
		return null
	}

	// +/- 1min
	const when = DateTime.fromISO(dep0)
	const timeFrameStart = when
	.minus({minutes: 1})
	.toISO({suppressMilliseconds: true})
	const timeFrameEnd = when
	.plus({minutes: 1})
	.toISO({suppressMilliseconds: true})

	const dateStart = when
	.minus({days: 1})
	.toISODate()
	const dateEnd = when.toISODate() // same date suffices

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo, gtfsInfo)
	const stopStableIds = getStableStopIds(stopover0.stop).map(([id]) => id)
	const stationStableIds = stopover0.stop.station
		? getStableStopIds(stopover0.stop.station).map(([id]) => id)
		: []

	// gtfs term: "route"
	// fptf term: "line"
	const getStableRouteIds = createGetStableRouteIds(gtfsRtInfo, gtfsInfo)
	const lineStableIds = getStableRouteIds(t.line).map(([id]) => id)

	debug(`finding first departure, querying trip's stopovers`, {
		tripId: t.id,
		lineName: t.line && t.line.name,
		dep0,
		timeFrameStart, timeFrameEnd, dateStart, dateEnd,
		stopStableIds, stationStableIds,
		lineStableIds,
	})
	// stop_stable_ids & station_stable_ids each contain duplicate items because arrivals_departures_with_stable_ids contains every unique (stop_stable_id, station_stable_id) pair.
	// todo: make them unique to optimise query performance
	const query = pgFormat(`
		WITH dep AS (
			SELECT trip_id, "date"
			FROM arrivals_departures_with_stable_ids
			WHERE stop_sequence_consec = 0
			AND stop_stable_id = ANY(ARRAY[%L])
			AND route_stable_id = ANY(ARRAY[%L])
			AND t_departure >= $1 AND t_departure <= $2
			AND "date" >= $3 AND "date" <= $4
			LIMIT 1
		)
		SELECT DISTINCT ON (trip_id, date, stop_sequence)
			trip_id, trip_short_name,
			route_id, route_short_name, route_type,
			direction_id,
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
		AND trip_id = (SELECT trip_id FROM dep)
		AND date = (SELECT "date" FROM dep)
		ORDER BY trip_id, date, stop_sequence
	`, ...[
		// todo: filter using `station_stable_id`?
		[...stopStableIds, ...stationStableIds],
		lineStableIds,
	])
	const {rows} = await db.query(query, [
		timeFrameStart, timeFrameEnd,
		dateStart, dateEnd,
	])
	if (rows.length === 0) {
		debug('no match found')
		return null
	}

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

	debug('done matching!')

	const gtfsFirstStopover = gtfsStopovers[0]
	const gtfsLastStopover = gtfsStopovers[gtfsStopovers.length - 1]
	return {
		...t,

		id: gtfsFirstStopover.tripId,
		routeId: gtfsFirstStopover.routeId,
		directionId: rows[0].direction_id,
		direction: gtfsFirstStopover.direction,
		line: gtfsFirstStopover.line,

		origin: gtfsFirstStopover.stop,
		plannedDeparture: gtfsFirstStopover.plannedDeparture,
		plannedDeparturePlatform: gtfsFirstStopover.plannedDeparturePlatform,
		destination: gtfsLastStopover.stop,
		plannedArrival: gtfsLastStopover.plannedArrival,
		plannedArrivalPlatform: gtfsLastStopover. plannedArrivalPlatform,

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
