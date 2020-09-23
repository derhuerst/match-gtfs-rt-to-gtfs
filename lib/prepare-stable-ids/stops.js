'use strict'

const tokenize = require('tokenize-vbb-station-name')
const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')
const format = require('pg-format')

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
	process.stdout.write(format(`
		INSERT INTO stops_stable_ids (
			stop_id,
			stable_id
		) VALUES %L;
	`, ids.map(id => [stop.id, id])))

	if (stop.station) {
		const ids = getStopIds(stop.station)
		process.stdout.write(format(`
			INSERT INTO stops_stable_ids (
				stop_id,
				stable_id
			) VALUES %L;
		`, ids.map(id => [stop.id, id])))
	}
}

module.exports = {
	query: STOPS_AND_STATIONS,
	onRow: onStop,
}
