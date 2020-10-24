'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const normalizeStopName = require('./normalize-stop-name')
const findMovement = require('./find-movement')

const A = {
	endpointName: 'vbb-hafas',
	normalizeStopName,
}
const B = {
	endpointName: 'gtfs',
	normalizeStopName,
}
const mergeLeg = createMergeLeg(A, B)

const matchMovement = async (fromHafas) => {
	const fromGtfs = await findMovement(fromHafas)
	if (!fromGtfs) return fromHafas

	const origin = {id: 'foo', name: 'Foo', location: {latitude: 1, longitude: 2}}
	const destination = {id: 'bar', name: 'Bar', location: {latitude: 2, longitude: 1}}
	const merged = mergeLeg({
		...omit(fromHafas, ['nextStopovers']),
		origin, destination,
		stopovers: fromHafas.nextStopovers,
	}, {
		...omit(fromGtfs, ['nextStopovers']),
		origin, destination,
		stopovers: fromGtfs.nextStopovers,
	})

	return {
		...omit(merged, [
			'origin',
			'departure', 'plannedDeparture', 'departureDelay',
			'departurePlatform', 'plannedDeparturePlatform',
			'destination',
			'arrival', 'plannedArrival', 'arrivalDelay',
			'arrivalPlatform', 'plannedArrivalPlatform',
			'stopovers',
		]),
		nextStopovers: merged.stopovers,

		// Currently, find-hafas-data-in-another-hafas/merge-* does not support
		// specifying the precedence, so we have to override it here.
		// see find-hafas-data-in-another-hafas#2
		tripId: fromGtfs.tripId,
		routeId: fromGtfs.routeId,
	}
}

module.exports = matchMovement
