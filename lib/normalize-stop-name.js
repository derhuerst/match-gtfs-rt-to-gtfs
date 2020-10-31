'use strict'

// todo: adapt this to HVV
const tokenize = require('tokenize-vbb-station-name')

const normalizeStopName = (name) => {
	return tokenize(name, {meta: 'remove'}).join('-')
}

module.exports = normalizeStopName
