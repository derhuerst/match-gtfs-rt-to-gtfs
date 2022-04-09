'use strict'

const createDebug = require('debug')
const {DateTime, IANAZone} = require('luxon')
const pgFormat = require('pg-format')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const db = require('./db')
const createGetStableStopIds = require('./stable-stop-ids')
const createGetStableRouteIds = require('./stable-route-ids')
const {withCaching} = require('./caching')

// todo: DRY with find-trip
const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindArrDep = (gtfsRtInfo, gtfsInfo, type, debug) => async (_) => {
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

	const dateStart = when
	.minus({days: 1})
	.toISODate()
	const dateEnd = when.toISODate() // same date suffices
	debug('date range', dateStart, dateEnd)

	// todo: DRY with lib/find-stop

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo, gtfsInfo)
	const stopStableIds = getStableStopIds(_.stop).map(([id]) => id)
	const stationStableIds = _.stop.station
		? getStableStopIds(_.stop.station).map(([id]) => id)
		: []

	// gtfs term: "route"
	// fptf term: "line"
	const getStableRouteIds = createGetStableRouteIds(gtfsRtInfo, gtfsInfo)
	const lineStableIds = getStableRouteIds(_.line).map(([id]) => id)

	// todo: search by trip ID + date?
	const query = pgFormat(`
		SELECT
			*,
			(date::date)::text as date_as_text
		FROM arrivals_departures_with_stable_ids
		WHERE stop_stable_id = ANY(ARRAY[%L])
		AND route_stable_id = ANY(ARRAY[%L])
		AND %I >= $1
		AND %I <= $2
		-- allow cutoffs for better performance
		AND "date" >= $3
		AND "date" <= $4
		LIMIT 1
	`, ...[
		// todo: filter using `station_stable_id`?
		[...stopStableIds, ...stationStableIds],
		lineStableIds,
		't_' + type,
		't_' + type,
	])
	debug('query', query)

	const {rows: matched} = await db.query(query, [
		timeFrameStart,
		timeFrameEnd,
		dateStart,
		dateEnd,
	])
	const m = matched[0]
	if (!m) return null
	debug('match', m)

	// todo: DRY with find-trip
	const res = {
		tripId: m.trip_id,
		directionId: m.direction_id,
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

	return res
}

const createCachedFindArrDep = (gtfsRtInfo, gtfsInfo, type) => {
	const debug = createDebug('match-gtfs-rt-to-gtfs:find-' + type)
	return withCaching(
		createFindArrDep(gtfsRtInfo, gtfsInfo, type, debug),
		// todo:
		// With HAFAS, `tripId` uniquely identifies a vehicle going from A to B
		// at *one point in time*. Within GTFS semantics, a "trip" happends on
		// all defined service days though. So `tripId`, interpreted according
		// within the GTFS realm, *does not* uniquely identify the arr/dep and
		// can therefore not be used as a cache key!
		_ => [type.slice(0, 3), _.tripId, _.stop.id].join('-'),
	)
}

module.exports = createCachedFindArrDep
