'use strict'

const getStableStopIds = require('../stable-stop-ids')
const csv = require('../csv')

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

	const ids = getStableStopIds(stop)
	for (const id of ids) {
		process.stdout.write(csv([stop.id, id]))
	}

	if (stop.station) {
		const ids = getStableStopIds(stop.station)
		for (const id of ids) {
			process.stdout.write(csv([stop.id, id]))
		}
	}
}

const afterAll = `\
\\.

CREATE VIEW stops_with_stations_and_stable_ids AS
SELECT
	stops.*,
	stable.stable_id,
	stations.stop_id AS station_id,
	stations.stop_code AS station_code,
	stations.stop_name AS station_name,
	stations.stop_desc AS station_desc,
	stations.stop_loc AS station_loc,
	stations.zone_id AS station_zone_id,
	stations.stop_url AS station_url,
	stations.stop_timezone AS station_timezone,
	stations.wheelchair_boarding AS station_wheelchair_boarding,
	stations.level_id AS station_level_id,
	stations.platform_code AS station_platform_code
FROM stops
LEFT JOIN stops stations ON stops.parent_station = stations.stop_id
LEFT JOIN stops_stable_ids stable ON stops.stop_id = stable.stop_id
-- those with a parent_station first
-- todo: make more explicit, use location_type?
ORDER BY stops.parent_station;
`

module.exports = {
	query: STOPS_AND_STATIONS,
	beforeAll,
	onRow: onStop,
	afterAll,
}
