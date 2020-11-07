'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-arrival-departure')
const {DateTime, IANAZone} = require('luxon')
const pgFormat = require('pg-format')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const db = require('./db')
const createGetStableStopIds = require('./stable-stop-ids')
const createGetStableRouteIds = require('./stable-route-ids')
const withCaching = require('./caching')

const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const createFindArrDep = (gtfsRtInfo, gtfsInfo, type) => async (_) => {
	debug(type, _)

	// +/- 1min
	const when = DateTime.fromISO(_.plannedWhen)
	const timeFrameStart = when
	.minus({minutes: 1})
	.toISO({suppressMilliseconds: true})
	const timeFrameEnd = when
	.plus({minutes: 1})
	.toISO({suppressMilliseconds: true})
	debug('time frame', timeFrameStart, timeFrameEnd)

	const tBaseStart = when
	.minus({days: 3})
	.toISO({suppressMilliseconds: true})
	const tBaseEnd = when
	.plus({days: 3})
	.toISO({suppressMilliseconds: true})
	debug('t_base range', tBaseStart, tBaseEnd)

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo, gtfsInfo)
	const stopStableIds = getStableStopIds(_.stop)
	debug('stopStableIds', stopStableIds)
	const stationStableIds = _.stop.station
		? getStableStopIds(_.stop.station)
		: []
	debug('stationStableIds', stationStableIds)

	// gtfs term: "route"
	// fptf term: "line"
	const getStableRouteIds = createGetStableRouteIds(gtfsRtInfo, gtfsInfo)
	const lineStableIds = getStableRouteIds(_.line)
	debug('lineStableIds', lineStableIds)

	const query = pgFormat(`
		SELECT *
		FROM arrivals_departures_with_stable_ids
		WHERE stable_id = ANY(ARRAY[%L])
		AND route_stable_id = ANY(ARRAY[%L])
		AND t_arrival > $1
		AND t_arrival < $2
		-- allow cutoffs for better performance
		AND t_base > $3
		AND t_base < $4
		LIMIT 1
	`, ...[
		[...stopStableIds, ...stationStableIds],
		lineStableIds,
	])
	debug('query', query)

	const {rows: matched} = await db.query(query, [
		timeFrameStart,
		timeFrameEnd,
		tBaseStart,
		tBaseEnd,
	])
	const m = matched[0]
	if (!m) return null
	debug('match', m)

	return {
		tripId: m.trip_id,
		direction: m.trip_headsign,
		routeId: m.route_id,
		line: {
			id: null, // todo
			name: m.route_short_name,
			mode: gtfsToFptf(parseInt(m.route_type)),
			product: null, // todo
			// todo: is this only valid for the VBB GTGS?
			fahrtNr: m.trip_short_name,
		},

		plannedWhen: inBerlinTime(m['t_' + type]),
		when: null,
		platform: null,
		plannedPlatform: null,

		stop: {
			type: null, // todo
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
}

const createCachedFindArrDep = (gtfsRtInfo, gtfsInfo, type) => {
	return withCaching(
		createFindArrDep(gtfsRtInfo, gtfsInfo, type),
		_ => [type.slice(0, 3), _.tripId, _.stop.id].join('-'),
	)
}

module.exports = createCachedFindArrDep
