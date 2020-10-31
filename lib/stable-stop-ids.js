'use strict'

const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')
const normalizeName = require('./normalize-stop-name')

const DATA_SOURCE = 'hvv'

const getStableStopIds = createGetStopIds(DATA_SOURCE, normalizeName)

module.exports = getStableStopIds
