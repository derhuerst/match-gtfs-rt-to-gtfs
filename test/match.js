'use strict'

const {
	ok,
	strictEqual,
	deepStrictEqual,
} = require('assert')
const pick = require('lodash/pick')
const createMatch = require('..')
const gtfsRtInfo = require('./gtfs-rt-info')
const gtfsInfo = require('./gtfs-info')
const redis = require('../lib/redis')
const db = require('../lib/db')

const MATCHED = Symbol.for('match-gtfs-rt-to-gtfs:matched')

const {
	matchStop,
	matchArrival, // matchDeparture,
	matchTrip,
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

	{
		const s1 = await matchStop(fullyMatching)
		strictEqual(s1[MATCHED], true, 'fully matching: MATCHED should be true')
		deepStrictEqual(s1, matched, 'fully matching: matched should be equal')
		await redis.flushdb()
	}

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
	// For the location-based stable IDs, currently
	// - the *station's* name is used,
	// - and the coordinates are snapped/rounded to a grid.
	// Because airport-1 (52.36396/13.5087) & airport-2 (52.36417/13.50878) have the same parent station and are very close, they end up with the same set of location based stable IDs:
	// - `1:international-airport-abc:52.3640:13.5090` (specificity 30)
	// - `1:international-airport-abc:52.3650:13.5090` (specificity 31)
	// - etc.
	// Matching is also possible neither by ID-based stable ID nor by station-ID-based stable ID.
	// todo: change @derhuerst/stable-public-transport-ids to deal with this properly
	ok(!(MATCHED in s3), 'with different ID: MATCHED field should not exist')
	// strictEqual(s3[MATCHED], true, 'with different ID: MATCHED should be true')
	// deepStrictEqual(s3, {
	// 	...matched,
	// 	ids: {
	// 		...matched.ids,
	// 		'gtfs-rt': differentId,
	// 	},
	// }, 'matched via ID: matched should be equal')
	await redis.flushdb()

	{ // different ID, different location, no station -> only same name
		const s4 = await matchStop({
			...fullyMatching,
			id: differentId,
			location: differentLoc,
			station: null,
		})
		// For the name-based stable IDs, currently the *station's* name is used.
		// Because airport-1 *does have* a parent station in the imported GTFS data, whereas it *doesn't have* one here, we end up with different stable IDs.
		// todo: this should work with @derhuerst/stable-public-transport-ids@3
		ok(!(MATCHED in s4), 'with different ID/loc, no station: MATCHED field should not exist')
		// strictEqual(s4[MATCHED], true, 'with different ID/loc, no station: MATCHED should be true')
		// deepStrictEqual(s4, {
		// 	...matched,
		// 	ids: {
		// 		...matched.ids,
		// 		'gtfs-rt': differentId,
		// 	},
		// 	location: differentLoc,
		// }, 'matched via ID: matched should be equal')
		await redis.flushdb()
	}

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
				// Currently, lib/prepare-stable-ids/routes uses slugg(name) as the `id` 🙄
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

		// todo: use gtfsStopSequence instead? (see other todos)
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
	
	// stop/station mismatch
	// todo: Test with a trip that actually visits a sub-stop! As of sample-gtfs-feed@0.10, all trips stop at `airport`.
	{
		const stationAsStop = {
			...fullyMatchingArr,
			tripId: 'b-outbound-on-working-days',
			// Some data sources know about the station's topology including its sub-stops, while others don't.
			// This is how a data source might refer to `airport` as a stop (without parent), while it is a station with sub-stops in sample-gtfs-feed.
			stop: {
				type: 'airport',
				id: 'airport',
				name: 'some different name',
				location: {type: 'location', latitude: 11, longitude: 12}, // different coordinates
				station: null,
			},
			when: '2019-05-29T18:30:00+02:00',
			plannedWhen: '2019-05-29T18:30:00+02:00',
		}
		const s5 = await matchArrival(stationAsStop)
		strictEqual(s5[MATCHED], true, 'station/stop mismatch: MATCHED should be true')
		strictEqual(s5.stopoverIndex, 15, 'station/stop mismatch: .stopoverIndex should match GTFS')
		await redis.flushdb()
	}

	{ // two departures, with different route_shortname/line.name only -> matching by route_stable_id
		// sample-gtfs-feed@0.10 contains *two* trips stopping at `center` between 2019-05-29T15:35+02:00 and 2019-05-29T15:36+02:00:
		// > ```
		// > trip_id,arrival_time,departure_time,stop_id,stop_sequence,timepoint,pickup_type,drop_off_type
		// > a-downtown-all-day,15:35:00,15:36:00,center,5,,,
		// > c-downtown-all-day,15:33:00,15:35:00,center,1,,,
		// > ```
		const byRouteStableId = {
			tripId: 'some non-matching trip ID',
			// directionId: '0',
			line: {
				// Currently, lib/prepare-stable-ids/routes uses slugg(name) as the `id` 🙄
				// id: 'ada',
				// name: 'some non-matching LiNe',
				id: 'some non-matching line ID',
				name: 'Ada',
				mode: 'bus',
				// no operator
			},
			stop: {
				type: 'stop',
				id: 'center',
				name: 'some non-matching sToP',
				location: {type: 'location', latitude: 11, longitude: 12},
				// no parent station
			},
			when: '2019-05-29T15:36:20+02:00',
			plannedWhen: '2019-05-29T15:35:30+02:00',
			delay: 50,
			platform: null, plannedPlatform: null,
		}
		const s6 = await matchArrival(byRouteStableId)
		strictEqual(s6[MATCHED], true, 'station/stop mismatch: MATCHED should be true')
		strictEqual(s6.tripIds.gtfs, 'a-downtown-all-day', 'station/stop mismatch: .tripId should match GTFS')
		await redis.flushdb()
	}

	// todo: ambiguous: two matches with equal stable ID specificity & no direction/headsign
	// todo: test matchDeparture()
	console.info('matchArrival() seems to be working ✔︎')
}

