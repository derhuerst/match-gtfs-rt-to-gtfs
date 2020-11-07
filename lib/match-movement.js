'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const createFindMovement = require('./find-movement')

const createMatchMovement = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findMovement = createFindMovement(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findMovement(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt
	console.error('fromGtfs', fromGtfs)

	const origin = {id: 'foo', name: 'Foo', location: {latitude: 1, longitude: 2}}
	const destination = {id: 'bar', name: 'Bar', location: {latitude: 2, longitude: 1}}
	const mergeLeg = createMergeLeg(gtfsRtInfo, gtfsInfo)
	const merged = mergeLeg({
		...omit(fromGtfsRt, ['nextStopovers']),
		origin, destination,
		stopovers: fromGtfsRt.nextStopovers || [],
	}, {
		...omit(fromGtfs, ['nextStopovers']),
		origin, destination,
		stopovers: fromGtfs.nextStopovers || [],
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

module.exports = createMatchMovement
