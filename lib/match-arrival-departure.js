'use strict'

const {createMergeDeparture} = require('find-hafas-data-in-another-hafas/merge-arr-dep')
const findArrDep = require('./find-arrival-departure')

const A = {
	endpointName: 'vbb-hafas',
}
const B = {
	endpointName: 'vbb-gtfs',
}

const createMatchArrDep = (type, merge) => async (fromHafas) => {
	const fromGtfs = await findArrDep(type, fromHafas)
	if (!fromGtfs) return fromHafas

	const merged = merge(fromHafas, fromGtfs)
	return {
		...merged,

		routeId: fromGtfs.routeId,
	}
}

const mergeDep = createMergeDeparture(A, B)
const matchDeparture = createMatchArrDep('departure', mergeDep)

const mergeArr = createMergeDeparture(A, B)
const matchArrival = createMatchArrDep('arrival', mergeArr)

module.exports = {
	matchDeparture,
	matchArrival,
}
