'use strict'

const {DateTime, IANAZone} = require('luxon')
const pgFormat = require('pg-format')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const db = require('./db')
const getStableStopIds = require('./stable-stop-ids')
const getStableRouteIds = require('./stable-route-ids')

const zone = new IANAZone('Europe/Berlin')
const inBerlinTime = (d) => {
	return DateTime
	.fromJSDate(d, {zone})
	.toISO({suppressMilliseconds: true})
}

const findArrDep = async (type, _) => {
	// +/- 1min
	const timeFrameStart = DateTime.fromISO(_.plannedWhen)
	.minus({minutes: 1})
	.toISO({suppressMilliseconds: true})
	const timeFrameEnd = DateTime.fromISO(_.plannedWhen)
	.plus({minutes: 1})
	.toISO({suppressMilliseconds: true})

	const stopStableIds = getStableStopIds(_.stop)
	const stationStableIds = _.stop.station
		? getStableStopIds(_.stop.station)
		: []

	// gtfs term: "route"
	// fptf term: "line"
	const lineStableIds = getStableRouteIds(_.line)

	const {rows: matched} = await db.query(pgFormat(`
		SELECT
			arrivals_departures_with_stable_ids.route_id,
			route_stable_ids,
			route_short_name,
			route_type,
			trip_id,
			trip_headsign,
			trip_short_name,
			%I,
			stop_id,
			stop_name,
			station_id,
			station_name
		FROM arrivals_departures_with_stable_ids
		WHERE (
			stop_stable_ids && ARRAY[%L]::text[]
			OR station_stable_ids && ARRAY[%L]::text[]
		)
		AND route_stable_ids && ARRAY[%L]::text[]
		AND %I > $1
		AND %I < $2
	`, ...[
		't_' + type,
		stopStableIds,
		stationStableIds,
		lineStableIds,
		't_' + type,
		't_' + type,
	]), [
		timeFrameStart,
		timeFrameEnd,
	])
	const m = matched[0]
	if (!m) return null

	return {
		tripId: m.trip_id,
		direction: m.trip_headsign,
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

module.exports = findArrDep
