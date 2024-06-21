import createDebug from 'debug'
import {ok} from 'node:assert'
import {db} from './db.js'
import {createGetStableStopIds} from './stable-stop-ids.js'
import {withCaching} from './caching.js'

const debug = createDebug('match-gtfs-rt-to-gtfs:find-stop')

const FIND_STOP_QUERY = `\
-- 1. We find all matches based on stop_stable_id *and* station_stable_id, giving station_stable_id a penalty because it represents a less accurate match.
-- 2. For each matched stop, we only keep the row with the best (lowest) match specificity.
-- 3. Sorting by match specificity (ascending), we then get the most likely candidates.
WITH query_stable_ids AS (
	SELECT *
	FROM unnest($1::TEXT[], $2::TEXT[], $3::INTEGER[])
	AS t (kind, stable_id, specificity)
)
SELECT
	*
FROM (
	SELECT
		DISTINCT ON (stop_id)
		*
	FROM (
		SELECT
			stop_id,
			stop_name, stop_loc,
			station_id,
			station_name, station_loc,
			(CASE
				WHEN kind = 'stop_stable_id'
				THEN stop_stable_id_specificity
				-- https://github.com/derhuerst/stable-public-transport-ids/blob/2.1.0/stop.js#L29
				ELSE station_stable_id_specificity + 20 -- station penalty
			END) AS match_specificity
		FROM stops_with_stations_and_stable_ids stops
		JOIN query_stable_ids
			ON (
				query_stable_ids.kind = 'stop_stable_id'
				AND stops.stop_stable_id = query_stable_ids.stable_id
				-- We only want matches with the same order of magnitude of certainty/specificity.
				-- see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
				AND round(stops.stop_stable_id_specificity / 10) * 10 = round(query_stable_ids.specificity / 10) * 10
			) OR (
				query_stable_ids.kind = 'station_stable_id'
				AND stops.station_stable_id = query_stable_ids.stable_id
				-- We only want matches with the same order of magnitude of certainty/specificity.
				-- see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
				AND round(stops.station_stable_id_specificity / 10) * 10 = round(query_stable_ids.specificity / 10) * 10
			)
		ORDER BY match_specificity ASC
	) t
	ORDER BY stop_id, match_specificity ASC
) t
ORDER BY match_specificity ASC
LIMIT 2
`

const createFindStop = (gtfsRtInfo, gtfsInfo) => async ( _) => {
	debug(_)

	// todo: DRY with lib/find-arrival-departure

	const getStableStopIds = createGetStableStopIds(gtfsRtInfo)
	const stableIds = getStableStopIds(_)
	debug('stableIds', stableIds)
	const stationStableIds = _.station
		? getStableStopIds(_.station)
		: []
	debug('stationStableIds', stationStableIds)

	const query = {
		// allow `pg` to create a prepared statement
		name: 'find_stop',
		text: FIND_STOP_QUERY,
		values: [
			// kind
			[
				...stableIds.map(_ => 'stop_stable_id'),
				...stationStableIds.map(_ => 'station_stable_id'),
			],
			// stable_id
			[
				...stableIds.map(([id]) => id),
				...stationStableIds.map(([id]) => id),
			],
			// specificity
			[
				...stableIds.map(([_, specificity]) => specificity),
				...stationStableIds.map(([_, specificity]) => specificity),
			],
		],
	}
	debug('query', query)

	const {rows: matched} = await db.query(query)
	if (
		matched.length > 1
		// We only check for matches with the same order of magnitude of certainty/specificity.
		// see also https://github.com/derhuerst/stable-public-transport-ids/blob/00a947f/readme.md#how-it-works
		&& Math.round(matched[0].match_specificity / 10) * 10 === Math.round(matched[1].match_specificity / 10) * 10
	) {
		debug('two matched stops with equal-order-of-magnitude specificity:', matched)
		return null
	}

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
	return withCaching(
		createFindStop(gtfsRtInfo, gtfsInfo),
		_ => {
			ok(_.id, 'stop.id must not be missing/empty')
			return _.id
		},
	)
}

export {
	createFindStop as createFindStopWithoutCaching,
	createCachedFindStop as createFindStop,
}
