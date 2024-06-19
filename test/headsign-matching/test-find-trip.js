'use strict'

const {
	ok,
	strictEqual,
} = require('node:assert')
const createMatch = require('../..')
const gtfsRtInfo = require('../gtfs-rt-info')
const gtfsInfo = require('../gtfs-info')
const {MATCHED} = require('../../lib/matched')
const redis = require('../../lib/redis')
const db = require('../../lib/db')

const {
	matchTrip,
} = createMatch(gtfsRtInfo, gtfsInfo)

const trip1 = {
	id: 'doesnt-match',
	// make sure the direction field is normalized
	direction: 'S+U FrIeDrIcHsTr.     BhF (BeRlIn)',
	line: {
		// S1 replacement service
		id: 'doesnt-match-either',
		name: 'S1A',
		mode: 'bus',
		operator: {id: 'whatever'},
	},
	// Our test dataset only contains *one* location & point in time with two trips
	// - from the same route (S1A)
	// - with the same mode of transport (bus)
	// - stopping a the same stop name & location (S+U Friedrichstraße, ~52.5205/~13.3883)
	// - at the same time (2024-01-07T15:24:00+01:00).
	// In order to test if headsign-based matching works, we have make up a trip that provokes this ambiguity, so we
	// - make the Friedrichstraße stopover the 0th, and
	// - add a bogus 1st stopover at Yorckstraße, just to match the expectation that a trip has >1 stopover.
	stopovers: [
		{ // ambiguous with another trip heading towards Südkreuz
			stop: {
				id: 'de:11000:900100001::6',
				name: 'S+U Friedrichstr. Bhf (Berlin)',
				location: {
					type: 'location',
					// https://github.com/derhuerst/stable-public-transport-ids/blob/2.1.0/stop.js#L16-L28
					latitude: 52.520531 + .001,
					longitude: 13.38833 + .001,
				},
			},
			plannedArrival: '2024-01-07T15:24:00+01:00',
			arrival: '2024-01-07T15:24:00+01:00',
			arrivalDelay: 0,
			plannedDeparture: '2024-01-07T15:24:00+01:00',
			departure: '2024-01-07T15:24:00+01:00',
			departureDelay: 0,
		},
		{ // bogus stopover
			stop: {
				id: 'de:11000:900057103::3',
				name: 'S+U Yorckstr. (Berlin)',
				location: {
					type: 'location',
					// https://github.com/derhuerst/stable-public-transport-ids/blob/2.1.0/stop.js#L16-L28
					latitude: 52.49283 + .001,
					longitude: 13.3698 + .001,
				},
			},
			plannedArrival: '2024-01-07T15:29:00+01:00',
			arrival: '2024-01-07T15:29:00+01:00',
			arrivalDelay: 0,
			plannedDeparture: null,
			departure: null,
			departureDelay: null,
		},
	],
}

const twoTripsSameTimeSameStopSameLine = async () => {
	{
		const res0 = await matchTrip({
			...trip1,
			direction: 'something not matching trip_headsign',
		})
		ok(res0[MATCHED] !== true, 'MATCHED should not be true')
		await redis.flushdb()
	}

	{
		const res1 = await matchTrip(trip1)
		strictEqual(res1[MATCHED], true, 'MATCHED should be true')
		await redis.flushdb()
	}
}

;(async () => {
	await redis.flushdb()

	await twoTripsSameTimeSameStopSameLine()

	await redis.flushdb()
	redis.quit()
	await db.end()
})()

