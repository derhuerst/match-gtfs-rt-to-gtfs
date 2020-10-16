'use strict'

const mergeStop = require('find-hafas-data-in-another-hafas/lib/merge-stop')
const findStop = require('./find-stop')

const matchStop = async (fromHafas) => {
	const fromGtfs = await findStop(fromHafas)
	if (!fromGtfs) return fromHafas
	return mergeStop('vbb-hafas', fromHafas, 'vbb-gtfs', fromGtfs)
}

module.exports = matchStop
