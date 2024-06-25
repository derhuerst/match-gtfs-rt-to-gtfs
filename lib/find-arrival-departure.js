import createDebug from 'debug'
import {DateTime, IANAZone} from 'luxon'
import {gtfsToFptf} from 'gtfs-utils/route-types.js'
import {ok} from 'node:assert'
import {db} from './db.js'
import {createGetStableStopIds} from './stable-stop-ids.js'
import {createGetStableRouteIds} from './stable-route-ids.js'
import {withCaching} from './caching.js'

// todo: DRY with find-trip
const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindArrDep = (gtfsRtInfo, gtfsInfo, type, debug, baseQuery, withHeadsignQuery) => async (_) => {
	debug(type, _)

	// todo: DRY with stopovers matching in find-trip

	// +/- 1min
	const when = DateTime.fromISO(_.plannedWhen)
	const timeFrameStart = when
	.minus({minutes: 1})
	.toISO({suppressMilliseconds: true})
	const timeFrameEnd = when
	.plus({minutes: 1})
	.toISO({suppressMilliseconds: true})
	debug('time frame', timeFrameStart, timeFrameEnd)

	// todo: DRY with lib/find-stop

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo)
	const stopStableIds = getStableStopIds(_.stop)
	const stationStableIds = _.stop.station
		? getStableStopIds(_.stop.station)
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
	const lineStableIds = getStableRouteIds(_.line)
	const routeStableIdsFilter = [
		// stable_id
		lineStableIds.map(([id]) => id),
		// specificity
		lineStableIds.map(([_, specificity]) => specificity),
	]

	// todo: search by trip ID + date?
	const _query0 = {
		// allow `pg` to create a prepared statement
		name: baseQuery.name,
		text: baseQuery.text,
		values: [
			...stopStableIdsFilter,
			...routeStableIdsFilter,
			timeFrameStart,
			timeFrameEnd,
		],
	}
	debug('query', _query0)

	const _res0 = await db.query(_query0)
	let matched = _res0.rows
	if (
		matched.length > 1
		// We only check for matches with the same order of magnitude of certainty/specificity.
		// see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
		&& Math.round(matched[0].match_specificity / 10) * 10 === Math.round(matched[1].match_specificity / 10) * 10
	) {
		debug('>1 matches with equal-order-of-magnitude specificity:', matched)

		// todo: this is too hafas-client-specific
		// gtfs term: "headsign"
		// hafas-client [0] term: "direction"
		// [0] https://github.com/public-transport/hafas-client
		if (!_.direction) {
			debug(type + ' has no .direction, giving up')
			return null;
		}
		// This assumes that the headsign/direction contains a stop name, which is not the case in every region on earth.
		// todo [breaking]: make gtfs(Rt)Info.normalizeTripHeadsign mandatory
		const normalizeDirection = 'normalizeTripHeadsign' in gtfsRtInfo
			? gtfsRtInfo.normalizeTripHeadsign
			: gtfsRtInfo.normalizeStopName

		// todo: handle trip_headsign being optional in GTFS
		const _query1 = {
			// allow `pg` to create a prepared statement
			name: withHeadsignQuery.name,
			text: withHeadsignQuery.text,
			values: [
				..._query0.values,
				normalizeDirection(_.direction),
			],
		}
		debug('querying with the trip headsign to narrow down', _query1)

		const _res1 = await db.query(_query1)
		matched = _res1.rows
		if (
			matched.length > 1
			// We only check for matches with the same order of magnitude of certainty/specificity.
			// see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
			&& Math.round(matched[0].match_specificity / 10) * 10 === Math.round(matched[1].match_specificity / 10) * 10
		) {
			debug('with headsign still >1 matches with equal-order-of-magnitude specificity:', matched)
			// With the VBB data, this happens
			// - at a terminus stop,
			// - where one "run" ends (and the respective stop_times entry specifies a departure_time)
			// - while another "run" of the same trip starts simultaneously, but
			// - only with lines that have an unchanging headsign (shuttle service, cycles, etc).
			// todo: prevent this by querying a *subsequent* arrival/departure (when finding a departure, a previous one for when finding an arrival).
			// WHERE EXISTS (
			// 	SELECT *
			// 	FROM arrivals_departures_with_stable_ids ad2
			// 	-- find a previous arrival/departure on the same trip & date
			// 	WHERE ad2.trip_id = arrivals_departures_with_stable_ids.trip_id
			// 	AND ad2.date = arrivals_departures_with_stable_ids.date
			// 	AND ad2.stop_sequence_consec < arrivals_departures_with_stable_ids.stop_sequence_consec
			// )
			return null
		}
	}
	const m = matched[0]
	if (!m) return null
	debug('match', m)

	// todo: DRY with find-trip
	const res = {
		tripId: m.trip_id,
		// https://github.com/public-transport/gtfs-utils/issues/43
		directionId: m.direction_id + '',
		directionIds: {
			[gtfsInfo.endpointName]: m.direction_id + '',
		},
		direction: m.trip_headsign,
		routeId: m.route_id,
		line: {
			id: null, // todo
			name: m.route_short_name,
			mode: gtfsToFptf(parseInt(m.route_type)),
			product: null, // todo
			// todo: is this only valid for the VBB GTFS?
			fahrtNr: m.trip_short_name,
		},

		// todo: don't hardcode Berlin tz
		when: null,
		plannedWhen: inBerlinTime(m['t_' + type]),
		platform: null,
		plannedPlatform: null,

		// todo [breaking]: Object.defineProperty(res, 'gtfsStopSequence', {value: m.stop_sequence})
		// non-enumerable prop won't work because object-spread in find-hafas-data-in-another-hafas?
		stopoverIndex: m.stop_sequence,
		stop: {
			type: 'stop',
			id: m.stop_id,
			name: m.stop_name,
			station: m.station_id && m.station_name
				? {
					type: 'station',
					id: m.station_id,
					name: m.station_name,
				}
				: null,
		},
	}

	// we don't really want to expose this to lib users, but we need
	// it in lib/find-movement
	Object.defineProperty(res, 'gtfsTripDate', {value: m.date_as_text})

	debug('done matching!', res)
	return res
}

