'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const normalizeStopName = require('./normalize-stop-name')
const findTrip = require('./find-trip')

const A = {
	endpointName: 'hvv-hafas',
	normalizeStopName,
}
const B = {
	endpointName: 'gtfs',
	normalizeStopName,
}
const mergeLeg = createMergeLeg(A, B)

const matchTrip = async (fromHafas) => {
	const fromGtfs = await findTrip(fromHafas)
	if (!fromGtfs) return fromHafas

	const merged = mergeLeg({
		...fromHafas,
		tripId: fromHafas.id,
	}, {
		...fromGtfs,
		tripId: fromGtfs.id,
	})

	return {
		...omit(merged, ['tripId', 'tripIds', 'ids']),
		ids: merged.tripIds,

		// Currently, find-hafas-data-in-another-hafas/merge-* does not support
		// specifying the precedence, so we have to override it here.
		// see find-hafas-data-in-another-hafas#2

		id: fromGtfs.id,
		routeId: fromGtfs.routeId,
		line: {
			...merged.line,
			id: fromGtfs.line.id,
		},

		origin: {
			...merged.origin,
			id: fromGtfs.origin.id,
			station: merged.origin.station && fromGtfs.origin.station ? {
				...merged.origin.station,
				id: fromGtfs.origin.station.id,
			} : null,
		},
		destination: {
			...merged.destination,
			id: fromGtfs.destination.id,
			station: merged.destination.station && fromGtfs.destination.station ? {
				...merged.destination.station,
				id: fromGtfs.destination.station.id,
			} : null,
		},
	}
}

module.exports = matchTrip
