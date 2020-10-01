'use strict'

const slugg = require('slugg')
const getStableRouteIds = require('../stable-route-ids')
const {gtfsToFptf} = require('gtfs-utils/route-types')
const csv = require('../csv')

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
		// todo: fix this properly
		operator: {
			// we match hafas-client here
			// https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/operator.js#L10
			id: slugg(r.agency_name),
		},
		// todo: adminCode?
	}

	const ids = getStableRouteIds(route)
	for (const id of ids) {
		process.stdout.write(csv([r.route_id, id]))
	}
}

const afterAll = `\
\\.

CREATE MATERIALIZED VIEW routes_with_stable_ids AS
SELECT
	routes.*,
	route_stable.ids AS stable_ids
FROM routes
LEFT JOIN (
	SELECT
		routes_stable_ids.route_id,
		array_agg(routes_stable_ids.stable_id) AS ids
	FROM routes_stable_ids
	GROUP BY routes_stable_ids.route_id
) route_stable ON routes.route_id = route_stable.route_id
ORDER BY route_id;

CREATE INDEX ON routes_with_stable_ids (stable_ids);
`

module.exports = {
	query: ROUTES,
	beforeAll,
	onRow: onRoute,
	afterAll,
}
