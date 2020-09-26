'use strict'

const tokenize = require('tokenize-vbb-station-name')
const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')

const DATA_SOURCE = 'vbb'

const normalizeName = name => tokenize(name, {meta: 'remove'}).join('-')
const getStableStopIds = createGetStopIds(DATA_SOURCE, normalizeName)

module.exports = getStableStopIds
