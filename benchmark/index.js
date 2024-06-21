import {performance} from 'node:perf_hooks'
import {pipeline} from 'node:stream/promises'
import {writable as parallelWritable} from 'parallel-stream'
import {cpus as osCpus} from 'node:os'
import {parse} from 'ndjson'
import {createMatchTrip} from '../lib/match-trip.js'
import {db} from '../lib/db.js'
import {redis} from '../lib/redis.js'

import gtfsRtInfo from './gtfs-rt-info.js'
import gtfsInfo from './gtfs-info.js'

const matchTrip = createMatchTrip(gtfsRtInfo, gtfsInfo)

const times = []
const matchedTimes = []
const unmatchedTimes = []

const processTrip = (trip, _, cb) => {
	const t0 = performance.now()
	matchTrip(trip)
	.then((trip) => {
		const t = performance.now() - t0
		times.push(t)
		const isMatched = !!(trip.ids && trip.ids.gtfs)
		;(isMatched ? matchedTimes : unmatchedTimes).push(t)

		// console.error(isMatched ? 'matched' : 'not matched', 'in', t, 'ms')
		cb(null)
	})
	.catch(cb)
}

await pipeline(
	process.stdin,
	parse(),
	parallelWritable(processTrip, {
		objectMode: true,
		concurrency: process.env.MATCH_CONCURRENCY
			? parseInt(process.env.MATCH_CONCURRENCY)
			: osCpus().length + 2,
	}),
)
	
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
