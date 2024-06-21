import {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} from './normalize.js'

const gtfsInfo = {
	idNamespace: 'tEst',
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

export default gtfsInfo
