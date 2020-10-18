'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-stop')
const pgFormat = require('pg-format')
const db = require('./db')
const getStableStopIds = require('./stable-stop-ids')
const withCaching = require('./caching')

const findStop = async ( _) => {
	debug(_)

	const stableIds = getStableStopIds(_)
	debug('stableIds', stableIds)
	const stationStableIds = _.station
		? getStableStopIds(_.station)
		: []
	debug('stationStableIds', stationStableIds)

	const query = pgFormat(`
		SELECT
			stop_id,
			stop_name,
			stop_loc,
			station_id,
			station_name,
			station_loc
		FROM stops_with_stations_and_stable_ids
		WHERE (
			stable_id = ANY(ARRAY[%L])
			OR stable_id = ANY(ARRAY[%L])
		)
	`, ...[
		stableIds,
		[...stableIds, ...stationStableIds],
	])
	debug('query', query)

	const {rows: matched} = await db.query(query)
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

const cachedFindStop = withCaching(findStop, _ => _.id)

module.exports = cachedFindStop
