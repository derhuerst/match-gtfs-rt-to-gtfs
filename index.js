import {createMatchStop} from './lib/match-stop.js'
import {
	createMatchArrival,
	createMatchDeparture,
} from './lib/match-arrival-departure.js'
import {createMatchTrip} from './lib/match-trip.js'
import {createMatchMovement} from './lib/match-movement.js'
import {queryGtfsDataImportedAt as gtfsDataImportedAt} from './lib/gtfs-data-imported-at.js'
import {redis} from './lib/redis.js'
import {db} from './lib/db.js'

const close = async () => {
	await redis.quit()
	await db.end()
}

const createMatch = (gtfsRtInfo, gtfsInfo) => {
	return {
		matchStop: createMatchStop(gtfsRtInfo, gtfsInfo),
		matchArrival: createMatchArrival(gtfsRtInfo, gtfsInfo),
		matchDeparture: createMatchDeparture(gtfsRtInfo, gtfsInfo),
		matchTrip: createMatchTrip(gtfsRtInfo, gtfsInfo),
		matchMovement: createMatchMovement(gtfsRtInfo, gtfsInfo),

		gtfsDataImportedAt,
		close,
		db,
		redis,
	}
}

export {
	createMatch,
	createMatchStop,
	createMatchArrival,
	createMatchDeparture,
	createMatchTrip,
	createMatchMovement,
	close,
}
