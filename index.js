'use strict'

const createMatchStop = require('./lib/match-stop')
const {
	createMatchArrival,
	createMatchDeparture,
} = require('./lib/match-arrival-departure')
const createMatchTrip = require('./lib/match-trip')
const createMatchMovement = require('./lib/match-movement')
const db = require('./lib/db')

const close = async () => {
	await db.end()
}

const createMatch = (gtfsRtInfo, gtfsInfo) => {
	return {
		matchStop: createMatchStop(gtfsRtInfo, gtfsInfo),
		matchArrival: createMatchArrival(gtfsRtInfo, gtfsInfo),
		matchDeparture: createMatchDeparture(gtfsRtInfo, gtfsInfo),
		matchTrip: createMatchTrip(gtfsRtInfo, gtfsInfo),
		matchMovement: createMatchMovement(gtfsRtInfo, gtfsInfo),
		db,
	}
}

Object.assign(createMatch, {
	createMatchStop,
	createMatchArrival,
	createMatchDeparture,
	createMatchTrip,
	createMatchMovement,
	close,
})
module.exports = createMatch
