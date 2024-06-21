#!/bin/bash

set -eu -o pipefail

cd "$(dirname $0)"

set -x

wget \
	-r --no-parent --no-directories -A .csv.gz \
	-P gtfs -N 'https://vbb-gtfs.jannisr.de/2020-09-04/'
gunzip -d -f gtfs/*.csv.gz

env | grep '^PG' || true

NODE_ENV=production ../node_modules/.bin/gtfs-to-sql --trips-without-shape-id -d -- \
	gtfs/agency.csv \
	gtfs/calendar.csv \
	gtfs/calendar_dates.csv \
	gtfs/frequencies.csv \
	gtfs/routes.csv \
	gtfs/shapes.csv \
	gtfs/stop_times.csv \
	gtfs/stops.csv \
	gtfs/transfers.csv \
	gtfs/trips.csv \
	| psql -b

NODE_ENV=production ../build-index.js \
	gtfs-rt-info.js gtfs-info.js \
	| sponge | psql -b

# export MATCH_GTFS_RT_TO_GTFS_CACHING=false
cat ./trips.ndjson.gz | gunzip | env NODE_ENV=production node ./index.js
