'use strict'

const debug = require('debug')('match-gtfs-rt-to-gtfs:match-movement')
const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const createFindMovement = require('./find-movement')
const {withMatchedFlag} = require('./matched')
const {copyCachedFlag} = require('./caching')

const createMatchMovement = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findMovement = createFindMovement(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findMovement(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt
	debug('fromGtfs', fromGtfs)

	// fake origin & destination, just to make mergeLeg() happy
	// todo: move this mess to find-hafas-data-in-another-hafas/merge-trip
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
		...omit(fromGtfs, [
			'nextStopovers',
			'tripOrigin', 'tripPlannedDeparture',
			'tripDestination', 'tripPlannedArrival',
		]),
		stopovers: fromGtfs.nextStopovers || [],
	})
	debug('merged', merged)

	const res = copyCachedFlag(fromGtfs, withMatchedFlag({
		...omit(merged, [
			'origin',
			'departure', 'plannedDeparture', 'departureDelay',
			'departurePlatform', 'plannedDeparturePlatform',
			'destination',
			'arrival', 'plannedArrival', 'arrivalDelay',
			'arrivalPlatform', 'plannedArrivalPlatform',
			'stopovers',
			'directionId', 'directionIds',
		]),
		nextStopovers: merged.stopovers,
	}))
	debug('movement', res)

	const trip = {
		id: merged.tripId,
		ids: merged.tripIds,
		direction: merged.direction,
		directionId: merged.directionId,
		directionIds: merged.directionIds,
		routeId: merged.routeId || null,
		line: merged.line,
		origin: fromGtfs.tripOrigin,
		plannedDeparture: fromGtfs.tripPlannedDeparture,
		destination: fromGtfs.tripDestination,
		plannedArrival: fromGtfs.tripPlannedArrival,
	}
	// todo: unenumerable fields don't get cached 🤔
	Object.defineProperty(res, 'trip', {value: trip})

	return res
}

module.exports = createMatchMovement
