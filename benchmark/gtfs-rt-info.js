import {
	normalizeStopName,
	normalizeLineName,
} from './normalize.js'

const gtfsRtInfo = {
	idNamespace: 'bench',
	endpointName: 'gtfs-rt',
	normalizeStopName,
	normalizeLineName,
}

export default gtfsRtInfo
