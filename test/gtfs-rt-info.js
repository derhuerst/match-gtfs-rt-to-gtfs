import {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} from './normalize.js'

const gtfsRtInfo = {
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

export default gtfsRtInfo
