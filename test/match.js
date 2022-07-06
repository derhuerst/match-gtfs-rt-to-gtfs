'use strict'

const {
	strictEqual,
	deepStrictEqual,
} = require('assert')
const {isatty} = require('tty')
const {inspect} = require('util')
const pick = require('lodash/pick')
const createMatch = require('..')
const gtfsRtInfo = require('./gtfs-rt-info')
const gtfsInfo = require('./gtfs-info')
const redis = require('../lib/redis')

const MATCHED = Symbol.for('match-gtfs-rt-to-gtfs:matched')

const {
	matchStop,
	matchArrival, // matchDeparture,
	// matchTrip,
} = createMatch(gtfsRtInfo, gtfsInfo)

const testMatchStop = async () => {
	const fullyMatching = {
		type: 'stop',
		id: 'airport-1',
		name: 'Platform 1',
		station: {
			type: 'station',
			id: 'airport',
			name: 'International Airport (ABC)',
			location: {type: 'location', latitude: 52.365, longitude: 13.511},
		},
		location: {type: 'location', latitude: 52.36396, longitude: 13.5087},
	}
	const matched = {
		...fullyMatching,
		ids: {
			gtfs: 'airport-1',
			'gtfs-rt': fullyMatching.id,
		},
		station: {
			...fullyMatching.station,
			ids: {
				gtfs: 'airport',
				'gtfs-rt': fullyMatching.station.id,
			},
		},
	}

	const s1 = await matchStop(fullyMatching)
	strictEqual(s1[MATCHED], true, 'fully matching: MATCHED should be true')
	deepStrictEqual(s1, matched, 'fully matching: matched should be equal')
	await redis.flushdb()

	const differentLoc = {
		type: 'location',
		latitude: fullyMatching.location.latitude + 1,
		longitude: fullyMatching.location.longitude - 1,
	}
	const s2 = await matchStop({
		...fullyMatching,
		location: differentLoc,
	})
	strictEqual(s2[MATCHED], true, 'matched via ID: MATCHED should be true')
	deepStrictEqual(s2, {
		...matched,
		location: differentLoc,
	}, 'matched via ID: matched should be equal')
	await redis.flushdb()

	const differentId = 'foo'
	const s3 = await matchStop({
		...fullyMatching,
		id: differentId,
	})
	strictEqual(s3[MATCHED], true, 'matched via ID: MATCHED should be true')
	deepStrictEqual(s3, {
		...matched,
		ids: {
			...matched.ids,
			'gtfs-rt': differentId,
		},
	}, 'matched via ID: matched should be equal')
	await redis.flushdb()

	// `lake` was missing because `WHERE location_type != 'node'` excludes `NULL` rows
	const lake = await matchStop({
		id: 'lake',
		name: 'Lake',
		location: {type: 'location', latitude: 52, longitude: 13},
	})
	strictEqual(lake[MATCHED], true, 'lake: MATCHED should be true')
	deepStrictEqual(lake, {
		type: null,
		id: 'lake',
		ids: {gtfs: 'lake', 'gtfs-rt': 'lake'},
		name: 'Lake',
		location: {type: 'location', latitude: 52, longitude: 13},
		station: null,
	}, 'lake: matched should be equal')
	await redis.flushdb()

	console.info('matchStop() seems to be working ✔︎')
}

