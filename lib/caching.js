'use strict'

const Redis = require('ioredis')

const TTL = 10 * 60 * 1000 // 10m

const redis = new Redis()

const withCaching = (fn, getId) => {
	const cached = async (...args) => {
		const id = getId(...args)
		const fromCache = await redis.get(id)
		if (fromCache) return JSON.parse(fromCache)

		const fresh = await fn(...args)
		// todo: ignore errors
		await redis.set(id, JSON.stringify(fresh), 'PX', TTL)

		return fresh
	}
	return cached
}

module.exports = withCaching
