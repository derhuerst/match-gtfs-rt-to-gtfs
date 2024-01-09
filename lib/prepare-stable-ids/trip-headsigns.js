'use strict'

const csv = require('../csv')

const TRIPS = `
SELECT
	trip_id,
	trip_headsign
FROM trips
`

const beforeAll = `
CREATE TABLE trips_normalized_headsigns (
	trip_id TEXT NOT NULL,
	FOREIGN KEY (trip_id) REFERENCES trips,
	normalized_trip_headsign TEXT
);

COPY trips_normalized_headsigns FROM STDIN csv;
`

const createOnTrip = (gtfsRtInfo, gtfsInfo) => {
	// This assumes that the headsign contains a stop name, which is not the case in every region on earth.
	// todo [breaking]: make gtfs(Rt)Info.normalizeTripHeadsign mandatory
	const normalizeTripHeadsign = 'normalizeTripHeadsign' in gtfsInfo
		? gtfsInfo.normalizeTripHeadsign
		: gtfsInfo.normalizeStopName

	const onTrip = ({trip_id, trip_headsign}) => {
		// todo: handle trip_headsign being optional
		const normalizedHeadsign = trip_headsign
			? normalizeTripHeadsign(trip_headsign)
			: trip_headsign

		csv.write([
			trip_id,
			normalizedHeadsign,
		])
	}
	return onTrip
}

const afterAll = `\
\\.
CREATE INDEX ON trips_normalized_headsigns (trip_id);
CREATE INDEX ON trips_normalized_headsigns (normalized_trip_headsign);
`

module.exports = {
	query: TRIPS,
	beforeAll,
	createOnRow: createOnTrip,
	afterAll,
}
