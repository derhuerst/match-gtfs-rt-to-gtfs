'use strict'

const {strictEqual} = require('node:assert')
const createMatch = require('../..')
const gtfsRtInfo = require('../gtfs-rt-info')
const gtfsInfo = require('../gtfs-info')
const {MATCHED} = require('../../lib/matched')
const redis = require('../../lib/redis')
const db = require('../../lib/db')

const {
	matchDeparture,
} = createMatch(gtfsRtInfo, gtfsInfo)

const twoTripsSameTimeSameStopSameLine = async () => {
	const dep0 = {
		tripId: 'doesnt-match',
		// make sure the direction field is normalized
		direction: 'S+U FrIeDrIcHsTr.     BhF (BeRlIn)',
		line: {
			// S1 replacement service
			id: 'doesnt-match-either',
			name: 'S1A',
			mode: 'bus',
			operator: {id: 'whatever'},
		},
		stop: {
			type: 'stop',
			id: 'also-doesnt-match',
			name: 'S+U Friedrichstr. Bhf (Berlin)',
			location: {
				type: 'location',
				latitude: 52.520531 + .0001,
				longitude: 13.3873 + .0001,
			},
			station: null,
		},
		when: '2024-01-07T15:24+01:00',
		plannedWhen: '2024-01-07T15:24+01:00',
		delay: null,
		platform: null, plannedPlatform: null,
	}
	const res0 = await matchDeparture(dep0)
	strictEqual(res0[MATCHED], true, 'MATCHED should be true')
}

;(async () => {
	await redis.flushdb()

	await twoTripsSameTimeSameStopSameLine()

	await redis.flushdb()
	redis.quit()
	await db.end()
})()

