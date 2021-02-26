#!/usr/bin/env node
'use strict'

const {inspect} = require('util')
const gtfsRtInfo = require('./gtfs-rt-info')
const gtfsInfo = require('./gtfs-info')
const createMatchStop = require('../lib/match-stop')
const {
	createMatchDeparture, createMatchArrival,
} = require('../lib/match-arrival-departure')
const createMatchTrip = require('../lib/match-trip')
const createMatchMovement = require('../lib/match-movement')
const MATCHED = require('../lib/matched')

;(async () => {
	const mode = process.argv[2]
	let match
	if (mode === 'stop') {
		match = createMatchStop(gtfsRtInfo, gtfsInfo)
	} else if (mode === 'departure') {
		match = createMatchDeparture(gtfsRtInfo, gtfsInfo)
	} else if (mode === 'arrival') {
		match = createMatchArrival(gtfsRtInfo, gtfsInfo)
	} else if (mode === 'trip') {
		match = createMatchTrip(gtfsRtInfo, gtfsInfo)
	} else if (mode === 'movement') {
		match = createMatchMovement(gtfsRtInfo, gtfsInfo)
		match.trip = match.trip // make field enumerable
	} else {
		throw new Error('missing/invalid mode')
	}

	let unmatched = ''
	for await (const chunk of process.stdin) unmatched += chunk
	unmatched = JSON.parse(unmatched)

	const matched = await match(unmatched)
	console.log(inspect(matched, {depth: null, colors: true}))

	process.exit(matched[MATCHED] ? 0 : 2)
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
