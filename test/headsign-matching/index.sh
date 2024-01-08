#!/bin/bash

set -e
set -o pipefail
cd "$(dirname $0)"

env | grep '^PG' || true

set -x

psql -c 'CREATE DATABASE test_headsign_matching'
export PGDATABASE=test_headsign_matching

../../node_modules/.bin/gtfs-to-sql \
	-d --trips-without-shape-id \
	*.csv \
	| psql -b

../../build-index.js ../gtfs-rt-info.js ../gtfs-info.js | psql -b

node test-find-departure.js
