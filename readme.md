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

To some extent, `match-gtfs-rt-to-gtf` fuzzily matches stop/station & route/line names (more on that below). For that to work, we need to tell it how to "normalize" these names. As an example, we're going to do this for the [VBB](https://en.wikipedia.org/wiki/Verkehrsverbund_Berlin-Brandenburg) data:

```js
// normalize.js
const tokenize = require('tokenize-vbb-station-name')
const slugg = require('slugg')

const normalizeStopName = (name) => {
	return tokenize(name, {meta: 'remove'}).join('-')
}
const normalizeLineName = (name) => {
	return slugg(name.replace(/([a-zA-Z]+)\s+(\d+)/g, '$1$2'))
}

module.exports = {normalizeStopName, normalizeLineName}
```

We're going to create two files that specify how to handle the GTFS-RT & GTFS (Static) data, respectively:

```js
// gtfs-rt-info.js
const {normalizeStopName, normalizeLineName} = require('./normalize.js')
module.exports = {
	endpointName: 'vbb-hafas',
	normalizeStopName,
	normalizeLineName,
}
```

```js
// gtfs-info.js
const {normalizeStopName, normalizeLineName} = require('./normalize.js')
module.exports = {
	endpointName: 'vbb-gtfs',
	normalizeStopName,
	normalizeLineName,
}
```

Now, we're going to use `match-gtfs-rt-to-gtfs/build-index.js` to import additional data into the database that is needed for matching:

```shell
./build-index.js gtfs-rt-info.js gtfs-info.js | psql -b
```

### matching data

`match-gtfs-rt-to-gtf` does its job using fuzzy matching: As an example, it **identifies two departure data points from GTFS-RT & GTFS – at the same time, at the same stop/station and with the same route/line name – as equivalent**. For that to work, we need to tell it how to "normalize" stop/station & route/line names. As an example, we're going to do this for [VBB](https://github.com/public-transport/hafas-client/tree/5/p/vbb):

```js
const tokenize = require('tokenize-vbb-station-name')
const slugg = require('slugg')

const normalizeStopName = (name) => {
	return tokenize(name, {meta: 'remove'}).join('-')
}
const normalizeLineName = (name) => {
	return slugg(name.replace(/([a-zA-Z]+)\s+(\d+)/g, '$1$2'))
}

// how to handle data from HAFAS/GTFS-RT:
const gtfsRtInfo = {
	endpointName: 'vbb-hafas',
	normalizeStopName,
	normalizeLineName,
}
// how to handle data from GTFS:
const gtfsInfo = {
	endpointName: 'vbb-gtfs',
	normalizeStopName,
	normalizeLineName,
}
```

Now, let's match a departure against GTFS:

```js
const createMatch = require('match-gtfs-rt-to-gtfs')

const gtfsRtDep = {
	tripId: '1|12308|1|86|7112020',
	direction: 'Grunewald, Roseneck',
	line: {
		type: 'line',
		id: 'm29',
		fahrtNr: '22569',
		name: 'M29',
		public: true,
		adminCode: 'BVB',
		mode: 'bus',
		product: 'bus',
		operator: {
			type: 'operator',
			id: 'berliner-verkehrsbetriebe',
			name: 'Berliner Verkehrsbetriebe'
		},
	},

	stop: {
		type: 'stop',
		id: '900000013101',
		name: 'U Moritzplatz',
		location: {latitude: 52.503737, longitude: 13.410944},
	},

	when: '2020-11-07T14:55:00+01:00',
	plannedWhen: '2020-11-07T14:54:00+01:00',
	delay: 60,
	platform: null,
	plannedPlatform: null,
}

const {matchDeparture} = createMatch(gtfsRtInfo, gtfsInfo)
console.log(await matchDeparture(gtfsRtDep))
```

```js
{
	tripId: '145341691',
	tripIds: {
		'vbb-hafas': '1|12308|1|86|7112020',
		'vbb-gtfs': '145341691',
	},
	routeId: '17449_700',
	direction: 'Grunewald, Roseneck',
	line: {
		type: 'line',
		id: null,
		fahrtNr: '22569',
		fahrtNrs: {'vbb-hafas': '22569'},
		name: 'M29',
		public: true,
		adminCode: 'BVB',
		mode: 'bus',
		product: 'bus',
		operator: {
			type: 'operator',
			id: 'berliner-verkehrsbetriebe',
			name: 'Berliner Verkehrsbetriebe'
		},
	},

	stop: {
		type: 'stop',
		id: '070101002285',
		ids: {
			'vbb-hafas': '900000013101',
			'vbb-gtfs': '070101002285',
		},
		name: 'U Moritzplatz',
		location: {latitude: 52.503737, longitude: 13.410944},
	},

	when: '2020-11-07T14:55:00+01:00',
	plannedWhen: '2020-11-07T14:54:00+01:00',
	delay: 60,
	platform: null,
	plannedPlatform: null,
}
```


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
AND t_departure > '2020-10-16T22:20:48+02:00'
AND t_departure < '2020-10-16T22:22:48+02:00'
```

Because PostgreSQL is very smart at optimising a query, we don't need to store a lot of pre-computed data: Without [`shapes.txt`](https://gtfs.org/reference/static/#shapestxt), the [2020-09-25 VBB GTFS Static feed](https://vbb-gtfs.jannisr.de/2020-09-25) is 356MB as CSV files, ~1.1GB as imported & indexed in the DB, and this repo only adds ~100MB of additional lookup indices.


## Contributing

*Note:* This repos blends two families of techinical terms – GTFS-related ones and [FPTF](https://public-transport.github.io/friendly-public-transport-format/)-/[`hafas-client`](https://github.com/public-transport/hafas-client)-related ones –, which makes the code somewhat confusing.

If you have a question or need support using `match-gtfs-rt-to-gtfs`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/match-gtfs-rt-to-gtfs/issues).
