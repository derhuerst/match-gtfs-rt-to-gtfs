'use strict'

const tokenize = require('tokenize-vbb-station-name')
const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')
const csv = require('../csv')

const DATA_SOURCE = 'vbb'
const normalizeName = name => tokenize(name, {meta: 'remove'}).join('-')
const getStopIds = createGetStopIds(DATA_SOURCE, normalizeName)

const STOPS_AND_STATIONS = `
	SELECT
		stops.stop_id as id,
		stops.stop_name as name,
		ST_Y(stops.stop_loc::geometry) as lat,
		ST_X(stops.stop_loc::geometry) as long,
		s.stop_id as station_id,
		s.stop_name as station_name,
		ST_Y(s.stop_loc::geometry) as station_lat,
		ST_X(s.stop_loc::geometry) as station_long
	FROM stops
	LEFT JOIN stops s ON stops.parent_station = s.stop_id
`

const beforeAll = `\
CREATE TABLE stops_stable_ids (
	stop_id TEXT NOT NULL,
	FOREIGN KEY (stop_id) REFERENCES stops,
	stable_id TEXT NOT NULL
);

COPY stops_stable_ids FROM STDIN csv;
`

const onStop = (s) => {
	const stop = {
		id: s.id,
		name: s.name,
		location: {latitude: s.lat, longitude: s.long},
		station: s.station_id ? {
			id: s.station_id,
			name: s.station_name,
			location: {latitude: s.station_lat, longitude: s.station_long},
		} : null,
	}

	const ids = getStopIds(stop)
	for (const id of ids) {
		process.stdout.write(csv([stop.id, id]))
	}

	if (stop.station) {
		const ids = getStopIds(stop.station)
		for (const id of ids) {
			process.stdout.write(csv([stop.id, id]))
		}
	}
}

const afterAll = `\
\\.

CREATE MATERIALIZED VIEW stops_with_stations_and_stable_ids AS
SELECT
	stops.*,
	stop_stable.ids AS stop_stable_ids,
	stations.stop_id AS station_id,
	stations.stop_name AS station_name,
	stations.stop_loc AS station_loc,
	station_stable.ids AS station_stable_ids
FROM stops
LEFT JOIN (
	SELECT
		stops_stable_ids.stop_id,
		array_agg(stops_stable_ids.stable_id) AS ids
	FROM stops_stable_ids
	GROUP BY stops_stable_ids.stop_id
) stop_stable ON stops.stop_id = stop_stable.stop_id
LEFT JOIN stops stations ON stops.parent_station = stations.stop_id
LEFT JOIN (
	SELECT
		stops_stable_ids.stop_id,
		array_agg(stops_stable_ids.stable_id) AS ids
	FROM stops_stable_ids
	GROUP BY stops_stable_ids.stop_id
) station_stable ON stops.parent_station = station_stable.stop_id
ORDER BY stop_id;

CREATE INDEX ON stops_with_stations_and_stable_ids (stop_id);
CREATE INDEX ON stops_with_stations_and_stable_ids (stop_stable_ids);
CREATE INDEX ON stops_with_stations_and_stable_ids (station_stable_ids);
`

module.exports = {
	query: STOPS_AND_STATIONS,
	beforeAll,
	onRow: onStop,
	afterAll,
}
