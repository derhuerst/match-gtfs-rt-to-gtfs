'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const createFindTrip = require('./find-trip')
const {withMatchedFlag} = require('./matched')

const createMatchTrip = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findTrip = createFindTrip(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findTrip(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const mergeLeg = createMergeLeg(gtfsRtInfo, gtfsInfo, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	const merged = mergeLeg({
		...fromGtfsRt,
		tripId: fromGtfsRt.id,
	}, {
		...fromGtfs,
		tripId: fromGtfs.id,
	})

	return withMatchedFlag({
		...omit(merged, ['tripId', 'tripIds', 'ids']),
		id: merged.tripId,
		ids: merged.tripIds,
		routeId: fromGtfs.routeId,
	})
}

module.exports = createMatchTrip
