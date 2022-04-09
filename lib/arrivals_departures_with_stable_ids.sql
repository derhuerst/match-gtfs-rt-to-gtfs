CREATE VIEW arrivals_departures_with_stable_ids AS
SELECT
	trips.route_id,
	routes_stable.stable_id AS route_stable_id,
	routes.route_short_name,
	routes.route_type,
	stop_times.trip_id,
	trips.direction_id,
	trips.trip_headsign,
	trips.trip_short_name,
	"date",
	stop_times.stop_sequence,
	stop_times.stop_sequence_consec,
	(
		make_timestamptz(
			date_part('year', "date")::int,
			date_part('month', "date")::int,
			date_part('day', "date")::int,
			12, 0, 0,
			-- todo: insert fallback tz from JS
			coalesce(station_timezone, stop_timezone, agency.agency_timezone, 'Europe/Berlin')
		)
		- interval '12 hours'
		+ arrival_time
	) t_arrival,
	(
		make_timestamptz(
			date_part('year', "date")::int,
			date_part('month', "date")::int,
			date_part('day', "date")::int,
			12, 0, 0,
			-- todo: insert fallback tz from JS
			coalesce(station_timezone, stop_timezone, agency.agency_timezone, 'Europe/Berlin')
		)
		- interval '12 hours'
		+ departure_time
	) t_departure,
	stops.stop_id,
	stops.stop_stable_id,
	stops.stop_stable_id_specificity,
	stops.stop_name,
	stops.station_id,
	stops.station_stable_id,
	stops.station_stable_id_specificity,
	stops.station_name
FROM stop_times
LEFT JOIN stops_with_stations_and_stable_ids stops ON stop_times.stop_id = stops.stop_id
LEFT JOIN trips ON stop_times.trip_id = trips.trip_id
LEFT JOIN routes ON trips.route_id = routes.route_id
LEFT JOIN routes_stable_ids routes_stable ON routes.route_id = routes_stable.route_id
LEFT JOIN agency ON routes.agency_id = agency.agency_id
LEFT JOIN service_days service_days ON trips.service_id = service_days.service_id;
