'use strict'

const slugg = require('slugg')
const createGetLineIds = require('@derhuerst/stable-public-transport-ids/line')

// we match hafas-client here
// https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/line.js#L13
// todo: DRY with https://github.com/derhuerst/pan-european-public-transport/blob/c09ee12b9fc5d34ab64d8725be80d6bc4b7fc1a7/lib/vbb.js#L46-L48
// todo: remove e.g. "Tram "
const normalizeName = name => slugg(name.replace(/([a-zA-Z]+)\s+(\d+)/g, '$1$2'))

const getStableRouteIds = createGetLineIds('vbb', normalizeName)

module.exports = getStableRouteIds
