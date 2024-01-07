'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-trip')
const {DateTime, IANAZone} = require('luxon')
const {ok} = require('assert')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const STABLE_IDS = require('@derhuerst/stable-public-transport-ids/symbol')
const createGetStableStopIds = require('./stable-stop-ids')
const createGetStableRouteIds = require('./stable-route-ids')
const db = require('./db')
const {withCaching} = require('./caching')

// We only ever match the 1st (stop_sequence_consec=0) stop_time/stopover with this query.
// This means that, whenever the HAFAS/GTFS-RT omits 1st, we won't match the trip, even if
// all others could get matched.
// todo: search for a pair of subsequent stop_times/stopovers instead?
const FIND_TRIP_QUERY = `\
WITH dep AS (
	SELECT trip_id, "date"
	FROM arrivals_departures_with_stable_ids
	WHERE stop_sequence_consec = 0
	AND stop_stable_id = ANY($1)
	AND route_stable_id = ANY($2)
	AND t_departure >= $3::timestamp with time zone
	AND t_departure <= $4::timestamp with time zone
    -- filter by date for better performance
    -- Because arrival/departure times can be more than >24h after the beginning of the
    -- schedule date, we need to define a window of schedule dates based on the highest
    -- arrival/departure time.
    AND "date" >= dates_filter_min($3::timestamp with time zone)
    AND "date" <= dates_filter_max($4::timestamp with time zone)
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
`

// todo: DRY with find-arrival-departure
const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindTrip = (gtfsRtInfo, gtfsInfo) => async (t) => {
	if (!Array.isArray(t.stopovers) || t.stopovers.length === 0) {
		debug('not matching trip, t.stopovers must be an array', {
			tripId: t.id,
			lineName: t.line && t.line.name,
			stopovers: t.stopovers,
		})
		return null;
	}

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
		timeFrameStart, timeFrameEnd,
		stopStableIds, stationStableIds,
		lineStableIds,
	})
	// stop_stable_ids & station_stable_ids each contain duplicate items because arrivals_departures_with_stable_ids contains every unique (stop_stable_id, station_stable_id) pair.
	// todo: make them unique to optimise query performance
	const query = {
		// allow `pg` to create a prepared statement
		name: 'find_trip',
		text: FIND_TRIP_QUERY,
		values: [
			// todo: filter using `station_stable_id`?
			[...stopStableIds, ...stationStableIds],
			lineStableIds,
			timeFrameStart, timeFrameEnd,
		],
	}
	debug('query', query)

	const {rows} = await db.query(query)
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

			// todo [breaking]: Object.defineProperty(res, 'gtfsStopSequence', {value: s.stop_sequence})
			// non-enumerable prop won't work because object-spread in find-hafas-data-in-another-hafas?
			stopoverIndex: s.stop_sequence,
			stop,
		}
	})
	debug('gtfsStopovers', gtfsStopovers)

	const gtfsFirstStopover = gtfsStopovers[0]
	const gtfsLastStopover = gtfsStopovers[gtfsStopovers.length - 1]
	const trip = {
		...t,

		id: gtfsFirstStopover.tripId,
		routeId: gtfsFirstStopover.routeId,
		directionId: rows[0].direction_id + '',
		directionIds: {
			[gtfsInfo.endpointName]: rows[0].direction_id + '',
		},
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

	debug('done matching!', trip)
	return trip
}

const createCachedFindTrip = (gtfsRtInfo, gtfsInfo) => {
	return withCaching(
		createFindTrip(gtfsRtInfo, gtfsInfo),
		_ => 't:' + _.id,
	)
}

module.exports = createCachedFindTrip
