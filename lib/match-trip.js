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

		// todo: pull the stopover index from GTFS stop_times.stop_sequence,
		// let mergeLeg() pass it through
		stopovers: merged.stopovers.map((st, i) => ({...st, stopoverIndex: i})),
	})
}

module.exports = createMatchTrip
