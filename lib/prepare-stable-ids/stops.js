'use strict'

const readStops = require('gtfs-utils/read-stops')
const stableIds = require('../stable-stop-ids')
const redis = require('../redis')

// https://gtfs.org/reference/static/#stopstxt
// Type of the location:
// • 0 (or blank): Stop (or Platform). A location where passengers board or disembark from a transit vehicle. Is called a platform when defined within a parent_station.
const STOP_OR_PLATFORM = '0'
// • 1: Station. A physical structure or area that contains one or more platform.
const STATION = '1'

const prepareStableStopIds = async (readFile) => {
	const stops = await readStops(readFile)
	for await (const s of stops.values()) {
		if (!s.stop_id) {
			// todo: log this
			continue
		}
		if (
			s.location_type &&
			s.location_type !== STOP_OR_PLATFORM &&
			s.location_type !== STATION
		) continue

		const stop = {
			type: s.location_type === STATION ? 'station' : 'stop',
			id: s.stop_id,
			name: s.stop_name,
			location: {
				latitude: parseFloat(s.stop_lat),
				longitude: parseFloat(s.stop_lon),
			},
			station: s.parent_station ? {
				id: s.parent_station,
			} : null,
		}
		const ids = stableIds(stop)

		await Promise.all(ids.map(async (stableId) => {
			await redis.set(stableId, s.stop_id)
		}))
	}
}

module.exports = prepareStableStopIds
