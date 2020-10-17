CREATE VIEW arrivals_departures_with_stable_ids AS
SELECT
	trips.route_id,
	routes_stable.stable_id AS route_stable_id,
	routes.route_short_name,
	routes.route_type,
	trips.trip_id,
	trips.trip_headsign,
	trips.trip_short_name,
	service_days.date,
	stop_times.stop_sequence,
	service_days.t_base + stop_times.arrival_time AS t_arrival,
	service_days.t_base + stop_times.departure_time AS t_departure,
	stop_times.stop_id,
	stops_stable.stable_id as stop_stable_id,
	stops.stop_name,
	stations.stop_id as station_id,
	stations_stable.stable_id as station_stable_id,
	stations.stop_name as station_name
FROM stop_times
LEFT JOIN stops ON stop_times.stop_id = stops.stop_id
LEFT JOIN stops stations ON stops.parent_station = stations.stop_id
LEFT JOIN stops_stable_ids stops_stable ON stop_times.stop_id = stops_stable.stop_id
LEFT JOIN stops_stable_ids stations_stable ON stations.stop_id = stations_stable.stop_id
LEFT JOIN trips ON stop_times.trip_id = trips.trip_id
LEFT JOIN routes ON trips.route_id = routes.route_id
LEFT JOIN routes_stable_ids routes_stable ON routes.route_id = routes_stable.route_id
LEFT JOIN service_days service_days ON trips.service_id = service_days.service_id
