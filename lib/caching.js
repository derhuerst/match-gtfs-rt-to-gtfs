'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:caching')
const redis = require('./redis')

const TTL = 10 * 60 * 1000 // 10m

const withCaching = (fn, getId) => {
	const cached = async (...args) => {
		const id = getId(...args)

		const t0 = Date.now()
		const fromCache = await redis.get(id)
		debug('checking cache took', Date.now() - t0)
		if (fromCache) return JSON.parse(fromCache)

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

module.exports = withCaching
