import {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} from './normalize.js'

const gtfsInfo = {
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}

export default gtfsInfo
