'use strict'

const createMergeLeg = require('find-hafas-data-in-another-hafas/merge-leg')
const omit = require('lodash/omit')
const createFindTrip = require('./find-trip')

const createMatchTrip = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findTrip = createFindTrip(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findTrip(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const mergeLeg = createMergeLeg(gtfsRtInfo, gtfsInfo)
	const merged = mergeLeg({
		...fromGtfsRt,
		tripId: fromGtfsRt.id,
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

module.exports = createMatchTrip
