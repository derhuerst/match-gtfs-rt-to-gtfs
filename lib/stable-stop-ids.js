'use strict'

const createGetStopIds = require('@derhuerst/stable-public-transport-ids/stop')
const normalizeName = require('./normalize-stop-name')

const DATA_SOURCE = 'vbb'

const getStableStopIds = createGetStopIds(DATA_SOURCE, normalizeName)

module.exports = getStableStopIds
