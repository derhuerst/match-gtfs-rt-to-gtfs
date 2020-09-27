CREATE VIEW arrivals_departures_with_stable_ids AS
SELECT
	trips.route_id,
	routes_with_stable_ids.stable_ids as route_stable_ids,
	routes.route_short_name,
	routes.route_type,
	trips.trip_id,
	trips.trip_headsign,
	trips.trip_short_name,
	service_days.date,
	stop_times.stop_sequence,
	make_timestamptz(
		date_part('year'::text, service_days.date)::integer,
		date_part('month'::text, service_days.date)::integer,
		date_part('day'::text, service_days.date)::integer,
		12, 0, 0::double precision,
		'Europe/Berlin'::text
	) - '12:00:00'::interval + stop_times.arrival_time AS t_arrival,
	make_timestamptz(
		date_part('year'::text, service_days.date)::integer,
		date_part('month'::text, service_days.date)::integer,
		date_part('day'::text, service_days.date)::integer,
		12, 0, 0::double precision,
		'Europe/Berlin'::text
	) - '12:00:00'::interval + stop_times.departure_time AS t_departure,
	stop_times.stop_id,
	stops.stop_stable_ids,
	stops.stop_name,
	stops.station_id,
	stops.station_stable_ids,
	stops.station_name
FROM stop_times
JOIN stops_with_stations_and_stable_ids stops ON stop_times.stop_id = stops.stop_id
JOIN trips ON stop_times.trip_id = trips.trip_id
JOIN routes ON trips.route_id = routes.route_id
JOIN routes_with_stable_ids ON routes.route_id = routes_with_stable_ids.route_id
JOIN service_days ON trips.service_id = service_days.service_id
ORDER BY trips.route_id, stop_times.trip_id, service_days.date, stop_times.stop_sequence