const testMatchTrip = async () => {
	const stopoverA1 = {
		arrival: '2019-05-29T13:15:20+02:00',
		plannedArrival: '2019-05-29T13:13:00+02:00',
		arrivalDelay: 200,
		departure: '2019-05-29T13:15:40+02:00',
		plannedDeparture: '2019-05-29T13:14:00+02:00',
		departureDelay: 100,
		stop: {
			type: 'stop',
			id: 'airport',
			name: 'International aIrPoRt (abc)', // doesn't match exactly
			// doesn't match exactly
			location: {type: 'location', latitude: 52.366, longitude: 13.512},
		},
	}
	const stopoverA5 = {
		arrival: '2019-05-29T13:31:01+02:00',
		plannedArrival: '2019-05-29T13:30:00+02:00',
		arrivalDelay: 61,
		departure: '2019-05-29T13:31:12+02:00',
		plannedDeparture: '2019-05-29T13:31:00+02:00',
		departureDelay: 12,
		stop: {
			type: 'stop',
			id: 'center',
			name: 'City Center',
			location: {type: 'location', latitude: 52.5, longitude: 13.5},
		},
	}
	const tripA = {
		id: 'b-downtown-on-working-days',
		directionId: '0',
		directionIds: {
			gtfs: '0',
		},
		line: {
			id: 'B',
			name: 'Babbage',
			mode: 'train',
			operator: {id: 'FTA'},
		},

		...pick(stopoverA1, [
			'departure', 'plannedDeparture', 'departureDelay',
		]),
		...pick(stopoverA5, [
			'arrival', 'plannedArrival', 'arrivalDelay',
		]),

		// in the GTFS, b-downtown-on-working-days has the following stop_times:
		// - stop_seq: 1, arr_time: 13:13:00, dep_time: 13:14:00, stop_id: airport
		// - stop_seq: 3, arr_time: 13:20:00, dep_time: 13:22:00, stop_id: lake, pickup_type: 3
		// - stop_seq: 5, arr_time: 13:30:00, dep_time: 13:31:00, stop_id: center
		// so we just match the 1st & 3rd stopover/stop_time
		stopovers: [stopoverA1, stopoverA5],
	}

	const actualTrip = await matchTrip(tripA)
	strictEqual(actualTrip[MATCHED], true, 'MATCHED should be true')

	strictEqual(
		// todo: use gtfsStopSequence instead? (see other todos)
		actualTrip.stopovers[0].stopoverIndex,
		1,
		'stopovers[0].stopoverIndex should match GTFS stop_sequence',
	)
	strictEqual(
		// todo: use gtfsStopSequence instead? (see other todos)
		actualTrip.stopovers[actualTrip.stopovers.length - 1].stopoverIndex,
		5,
		'last(stopovers).stopoverIndex should match GTFS stop_sequence',
	)

	await redis.flushdb()
	console.info('matchTrip() seems to be working ✔︎')
}

;(async () => {
	await redis.flushdb()

	await testMatchStop()
	await testMatchArrDep()
	await testMatchTrip()
	// todo

	redis.quit()
	await db.end()
})()
