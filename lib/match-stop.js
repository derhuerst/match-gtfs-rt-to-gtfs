'use strict'

const mergeStop = require('find-hafas-data-in-another-hafas/lib/merge-stop')
const findStop = require('./find-stop')

const matchStop = async (fromHafas) => {
	const fromGtfs = await findStop(fromHafas)
	if (!fromGtfs) return fromHafas

	const merged = mergeStop('hvv-hafas', fromHafas, 'gtfs', fromGtfs)
	return {
		...merged,

		// Currently, find-hafas-data-in-another-hafas/merge-* does not support
		// specifying the precedence, so we have to override it here.
		// see find-hafas-data-in-another-hafas#2
		id: fromGtfs.id,
		station: merged.station ? {
			...merged.station,
			id: fromGtfs.station.id,
		} : null,
	}
}

module.exports = matchStop
