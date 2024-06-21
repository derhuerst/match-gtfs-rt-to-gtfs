import createMergeLeg from 'find-hafas-data-in-another-hafas/merge-leg.js'
import omit from 'lodash/omit.js'
import {createFindTrip} from './find-trip.js'
import {withMatchedFlag} from './matched.js'
import {copyCachedFlag} from './caching.js'

const createMatchTrip = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findTrip = createFindTrip(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findTrip(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const mergeLeg = createMergeLeg(gtfsRtInfo, {
		...gtfsInfo,
		// todo: use gtfsStopSequence instead? (see other todos)
		mergeStopoverAdditionalFields: ['stopoverIndex'],
	}, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	const merged = mergeLeg({
		...fromGtfsRt,
		tripId: fromGtfsRt.id,
	}, {
		...fromGtfs,
		tripId: fromGtfs.id,
	})

	return copyCachedFlag(fromGtfs, withMatchedFlag({
		...omit(merged, ['tripId', 'tripIds', 'ids']),

		id: merged.tripId,
		ids: merged.tripIds,
		routeId: fromGtfs.routeId,
		directionId: fromGtfs.directionId,
	}))
}

export {
	createMatchTrip,
}
