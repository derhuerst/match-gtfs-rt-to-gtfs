'use strict'

const {Client} = require('pg')
const {DateTime} = require('luxon')
const pgFormat = require('pg-format')
const getStableStopIds = require('./stable-stop-ids')
const getStableRouteIds = require('./stable-route-ids')

const db = new Client()

const matchArrDep = async (type, _) => {
	if (type !== 'departure' && type !== 'arrival') {
		throw new Error('invalid type')
	}

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

	await db.connect()
	const {rows: candidates} = await db.query(pgFormat(`
		SELECT
			arrivals_departures_with_stable_ids.route_id,
			route_stable_ids,
			route_short_name,
			route_type,
			trip_id,
			trip_headsign,
			trip_short_name,
			stop_sequence,
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

	return candidates[0] || null
}

module.exports = matchArrDep
