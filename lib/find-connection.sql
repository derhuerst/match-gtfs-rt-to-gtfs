SELECT *
FROM (
SELECT
	trips.trip_id,
	trips.trip_headsign,
	trips.trip_short_name,
	trips.service_id,
	route_stable_ids,
	stop_sequence,

	from_stop_id,
	from_stop_name,
	from_stop_stable_ids,
	from_station_id,
	from_station_name,
	from_station_stable_ids,
    make_timestamptz(
    	date_part('year'::text, date)::integer,
    	date_part('month'::text, date)::integer,
    	date_part('day'::text, date)::integer,
    	12, 0, 0::double precision,
    	'Europe/Berlin'::text # todo: don't hardcode this
    ) - '12:00:00'::interval + departure_time AS t_departure,

	to_stop_id,
	to_stop_name,
	to_stop_stable_ids,
	to_station_id,
	to_station_name,
	to_station_stable_ids,
    make_timestamptz(
    	date_part('year'::text, date)::integer,
    	date_part('month'::text, date)::integer,
    	date_part('day'::text, date)::integer,
    	12, 0, 0::double precision,
    	'Europe/Berlin'::text # todo: don't hardcode this
    ) - '12:00:00'::interval + arrival_time AS t_arrival
FROM (
SELECT
	trips.*,
	routes_with_stable_ids.stable_ids as route_stable_ids,
	stop_sequence,

	stops.stop_id as from_stop_id,
	stops.stop_name as from_stop_name,
	stops.stop_stable_ids as from_stop_stable_ids,
	stops.station_id as from_station_id,
	stops.station_name as from_station_name,
	stops.station_stable_ids as from_station_stable_ids,
	stop_times.departure_time as departure_time,

	lead(stop_times.arrival_time) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as arrival_time,
	lead(stops.stop_id) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as to_stop_id,
	lead(stops.stop_name) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as to_stop_name,
	lead(stops.stop_stable_ids) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as to_stop_stable_ids,
	lead(stops.station_id) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as to_station_id,
	lead(stops.station_name) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as to_station_name,
	lead(stops.station_stable_ids) OVER (PARTITION BY stop_times.trip_id ORDER BY stop_sequence ASC) as to_station_stable_ids
FROM trips
LEFT JOIN routes ON trips.route_id = routes.route_id
LEFT JOIN routes_with_stable_ids ON routes.route_id = routes_with_stable_ids.route_id
LEFT JOIN (
	SELECT *
	FROM stop_times
	ORDER BY trip_id, stop_sequence ASC
) stop_times ON trips.trip_id = stop_times.trip_id
LEFT JOIN stops_with_stations_and_stable_ids stops ON stop_times.stop_id = stops.stop_id
) trips
JOIN service_days ON trips.service_id = service_days.service_id
ORDER BY trips.trip_id, departure_time, stop_sequence
) connections
WHERE trip_id = '124167345' OR trip_id = '124167346'
AND route_stable_ids && ARRAY['1:vbb:21', '1:berliner-verkehrsbetriebe:21']::text[]
AND (
		from_stop_stable_ids && ARRAY['1:vbb:070301009088']::text[]
		OR from_station_stable_ids && ARRAY['1:vbb:station:900000160522']::text[]
)
AND t_departure > '2020-10-12T04:30:00+02' AND t_departure < '2020-10-12T04:32:00+02'
