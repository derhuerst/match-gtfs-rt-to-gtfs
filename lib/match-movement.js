'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const createFindMovement = require('./find-movement')
const {withMatchedFlag} = require('./matched')

const createMatchMovement = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findMovement = createFindMovement(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findMovement(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const origin = {id: 'foo', name: 'Foo', location: {latitude: 1, longitude: 2}}
	const destination = {id: 'bar', name: 'Bar', location: {latitude: 2, longitude: 1}}
	const mergeLeg = createMergeLeg(gtfsRtInfo, gtfsInfo, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	const merged = mergeLeg({
		...omit(fromGtfsRt, ['nextStopovers']),
		origin, destination,
		stopovers: fromGtfsRt.nextStopovers || [],
	}, {
		...omit(fromGtfs, ['nextStopovers']),
		origin, destination,
		stopovers: fromGtfs.nextStopovers || [],
	})

	const res = withMatchedFlag({
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
	})

	const trip = {
		...omit(merged, ['tripId', 'tripIds']),
		id: merged.tripId,
		ids: merged.tripIds,
	}
	Object.defineProperty(res, 'trip', {value: trip})

	return res
}

module.exports = createMatchMovement
