// todo: use import assertions once they're supported by Node.js & ESLint
// https://github.com/tc39/proposal-import-assertions
import {createRequire} from 'node:module'
const require = createRequire(import.meta.url)

import createDebug from 'debug'
import {performance} from 'node:perf_hooks'
import {redis} from './redis.js'
const pkg = require('../package.json')

const debug = createDebug('match-gtfs-rt-to-gtfs:caching')

const NO_CACHING = process.env.MATCH_GTFS_RT_TO_GTFS_CACHING === 'false'

const PREFIX = pkg[pkg.name].dataVersion + ':'

const TTL = 5 * 60 * 60 * 1000 // 5h

const CACHED = Symbol.for('match-gtfs-rt-to-gtfs:cached')

const withCaching = (fn, getId) => {
	if (NO_CACHING) return fn

	const cached = async (...args) => {
		const id = getId(...args)
		if (id === null) {
			debug('ignoring cache because cache ID is null', ...args)
			return fresh
		}

		const t0 = performance.now()
		const fromCache = await redis.get(PREFIX + id)
		debug(id, 'checking cache took', Math.round(performance.now() - t0), 'from cache?', !!fromCache)
		if (fromCache) {
			const stale = JSON.parse(fromCache)
			Object.defineProperty(stale || {}, CACHED, {value: true})
			return stale
		}

		const t1 = performance.now()
		const fresh = await fn(...args)
		debug(id, 'fetching fresh took', Math.round(performance.now() - t1))

		// todo: ignore errors
		await redis.set(PREFIX + id, JSON.stringify(fresh), 'PX', TTL)

		return fresh
	}
	return cached
}

const copyCachedFlag = (src, target) => {
	if (CACHED in src) {
		Object.defineProperty(target, CACHED, {value: src[CACHED]})
	}
	return target
}

export {
	CACHED,
	withCaching,
	copyCachedFlag,
}
