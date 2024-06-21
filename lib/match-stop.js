import createMergeStop from 'find-hafas-data-in-another-hafas/merge-stop.js'
import {createFindStop} from './find-stop.js'
import {withMatchedFlag} from './matched.js'
import {copyCachedFlag} from './caching.js'

const createMatchStop = (gtfsRtInfo, gtfsInfo) => async (fromGtfsRt) => {
	const findStop = createFindStop(gtfsRtInfo, gtfsInfo)
	const fromGtfs = await findStop(fromGtfsRt)
	if (!fromGtfs) return fromGtfsRt

	const mergeStop = createMergeStop(gtfsRtInfo, gtfsInfo, {
		preferB: {id: true}, // prefer GTFS IDs
	})
	return copyCachedFlag(fromGtfs, withMatchedFlag(mergeStop(fromGtfsRt, fromGtfs)))
}

export {
	createMatchStop,
}
