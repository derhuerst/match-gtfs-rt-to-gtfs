'use strict'

// todo: adapt this to HVV
const normalizeStopName = require('normalize-vbb-station-name-for-search')
const slugg = require('slugg')

// we match hafas-client here
// https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/line.js#L13
// todo: check that this actually works with HVV
const normalizeLineName = (name) => {
	return slugg(name.replace(/([a-zA-Z]+)\s+(\d+)/g, '$1$2'))
}

module.exports = {
	normalizeStopName,
	normalizeLineName,
}
