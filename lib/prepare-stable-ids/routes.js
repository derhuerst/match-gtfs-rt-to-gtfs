'use strict'

const slugg = require('slugg')
const createGetLineIds = require('@derhuerst/stable-public-transport-ids/line')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const csv = require('../csv')

// we match hafas-client here
// https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/line.js#L13
// todo: DRY with https://github.com/derhuerst/pan-european-public-transport/blob/c09ee12b9fc5d34ab64d8725be80d6bc4b7fc1a7/lib/vbb.js#L46-L48
// todo: remove e.g. "Tram "
const normalizeName = name => slugg(name)
const getLineIds = createGetLineIds('vbb', normalizeName)

const ROUTES = `
	SELECT
		routes.route_id,
		routes.route_short_name,
		routes.route_type,
		agency.agency_name
	FROM routes
	LEFT JOIN agency ON routes.agency_id = agency.agency_id
`

const beforeAll = `
CREATE TABLE routes_stable_ids (
	route_id TEXT NOT NULL,
	FOREIGN KEY (route_id) REFERENCES routes,
	stable_id TEXT NOT NULL
);

COPY routes_stable_ids FROM STDIN csv;
`

const onRoute = (r) => {
	const route = {
		name: r.route_short_name,
		mode: r.route_type ? gtfsToFptf(parseInt(r.route_type)) : null,
		// Technically the agency of a line is not the operator of a
		// line/trip, but we fake one here to hopefully get a match.
		operator: {
			// we match hafas-client here
			// https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/operator.js#L10
			id: slugg(r.agency_name),
		},
	}

	const ids = getLineIds(route)
	for (const id of ids) {
		process.stdout.write(csv([r.route_id, id]))
	}
}

const afterAll = `\
\\.
`

module.exports = {
	query: ROUTES,
	beforeAll,
	onRow: onRoute,
	afterAll,
}
