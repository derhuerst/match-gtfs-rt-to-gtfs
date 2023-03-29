'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('../example/util')
const {pipeline} = require('stream')
const {writable: parallelWritable} = require('parallel-stream')
const {cpus: osCpus} = require('os')
const {parse} = require('ndjson')
const createMatchTrip = require('../lib/match-trip')
const db = require('../lib/db')
const redis = require('../lib/redis')

// todo: make configurable, like in build-index.js
const gtfsRtInfo = {
	endpointName: 'vbb-hafas',
	normalizeStopName,
	normalizeLineName,
}
const gtfsInfo = {
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
}
const matchTrip = createMatchTrip(gtfsRtInfo, gtfsInfo)

const times = []
const matchedTimes = []
const unmatchedTimes = []

const processTrip = (trip, _, cb) => {
	const t0 = Date.now()
	matchTrip(trip)
	.then((trip) => {
		const t = Date.now() - t0
		times.push(t)
		const isMatched = !!(trip.ids && trip.ids.gtfs)
		;(isMatched ? matchedTimes : unmatchedTimes).push(t)

		// console.error(isMatched ? 'matched' : 'not matched', 'in', t, 'ms')
		cb(null)
	})
	.catch(cb)
}

pipeline(
	process.stdin,
	parse(),
	parallelWritable(processTrip, {
		objectMode: true,
		concurrency: process.env.MATCH_CONCURRENCY
			? parseInt(process.env.MATCH_CONCURRENCY)
			: osCpus().length,
	}),
	(err) => {
		if (err) {
			console.error(err)
			process.exit(1)
		}

		const stats = (vals) => {
			vals = Array.from(vals)
			vals.sort()
			const l = vals.length
			return {
				count: l,
				sum: vals.reduce((s, x) => s + x, 0),
				average: l > 0 ? vals.reduce((s, x) => s + x, 0) / l : null,
				median: l > 0 ? vals[Math.round((l - 1) / 2)] : null,
				p90: l > 0 ? vals[Math.round((l - 1) * .9)] : null,
				p95: l > 0 ? vals[Math.round((l - 1) * .95)] : null,
			}
		}
		console.log({
			all: stats(times),
			matched: stats(matchedTimes),
			unmatched: stats(unmatchedTimes),
		})

		db.end()
		redis.quit()
	},
)
