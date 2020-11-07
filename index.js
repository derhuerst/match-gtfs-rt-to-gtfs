'use strict'

const createMatchStop = require('./lib/match-stop')
const {
	matchArrival,
	matchDeparture,
} = require('./lib/match-arrival-departure')
const matchTrip = require('./lib/match-trip')
const matchMovement = require('./lib/match-movement')

module.exports = {
	createMatchStop,
	matchArrival,
	matchDeparture,
	matchTrip,
	matchMovement,
}
