import {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} from './normalize.js'

const gtfsRtInfo = {
	idNamespace: 'tEst',
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

export default gtfsRtInfo
