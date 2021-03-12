'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:caching')
const redis = require('./redis')

const TTL = 5 * 60 * 60 * 1000 // 5h

const CACHED = Symbol.for('match-gtfs-rt-to-gtfs:cached')

const withCaching = (fn, getId) => {
	const cached = async (...args) => {
		const id = getId(...args)

		const t0 = Date.now()
		const fromCache = await redis.get(id)
		debug('checking cache took', Date.now() - t0, 'from cache?', !!fromCache)
		if (fromCache) {
			const stale = JSON.parse(fromCache)
			Object.defineProperty(stale || {}, CACHED, {value: true})
			return stale
		}

		const t1 = Date.now()
		const fresh = await fn(...args)
		debug(id, 'fresh took', Date.now() - t1)

		const t2 = Date.now()
		// todo: ignore errors
		await redis.set(id, JSON.stringify(fresh), 'PX', TTL)
		debug('writing to the cache took', Date.now() - t2)

		return fresh
	}
	return cached
}

withCaching.CACHED = CACHED
module.exports = withCaching
