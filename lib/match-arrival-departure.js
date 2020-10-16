'use strict'

const findArrDep = require('./find-arrival-departure')

const A = {
	endpointName: 'vbb-hafas',
}
const B = {
	endpointName: 'vbb-gtfs',
}

const mergeDep = createMergeDeparture(A, B)
const matchDeparture = async (fromHafas) => {
	const fromGtfs = await findArrDep('departure', fromHafas)
	if (!fromGtfs) return fromHafas
	return mergeDep(fromHafas, fromGtfs)
}

const mergeArr = createMergeDeparture(A, B)
const matchArrival = async (fromHafas) => {
	const fromGtfs = await findArrDep('arrival', fromHafas)
	if (!fromGtfs) return fromHafas
	return mergeArr(fromHafas, fromGtfs)
}

module.exports = {
	matchDeparture,
	matchArrival,
}
