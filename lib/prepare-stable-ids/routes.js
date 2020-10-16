'use strict'

const slugg = require('slugg')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const stableIds = require('../stable-route-ids')
const redis = require('../redis')

const prepareStableRouteIds = async (readFile) => {
	for await (const r of readFile('routes')) {
		if (!r.route_id) continue
		if (!r.route_short_name) continue

		const route = {
			name: r.route_short_name,
			mode: r.route_type ? gtfsToFptf(parseInt(r.route_type)) : null,
			// Technically the agency of a line is not the operator of a
			// line/trip, but we fake one here to hopefully get a match.
			// todo: fix this properly
			operator: {
				id: slugg(r.agency_id),
				// todo
				// // we match hafas-client here
				// // https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/operator.js#L10
				// id: slugg(r.agency_name),
			},
			// todo: adminCode?
		}
		const ids = stableIds(route)
		console.error(r.route_id, ids)

		await Promise.all(ids.map(async (stableId) => {
			await redis.set('r:' + stableId, r.route_id)
		}))
	}
}

module.exports = prepareStableRouteIds
