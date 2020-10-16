'use strict'

const pgFormat = require('pg-format')
const db = require('./db')
const getStableStopIds = require('./stable-stop-ids')

const findStop = async ( _) => {
	const stableIds = getStableStopIds(_)
	const stationStableIds = _.station
		? getStableStopIds(_.station)
		: []

	const {rows: matched} = await db.query(pgFormat(`
		SELECT
			stop_id,
			stop_name,
			stop_loc,
			station_id,
			station_name,
			station_loc
		FROM stops_with_stations_and_stable_ids
		WHERE (
			stop_stable_ids && ARRAY[%L]::text[]
			OR station_stable_ids && ARRAY[%L]::text[]
		)
	`, ...[
		stableIds,
		[...stableIds, ...stationStableIds],
	]))
	const m = matched[0]
	if (!m) return null

	return {
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
	}
}

module.exports = findStop
