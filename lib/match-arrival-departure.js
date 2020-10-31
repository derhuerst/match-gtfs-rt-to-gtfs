'use strict'

const {
	createMergeDeparture,
	createMergeArrival,
} = require('find-hafas-data-in-another-hafas/merge-arr-dep')
const findArrDep = require('./find-arrival-departure')

const A = {
	endpointName: 'hvv-hafas',
}
const B = {
	endpointName: 'gtfs',
}

const createMatchArrDep = (type, merge) => async (fromHafas) => {
	const fromGtfs = await findArrDep(type, fromHafas)
	if (!fromGtfs) return fromHafas

	const merged = merge(fromHafas, fromGtfs)
	return {
		...merged,

		tripId: fromGtfs.tripId,
		routeId: fromGtfs.routeId,
		line: {
			...merged.line,
			id: fromGtfs.line.id,
		},

		// Currently, find-hafas-data-in-another-hafas/merge-* does not support
		// specifying the precedence, so we have to override it here.
		// see find-hafas-data-in-another-hafas#2
		stop: {
			...merged.stop,
			id: fromGtfs.stop.id,
			station: merged.stop.station && fromGtfs.stop.station ? {
				...merged.stop.station,
				id: fromGtfs.stop.station.id,
			} : null,
		},
	}
}

const mergeDep = createMergeDeparture(A, B)
const matchDeparture = createMatchArrDep('departure', mergeDep)

const mergeArr = createMergeArrival(A, B)
const matchArrival = createMatchArrDep('arrival', mergeArr)

module.exports = {
	matchDeparture,
	matchArrival,
}