const createCachedFindArrDep = (gtfsRtInfo, gtfsInfo, type) => {
	const debug = createDebug('match-gtfs-rt-to-gtfs:find-' + type)

	let queryName
	if (type === 'arrival') {
		queryName = 'find_arrival'
	} else if (type === 'departure') {
		queryName = 'find_departure'
	} else {
		throw new Error(`invalid type (${type}), must be arrival or departure`)
	}
	const _baseQuery = (addColumns, joins, conditions) => `\
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
	)
SELECT
	*
FROM (
	SELECT
		DISTINCT ON (stop_id, trip_id, "date")
		*
	FROM (
		SELECT
			*,
			-- https://github.com/derhuerst/stable-public-transport-ids/blob/3.0.0/arrival-departure.js#L34
			-- https://github.com/derhuerst/stable-public-transport-ids/blob/3.0.0/arrival-departure.js#L52
			(
				-- todo [breaking]: use route_stable.route_stable_id_specificity instead (requires re-import by user)
				50
			) + stop_or_station_stable_id_specificity + 30 AS match_specificity
		FROM (
			SELECT
				ad.*,
				("date"::date)::text as date_as_text,
				(CASE
					WHEN stop_stable.kind = 'stop_stable_id'
					THEN stop_stable_id
					ELSE station_stable_id
				END) AS stop_or_station_stable_id,
				(CASE
					WHEN stop_stable.kind = 'stop_stable_id'
					THEN stop_stable_id_specificity
					-- https://github.com/derhuerst/stable-public-transport-ids/blob/3.0.0/stop.js#L41-L58
					ELSE station_stable_id_specificity + 20 -- station penalty
				END) AS stop_or_station_stable_id_specificity
${addColumns}
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
${joins}
		) t
		WHERE "date" >= dates_filter_min($6::timestamp with time zone)
		AND "date" <= dates_filter_max($7::timestamp with time zone)
		AND t_${type} >= $6::timestamp with time zone
		AND t_${type} <= $7::timestamp with time zone
${conditions}
		ORDER BY match_specificity ASC
	) t
	ORDER BY stop_id, trip_id, "date", match_specificity ASC
) t
ORDER BY match_specificity ASC
LIMIT 2
`
	const baseQuery = {
		name: queryName,
		text: _baseQuery('', '', ''),
	}
	const withHeadsignQuery = {
		name: queryName + '_with_headsign',
		text: _baseQuery(
			// `normalized_trip_headsign` colum form `trips_normalized_headsigns`
			`\
				, normalized_trip_headsign`,
			// join `trips_normalized_headsigns`
			`\
			LEFT JOIN trips_normalized_headsigns tnh ON ad.trip_id = tnh.trip_id
`,
			// filter by `normalized_trip_headsign`
			`\
		AND normalized_trip_headsign = $8
`),
	}

	return withCaching(
		createFindArrDep(gtfsRtInfo, gtfsInfo, type, debug, baseQuery, withHeadsignQuery),
		// todo:
		// With HAFAS, `tripId` uniquely identifies a vehicle going from A to B
		// at *one point in time*. Within GTFS semantics, a "trip" happends on
		// all defined service days though. So `tripId`, interpreted according
		// within the GTFS realm, *does not* uniquely identify the arr/dep and
		// can therefore not be used as a cache key!
		// todo: dep0 with tripId `foo-bar` & stop.id `hey-there`, dep1 with tripId `foo` & stop.id `bar-hey-there`
		_ => {
			if (!_.tripId) return null // bypass cache
			ok(_.stop?.id, `${type}.stop.id must not be missing/empty`)
			return [type.slice(0, 3), _.tripId, _.stop.id].join('-')
		},
	)
}

export {
	createFindArrDep as createFindArrDepWithoutCaching,
	createCachedFindArrDep as createFindArrDep,
}
