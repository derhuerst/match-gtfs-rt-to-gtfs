'use strict'

const matchStop = require('./lib/match-stop')
const {
	matchArrival,
	matchDeparture,
} = require('./lib/match-arrival-departure')
const matchTrip = require('./lib/match-trip')

module.exports = {
	matchStop,
	matchArrival,
	matchDeparture,
	matchTrip,
}
