'use strict'

const createMatchStop = require('./lib/match-stop')
const {
	createMatchArrival,
	createMatchDeparture,
} = require('./lib/match-arrival-departure')
const createMatchTrip = require('./lib/match-trip')
const matchMovement = require('./lib/match-movement')

module.exports = {
	createMatchStop,
	createMatchArrival,
	createMatchDeparture,
	createMatchTrip,
	matchMovement,
}
