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

const _findTripQuery = (addColumns, joins, conditions) => `\
WITH
	query_stop_or_station_stable_ids AS (
		SELECT *
		FROM unnest($1::TEXT[], $2::TEXT[], $3::INTEGER[])
		AS t (kind, stable_id, specificity)
	),
	query_route_stable_ids AS (
		SELECT *
		FROM unnest($4::TEXT[], $5::INTEGER[])
		AS t(stable_id, specificity)
	),
	dep AS (
		SELECT
			DISTINCT ON (trip_id, "date")
			trip_id,
			"date",
			(
				(
					-- todo [breaking]: use ad.route_stable_id_specificity instead (requires re-import by user)
					50
				)
				+ (CASE
					WHEN stop_stable.kind = 'stop_stable_id'
					THEN stop_stable_id_specificity
					-- https://github.com/derhuerst/stable-public-transport-ids/blob/2.1.0/stop.js#L29
					ELSE station_stable_id_specificity + 20 -- station penalty
				END)
				-- https://github.com/derhuerst/stable-public-transport-ids/blob/2.1.0/arrival-departure.js#L27
				-- https://github.com/derhuerst/stable-public-transport-ids/blob/2.1.0/arrival-departure.js#L39
				+ 30
			) AS match_specificity
		FROM arrivals_departures_with_stable_ids ad
		JOIN query_route_stable_ids route_stable
			ON (
				ad.route_stable_id = route_stable.stable_id
				-- We only want matches with the same order of magnitude of certainty/specificity.
				-- see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
				-- todo [breaking]: enable this filter (requires re-import by user)
				-- AND round(ad.route_stable_id_specificity / 10) * 10 = round(route_stable.specificity / 10) * 10
			)
		JOIN query_stop_or_station_stable_ids stop_stable
			ON (
				stop_stable.kind = 'stop_stable_id'
				AND ad.stop_stable_id = stop_stable.stable_id
				-- We only want matches with the same order of magnitude of certainty/specificity.
				-- see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
				-- todo [breaking]: enable this filter (requires re-import by user)
				-- AND round(ad.stop_stable_id_specificity / 10) * 10 = round(stop_stable.specificity / 10) * 10
			) OR (
				stop_stable.kind = 'station_stable_id'
				AND ad.station_stable_id = stop_stable.stable_id
				-- We only want matches with the same order of magnitude of certainty/specificity.
				-- see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
				-- todo [breaking]: enable this filter (requires re-import by user)
				-- AND round(ad.station_stable_id_specificity / 10) * 10 = round(stop_stable.specificity / 10) * 10
			)
		WHERE True
		AND t_departure >= $6::timestamp with time zone
		AND t_departure <= $7::timestamp with time zone
	    AND "date" >= dates_filter_min($6::timestamp with time zone)
	    AND "date" <= dates_filter_max($7::timestamp with time zone)
		LIMIT 2
	)
SELECT
	DISTINCT ON (a_d_s.trip_id, a_d_s.date, stop_sequence)
	a_d_s.trip_id, trip_short_name,
	route_id, route_short_name, route_type,
	direction_id,
	trip_headsign,
	a_d_s.date,
	stop_sequence,
	t_arrival,
	t_departure,
	a_d_s.stop_id, a_d_s.stop_name,
	ST_Y(stops.stop_loc::geometry) as stop_lat, ST_X(stops.stop_loc::geometry) as stop_lon,
	array_agg(stop_stable_id) OVER (PARTITION BY a_d_s.trip_id, a_d_s.date, stop_sequence) AS stop_stable_ids,
	station_id, station_name,
	ST_Y(stations.stop_loc::geometry) as station_lat, ST_X(stations.stop_loc::geometry) as station_lon,
	array_agg(station_stable_id) OVER (PARTITION BY a_d_s.trip_id, a_d_s.date, stop_sequence) AS station_stable_ids
	, match_specificity
${addColumns}
FROM arrivals_departures_with_stable_ids a_d_s
JOIN dep ON (
	a_d_s.trip_id = dep.trip_id
	AND a_d_s.date = dep.date
)
LEFT JOIN stops ON stops.stop_id = a_d_s.stop_id
LEFT JOIN stops stations ON stations.stop_id = a_d_s.station_id
${joins}
WHERE True
${conditions}
ORDER BY a_d_s.trip_id, a_d_s.date, stop_sequence
`
const FIND_TRIP_QUERY = _findTripQuery('', '', '')
const FIND_TRIP_WITH_HEADSIGN_QUERY = _findTripQuery(
	// `normalized_trip_headsign` colum from `trips_normalized_headsigns`
	`\
	, normalized_trip_headsign`,
	// join `trips_normalized_headsigns`
	`\
LEFT JOIN trips_normalized_headsigns tnh ON a_d_s.trip_id = tnh.trip_id
`,
	// filter by `normalized_trip_headsign`
	`\
AND normalized_trip_headsign = $8
`)

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

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo)
	const stopStableIds = getStableStopIds(stopover0.stop)
	const stationStableIds = stopover0.stop.station
		? getStableStopIds(stopover0.stop.station)
		: []
	const stopStableIdsFilter = [
		// kind
		[
			...stopStableIds.map(_ => 'stop_stable_id'),
			...stationStableIds.map(_ => 'station_stable_id'),
		],
		// stable_id
		[
			...stopStableIds.map(([id]) => id),
			...stationStableIds.map(([id]) => id),
		],
		// specificity
		[
			...stopStableIds.map(([_, specificity]) => specificity),
			...stationStableIds.map(([_, specificity]) => specificity),
		],
	]

	// gtfs term: "route"
	// fptf term: "line"
	const getStableRouteIds = createGetStableRouteIds(gtfsRtInfo)
	const lineStableIds = getStableRouteIds(t.line)
	const routeStableIdsFilter = [
		// stable_id
		lineStableIds.map(([id]) => id),
		// specificity
		lineStableIds.map(([_, specificity]) => specificity),
	]

	debug(`finding any departure, querying trip's stopovers`, {
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
		name: 'find_trip_2',
		text: FIND_TRIP_QUERY,
		values: [
			...stopStableIdsFilter,
			...routeStableIdsFilter,
			timeFrameStart, timeFrameEnd,
		],
	}
	debug('query', query)

	let {rows} = await db.query(query)
	if (rows.length === 0) {
		debug('no match found')
		return null
	}
	// The rows are ordered by trip_id, and we check if they all have the same trip_id.
	if (rows[0].trip_id !== rows[rows.length - 1].trip_id) {
		debug(
			'>1 match; first & last row:',
			[rows[0], rows[rows.length - 1]],
		)

		// todo: this is too hafas-client-specific
		// gtfs term: "headsign"
		// hafas-client [0] term: "direction"
		// [0] https://github.com/public-transport/hafas-client
		if (!t.direction) {
			debug('trip has no .direction, giving up')
			return null
		}
		// This assumes that the headsign/direction contains a stop name, which is not the case in every region on earth.
		// todo [breaking]: make gtfs(Rt)Info.normalizeTripHeadsign mandatory
		const normalizeDirection = 'normalizeTripHeadsign' in gtfsRtInfo
			? gtfsRtInfo.normalizeTripHeadsign
			: gtfsRtInfo.normalizeStopName

		const queryWithHeadsign = {
			// allow `pg` to create a prepared statement
			name: 'find_trip_2_with_headsign',
			text: FIND_TRIP_WITH_HEADSIGN_QUERY,
			values: [
				...query.values,
				normalizeDirection(t.direction),
			],
		}
		debug('querying with the trip headsign/direction to narrow down', queryWithHeadsign)

		rows = (await db.query(queryWithHeadsign)).rows
		if (rows.length === 0) {
			debug('with headsign/direction no match found')
			return null
		}
		if (rows[0].trip_id !== rows[rows.length - 1].trip_id) { // as above
			debug(
				'with headsign/direction still >1 match; first & last row:',
				[rows[0], rows[rows.length - 1]],
			)
			return null
		}
		// todo: check if headsigns are actually different! and add a test case, e.g. both buses having just "Ada Express"
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
