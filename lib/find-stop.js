'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:find-stop')
const db = require('./db')
const createGetStableStopIds = require('./stable-stop-ids')
const {withCaching} = require('./caching')

const FIND_STOP_QUERY = `\
SELECT
	stop_id,
	stop_name,
	stop_loc,
	station_id,
	station_name,
	station_loc
FROM stops_with_stations_and_stable_ids
WHERE (
	stop_stable_id = ANY($1)
	OR station_stable_id = ANY($2)
)
LIMIT 1
`

const createFindStop = (gtfsRtInfo, gtfsInfo) => async ( _) => {
	debug(_)

	// todo: DRY with lib/find-arrival-departure

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo)
	const stableIds = getStableStopIds(_).map(([id]) => id)
	debug('stableIds', stableIds)
	const stationStableIds = _.station
		? getStableStopIds(_.station).map(([id]) => id)
		: []
	debug('stationStableIds', stationStableIds)

	const query = {
		// allow `pg` to create a prepared statement
		name: 'find_stop',
		text: FIND_STOP_QUERY,
		values: [
			stableIds,
			[...stableIds, ...stationStableIds],
		],
	}
	debug('query', query)

	const {rows: matched} = await db.query(query)
	const m = matched[0]
	if (!m) return null

	const res = {
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

	debug('done matching!', res)
	return res
}

const createCachedFindStop = (gtfsRtInfo, gtfsInfo) => {
	return withCaching(createFindStop(gtfsRtInfo, gtfsInfo), _ => _.id)
}

module.exports = createCachedFindStop
