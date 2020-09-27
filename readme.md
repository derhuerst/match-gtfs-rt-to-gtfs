# match-gtfs-rt-to-gtfs

Try to **match realtime transit data (e.g. from [GTFS Realtime](https://gtfs.org/reference/realtime/v2/)) with [GTFS Static](https://gtfs.org/reference/static) data**, even if they don't share an ID.

[![npm version](https://img.shields.io/npm/v/match-gtfs-rt-to-gtfs.svg)](https://www.npmjs.com/package/match-gtfs-rt-to-gtfs)
[![build status](https://api.travis-ci.org/derhuerst/match-gtfs-rt-to-gtfs.svg?branch=master)](https://travis-ci.org/derhuerst/match-gtfs-rt-to-gtfs)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/match-gtfs-rt-to-gtfs.svg)
![minimum Node.js version](https://img.shields.io/node/v/match-gtfs-rt-to-gtfs.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)

This repo uses [`@derhuerst/stable-public-transport-ids`](https://github.com/derhuerst/stable-public-transport-ids) to compute IDs from transit data itself:

1. [`gtfs-via-postgres`](https://github.com/derhuerst/gtfs-via-postgres) is used to import the GTFS Static data into the DB.
2. It computes these "stable IDs" for all relevant items in the GTFS Static data and store them in the DB.
3. When given a pice of realtime data (e.g. from a GTFS Realtime feed), compute its "stable IDs" and check if they match those stored in the DB.


## Installation

```shell
git clone https://derhuerst/match-gtfs-rt-to-gtfs.git
cd match-gtfs-rt-to-gtfs
```


## Usage

### building the database

Let's use `gtfs-to-sql` CLI from the [`gtfs-via-postgres`](https://github.com/derhuerst/gtfs-via-postgres) to import our GTFS data into [PostgreSQL](https://www.postgresql.org):

```shell
gtfs-to-sql path/to/gtfs/*.txt | psql -b
```

Now, we'll use this repo to import additional data needed for matching:

```shell
node index.js | psql -b
```

### using the database

Check the [example code](example.js).


## How it works

`gtfs-via-postgres` adds a [view](https://www.postgresql.org/docs/12/sql-createview.html) `arrivals_departures`, which contains every arrival/departure of every trip in the GTFS static dataset. This repo adds another view `arrivals_departures_with_stable_ids`, which combines the data with the "stable IDs" stored in separate tables. It is then used for the matching process, which works essentially like this:

```sql
SELECT *
FROM arrivals_departures_with_stable_ids
WHERE (
	stop_stable_ids && ARRAY['stop-id1', 'stop-id2']
	OR station_stable_ids && ARRAY['station-id1', 'station-id2']
)
AND route_stable_ids && ARRAY['route-id1', 'route-id2']
AND t_departure > '2020-09-21T22:20:48+02:00'
AND t_departure < '2020-09-21T22:22:48+02:00'
```

Because PostgreSQL is very smart at optimising a query, we don't need to store a lot of pre-computed data: Without [`shapes.txt`](https://gtfs.org/reference/static/#shapestxt), the [2020-09-04 VBB GTFS Static feed](https://vbb-gtfs.jannisr.de/2020-09-04) is 320MB as CSV files, ~1.5GB as imported & indexed in the DB, and this repo only adds ~100MB of additional lookup indices.


## Contributing

*Note:* This repos blends two families of techinical terms – GTFS-related ones and [FPTF](https://public-transport.github.io/friendly-public-transport-format/)-/[`vbb-hafas`](https://github.com/public-transport/vbb-hafas)-related ones –, which makes the code somewhat confusing.

If you have a question or need support using `match-gtfs-rt-to-gtfs`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/match-gtfs-rt-to-gtfs/issues).