const testMatchArrDep = async () => {
	const _fullyMatchingStopover = {
		tripId: 'b-downtown-on-working-days',
		directionId: '0',
		directionIds: {
			gtfs: '0',
		},
		line: {
			id: 'B',
			name: 'Babbage', // todo: what about route_long_name "Charles Babbage Tram Line"?
			mode: 'train',
			operator: {
				// Currently, lib/prepare-stable-ids/routes slugg(name) as the `id` 🙄
				// id: 'FTA',
				// name: 'Full Transit Agency',
				id: 'full-transit-agency',
			},
		},
		stop: {
			type: 'stop',
			id: 'lake',
			name: 'Lake',
			location: {type: 'location', latitude: 52, longitude: 13},
			station: null,
		},
	}
	const fullyMatchingArr = {
		..._fullyMatchingStopover,
		when: '2019-05-29T13:20:00+02:00',
		plannedWhen: '2019-05-29T13:20:00+02:00',
		delay: 0,
		platform: null, plannedPlatform: null,
	}

	const _matched = {
		..._fullyMatchingStopover,
		tripIds: {
			gtfs: _fullyMatchingStopover.tripId,
			'gtfs-rt': _fullyMatchingStopover.tripId,
		},
		direction: 'Babbage (Downtown)',
		routeId: 'B',
		line: {
			id: 'B',
			name: 'Babbage',
			mode: 'train',
			operator: {id: 'full-transit-agency'},
			fahrtNrs: {gtfs: 'Babbage'}, // todo: get rid of this field or make it correct
		},

		stopoverIndex: 3,
		stop: {
			..._fullyMatchingStopover.stop,
			ids: {
				gtfs: _fullyMatchingStopover.stop.id,
				'gtfs-rt': _fullyMatchingStopover.stop.id,
			},
			station: null,
		},
		remarks: [],
	}
	const matchedArr = {
		..._matched,
		...pick(fullyMatchingArr, [
			'when', 'plannedWhen', 'delay',
			'platform', 'plannedPlatform',
		]),
	}

	const a1 = await matchArrival(fullyMatchingArr)
	strictEqual(a1[MATCHED], true, 'fully matching arrival: MATCHED should be true')
	deepStrictEqual(a1, matchedArr, 'fully matching arrival: matchedArr should be equal')
	await redis.flushdb()

	const delayed = {
		...fullyMatchingArr,
		when: '2019-05-29T13:28:00+02:00',
		delay: 8 * 60,
	}
	const s2 = await matchArrival(delayed)
	strictEqual(s2[MATCHED], true, 'delayed arrival: MATCHED should be true')
	deepStrictEqual(s2, {
		...matchedArr,
		when: '2019-05-29T13:28:00+02:00',
		delay: 8 * 60,
	}, 'delayed arrival: matched should be equal')
	await redis.flushdb()

	const differentLoc = {
		type: 'location',
		latitude: fullyMatchingArr.stop.location.latitude + 1,
		longitude: fullyMatchingArr.stop.location.longitude - 1,
	}
	const s3 = await matchArrival({
		...fullyMatchingArr,
		stop: {...fullyMatchingArr.stop, location: differentLoc},
	})
	strictEqual(s3[MATCHED], true, 'matched arrival via ID: MATCHED should be true')
	deepStrictEqual(s3, {
		...matchedArr,
		stop: {...matchedArr.stop, location: differentLoc},
	}, 'matched arrival via ID: matched should be equal')
	await redis.flushdb()

	const fuzzy = {
		...fullyMatchingArr,
		tripId: 'some-other-trip-id',
		line: {
			...fullyMatchingArr.line,
			id: 'some-other-line-id',
			operator: null,
		},
		stop: {
			...fullyMatchingArr.stop,
			id: 'some-other-stop-id'
		},
	}
	const s4 = await matchArrival(fuzzy)
	strictEqual(s4[MATCHED], true, 'fuzzy-matched arrival: MATCHED should be true')
	deepStrictEqual(s4, {
		...matchedArr,
		tripIds: {
			...matchedArr.tripIds,
			'gtfs-rt': fuzzy.tripId,
		},
		line: {
			...matchedArr.line,
			id: fuzzy.line.id, // todo: prefer GTFS line IDs
			// todo: `ids: {'gtfs-rt': fuzzy.line.id, gtfs: 'B'}`
			operator: null,
		},
		stop: {
			...matchedArr.stop,
			ids: {'gtfs-rt': fuzzy.stop.id, gtfs: 'lake'},
		},
	}, 'fuzzy-matched arrival: matched should be equal')
	await redis.flushdb()

	// todo: test matchDeparture()
	console.info('matchArrival() seems to be working ✔︎')
}

;(async () => {
	await redis.flushdb()

	await testMatchStop()
	await testMatchArrDep()
	// todo

	redis.quit()
})()
