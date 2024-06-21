import slugg from 'slugg'
import {createGetStableRouteIds} from '../stable-route-ids.js'
import {gtfsToFptf} from 'gtfs-utils/route-types.js'
import {csv} from '../csv.js'

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
	stable_id TEXT NOT NULL,
	specificity INTEGER NOT NULL
);

COPY routes_stable_ids FROM STDIN csv;
`

const createOnRoute = (gtfsRtInfo, gtfsInfo) => {
	const getStableRouteIds = createGetStableRouteIds(gtfsInfo)

	const onRoute = (r) => {
		const route = {
			// todo: `id: r.route_id`
			name: r.route_short_name,
			mode: r.route_type ? gtfsToFptf(parseInt(r.route_type)) : null,
			// Technically the agency of a line is not the operator of a
			// line/trip, but we fake one here to hopefully get a match.
			// todo: fix this properly
			operator: {
				// we match hafas-client here
				// https://github.com/public-transport/hafas-client/blob/8ed218f4d62a0c220d453b1b1ffa7ce232f1bb83/parse/operator.js#L10
				// todo [breaking]: make this proper agency_id & agency_name
				id: slugg(r.agency_name),
			},
			// todo: adminCode?
		}

		const ids = getStableRouteIds(route)
		for (const [id, specificity] of ids) { // todo: use specificity
			csv.write([r.route_id, id, specificity])
		}
	}
	return onRoute
}

const afterAll = `\
\\.
CREATE INDEX ON routes_stable_ids (route_id);
CREATE INDEX ON routes_stable_ids (stable_id);

CREATE VIEW routes_with_stable_ids AS
SELECT
	routes.*,
	-- todo [breaking]: rename to route_stable_id
	stable.stable_id,
	-- todo [breaking]: rename to route_stable_id_specificity
	stable.specificity AS stable_id_specificity
FROM routes
LEFT JOIN routes_stable_ids stable ON routes.route_id = stable.route_id
ORDER BY route_id, stable.specificity ASC;
`

export default {
	query: ROUTES,
	beforeAll,
	createOnRow: createOnRoute,
	afterAll,
}
