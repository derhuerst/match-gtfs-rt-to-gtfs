CREATE TYPE arr_dep AS (
	route_id text,
	route_stable_id text,
	route_short_name text,
	route_type route_type_val,
	trip_id text,
	trip_headsign text,
	trip_short_name text,
	"date" timestamp without time zone,
	stop_sequence integer,
	"when" timestamp with time zone,
	stop_id text,
	stop_name text,
	stable_id text,
	station_id text,
	station_name text
);

CREATE FUNCTION find_departure(
	stable_ids text[],
	route_stable_ids text[],
	when_min timestamptz,
	when_max timestamptz,
	t_base_min timestamptz,
	t_base_max timestamptz
)
RETURNS SETOF arr_dep
AS $$ BEGIN
	RETURN QUERY
	SELECT
		route_id,
		route_stable_id,
		route_short_name,
		route_type,
		trip_id,
		trip_headsign,
		trip_short_name,
		"date",
		stop_sequence,
		t_departure as "when",
		stop_id,
		stop_name,
		stable_id,
		station_id,
		station_name
	FROM arrivals_departures_with_stable_ids arrs_deps

	WHERE arrs_deps.stable_id = ANY(stable_ids)

	AND arrs_deps.route_stable_id = ANY(route_stable_ids)

	AND arrs_deps.t_base > t_base_min
	AND arrs_deps.t_base < t_base_max
	AND arrs_deps.t_departure > when_min
	AND arrs_deps.t_departure < when_max

	LIMIT 1;
END $$ LANGUAGE plpgsql;

CREATE FUNCTION find_arrival(
	stable_ids text[],
	route_stable_ids text[],
	when_min timestamptz,
	when_max timestamptz,
	t_base_min timestamptz,
	t_base_max timestamptz
)
RETURNS SETOF arr_dep
AS $$ BEGIN
	RETURN QUERY
	SELECT
		route_id,
		route_stable_id,
		route_short_name,
		route_type,
		trip_id,
		trip_headsign,
		trip_short_name,
		"date",
		stop_sequence,
		t_arrival as "when",
		stop_id,
		stop_name,
		stable_id,
		station_id,
		station_name
	FROM arrivals_departures_with_stable_ids arrs_deps

	WHERE arrs_deps.stable_id = ANY(stable_ids)

	AND arrs_deps.route_stable_id = ANY(route_stable_ids)

	AND arrs_deps.t_base > t_base_min
	AND arrs_deps.t_base < t_base_max
	AND arrs_deps.t_arrival > when_min
	AND arrs_deps.t_arrival < when_max

	LIMIT 1;
END $$ LANGUAGE plpgsql;
