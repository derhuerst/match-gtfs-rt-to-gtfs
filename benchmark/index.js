'use strict'

const {pipeline} = require('stream')
const {writable: parallelWritable} = require('parallel-stream')
const {parse} = require('ndjson')
const matchTrip = require('../lib/match-trip')
const db = require('../lib/db')
const redis = require('../lib/redis')

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
		concurrency: 8,
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
				average: vals.reduce((s, x) => s + x, 0) / l,
				median: vals[Math.round((l - 1) / 2)],
				p90: vals[Math.round((l - 1) * .9)],
				p95: vals[Math.round((l - 1) * .95)],
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
