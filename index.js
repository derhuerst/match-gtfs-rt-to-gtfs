'use strict'

const Redis = require('ioredis')
const {
	matchArrival,
	matchDeparture,
} = require('./lib/match-arrival-departure')

const TTL = 10 * 60 * 1000 // 10m
const NONE = Symbol('no result')

const redis = new Redis()

const getFromCache = async (id) => {
	const encoded = await redis.get(id)
	return encoded ? JSON.parse(encoded) : NONE
}

const addToCache = async (id, val) => {
	const encoded = JSON.stringify(val)
	await redis.set(id, encoded, 'PX', TTL)
}

const cachedMatchArrDep = async (type, matchArrDep, _) => {
	const id = [type, _.tripId, _.stop.id].join('-')
	const fromCache = await getFromCache(id)
	if (fromCache !== NONE) return fromCache

	const match = await matchArrDep(_)
	await addToCache(id, match)
	return match
}

module.exports = {
	matchArrival: cachedMatchArrDep.bind(null, 'arrival', matchArrival),
	matchDeparture: cachedMatchArrDep.bind(null, 'departure', matchDeparture),
}
