#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"
set -x

gtfs='../node_modules/sample-gtfs-feed/gtfs'

gtfs-to-sql --trips-without-shape-id -d -- \
	"$gtfs/agency.txt" \
	"$gtfs/calendar.txt" \
	"$gtfs/calendar_dates.txt" \
	"$gtfs/frequencies.txt" \
	"$gtfs/routes.txt" \
	"$gtfs/shapes.txt" \
	"$gtfs/stop_times.txt" \
	"$gtfs/stops.txt" \
	"$gtfs/transfers.txt" \
	"$gtfs/trips.txt" \
	| psql -b

../build-index.js gtfs-rt-info.js gtfs-info.js | psql -b

node match.js

./headsign-matching/index.sh
