'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const normalizeStopName = require('./normalize-stop-name')
const findTrip = require('./find-trip')

const A = {
	endpointName: 'vbb-hafas',
	normalizeStopName,
}
const B = {
	endpointName: 'vbb-gtfs',
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
		id: merged.tripId,
		ids: merged.tripIds,
		...omit(merged, ['tripId', 'tripIds']),
	}
}

module.exports = matchTrip
