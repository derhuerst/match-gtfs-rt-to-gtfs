'use strict'

const Redis = require('ioredis')
const matchStop = require('./lib/match-stop')
const {
	matchArrival,
	matchDeparture,
} = require('./lib/match-arrival-departure')
const matchTrip = require('./lib/match-trip')

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

const cachedMatchStop = async (_) => {
	const fromCache = await getFromCache(_.id)
	if (fromCache !== NONE) return fromCache

	const match = await matchStop(_)
	await addToCache(_.id, match)
	return match
}

const cachedMatchArrDep = async (type, matchArrDep, _) => {
	const id = [type, _.tripId, _.stop.id].join('-')
	const fromCache = await getFromCache(id)
	if (fromCache !== NONE) return fromCache

	const match = await matchArrDep(_)
	await addToCache(id, match)
	return match
}

const cachedMatchTrip = async (_) => {
	const fromCache = await getFromCache(_.id)
	if (fromCache !== NONE) return fromCache

	const match = await matchTrip(_)
	await addToCache(_.id, match)
	return match
}

module.exports = {
	matchStop: cachedMatchStop,
	matchArrival: cachedMatchArrDep.bind(null, 'arrival', matchArrival),
	matchDeparture: cachedMatchArrDep.bind(null, 'departure', matchDeparture),
	matchTrip: cachedMatchTrip,
}
