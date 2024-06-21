import {
	normalizeStopName,
	normalizeLineName,
} from './normalize.js'

const gtfsInfo = {
	idNamespace: 'bench',
	endpointName: 'gtfs',
	normalizeStopName,
	normalizeLineName,
}

export default gtfsInfo
