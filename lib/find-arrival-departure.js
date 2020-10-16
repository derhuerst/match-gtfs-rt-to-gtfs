'use strict'

const getStableStopIds = require('./stable-stop-ids')
const getStableRouteIds = require('./stable-route-ids')
const redis = require('./redis')

const findByIds = async (prefix, ids) => {
	if (ids.length === 0) return null

	let q = redis.multi()
	for (let i = 0; i < ids.length; i++) {
		q = q.get(prefix + ids[i])
	}

	const res = await q.exec()
	for (let i = 0; i < res.length; i++) {
		if (res[i][0]) throw res[i][0]
	}
	for (let i = 0; i < res.length; i++) {
		if (res[i][1]) return res[i][1]
	}
	return null
}

const findArrDep = async (type, _) => {
	const stopStableIds = getStableStopIds(_.stop)
	const stationStableIds = _.stop.station
		? getStableStopIds(_.stop.station)
		: []

	// gtfs term: "route"
	// fptf term: "line"
	const lineStableIds = getStableRouteIds(_.line)

	const [
		gtfsStopId,
		gtfsStationId,
		gtfsLineId,
	] = await Promise.all([
		findByIds('s:', stopStableIds),
		findByIds('s:', stationStableIds),
		findByIds('r:', lineStableIds),
	])
	return {
		gtfsStopId,
		gtfsStationId,
		gtfsLineId,
	}
}

module.exports = findArrDep
