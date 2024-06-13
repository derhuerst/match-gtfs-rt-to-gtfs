# match-gtfs-rt-to-gtfs

Try to **match realtime transit data (e.g. from [GTFS Realtime (GTFS-RT)](https://gtfs.org/reference/realtime/v2/)) with [GTFS Static](https://gtfs.org/reference/static) data**, even if they don't share an ID.

[![npm version](https://img.shields.io/npm/v/match-gtfs-rt-to-gtfs.svg)](https://www.npmjs.com/package/match-gtfs-rt-to-gtfs)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/match-gtfs-rt-to-gtfs.svg)
![minimum Node.js version](https://img.shields.io/node/v/match-gtfs-rt-to-gtfs.svg)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)
[![chat with me on Twitter](https://img.shields.io/badge/chat%20with%20me-on%20Twitter-1da1f2.svg)](https://twitter.com/derhuerst)

This repo uses [`@derhuerst/stable-public-transport-ids`](https://github.com/derhuerst/stable-public-transport-ids) to compute IDs from transit data itself:

1. [`gtfs-via-postgres`](https://github.com/derhuerst/gtfs-via-postgres) is used to import the GTFS Static data into the DB.
2. It computes these "stable IDs" for all relevant items in the GTFS Static data and store them in the DB.
3. When given a pice of realtime data (e.g. from a GTFS Realtime feed), compute its "stable IDs" and check if they match those stored in the DB.


## Installation

```shell
npm install match-gtfs-rt-to-gtfs
```

*Note:* `match-gtfs-rt-to-gtfs` **needs PostgreSQL >=14** to work, as its dependency [`gtfs-via-postgres`](https://github.com/derhuerst/gtfs-via-postgres) needs that version. You can check your PostgreSQL server's version with `psql -t -c 'SELECT version()'`.


## Usage

### building the database

Let's use `gtfs-to-sql` CLI from the [`gtfs-via-postgres`](https://github.com/derhuerst/gtfs-via-postgres) to import our GTFS data into [PostgreSQL](https://www.postgresql.org):

```shell
gtfs-to-sql path/to/gtfs/*.txt | psql -b
```

To some extent, `match-gtfs-rt-to-gtf` fuzzily matches stop/station & route/line names (more on that below). For that to work, we need to tell it how to "normalize" these names. As an example, we're going to do this for the [VBB](https://en.wikipedia.org/wiki/Verkehrsverbund_Berlin-Brandenburg) data:

```js
// normalize.js
const normalizeStopName = require('normalize-vbb-station-name-for-search')
const slugg = require('slugg')

const normalizeLineName = (name) => {
	return slugg(name.replace(/([a-zA-Z]+)\s+(\d+)/g, '$1$2'))
}

module.exports = {
	normalizeStopName,
	normalizeLineName,
	// With VBB vehicles, the headsign is almost always the last stop.
	normalizeTripHeadsign: normalizeStopName,
}
```

We're going to create two files that specify how to handle the GTFS-RT & GTFS (Static) data, respectively:

```js
// gtfs-rt-info.js
const {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} = require('./normalize.js')

module.exports = {
	idNamespace: 'vbb',
	endpointName: 'vbb-hafas',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}
```

```js
// gtfs-info.js
const {
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
} = require('./normalize.js')

module.exports = {
	idNamespace: 'vbb',
	endpointName: 'vbb-gtfs',
	normalizeStopName,
	normalizeLineName,
	normalizeTripHeadsign,
}
```

Now, we're going to use `match-gtfs-rt-to-gtfs/build-index.js` to import additional data into the database that is needed for matching:

```bash
set -o pipefail
./build-index.js gtfs-rt-info.js gtfs-info.js | psql -b
```

### matching data

`match-gtfs-rt-to-gtf` does its job using fuzzy matching: As an example, it **identifies two departure data points from GTFS-RT & GTFS – at the same time, at the same stop/station and with the same route/line name – as equivalent**.

Now, let's match a departure against GTFS:

```js
const createMatch = require('match-gtfs-rt-to-gtfs')
const gtfsRtInfo = require('./gtfs-rt-info.js') // see above
const gtfsInfo = require('./gtfs-info.js') // see above

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

### finding the shape of a trip

```js
const findShape = require('match-gtfs-rt-to-gtfs/find-shape')

const someTripId = '24582338' // some U3 trip from the HVV dataset
await findShape(someTripId)
```

`findShape` resolves with a [GeoJSON `LineString`](https://tools.ietf.org/html/rfc7946#section-3.1.4):

```js
{
	type: 'LineString',
	coordinates: [
		[10.044385, 53.5872],
		// …
		[10.074888, 53.592473]
	],
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

Because PostgreSQL executes this query quite efficiently, we don't need to store a pre-computed list index of *all* arrivals/departures, but just an index of their stable stop/station/route IDs.

The size of this additional index depends on how many stable IDs your logic generates for each stop/station/route. Consider the [2020-09-25 VBB GTFS Static feed](https://vbb-gtfs.jannisr.de/2020-09-25) as an example: Without [`shapes.txt`](https://gtfs.org/reference/static/#shapestxt), it is 356MB as CSV files, ~2GB as imported & indexed in the DB by `gtfs-via-posgres`; `match-gtfs-rt-to-gtfs`'s stable IDs indices add another
- 300MB with few stable IDs per stop/station/route, and
- 3GB with 10-30 stable IDs each.


## API

### `gtfsInfo`/`gtfsRtInfo`

```ts
{
	idNamespace: string,
	endpointName: string,
	normalizeStopName: (name: string, stop: FptfStop) => string,
	normalizeLineName(name: string, line: FptfLine) => string,
	normalizeTripHeadsign(headsign: string) => string,
}
```


## Contributing

*Note:* This repos blends two families of techinical terms – GTFS-related ones and [FPTF](https://public-transport.github.io/friendly-public-transport-format/)-/[`hafas-client`](https://github.com/public-transport/hafas-client)-related ones –, which makes the code somewhat confusing.

If you have a question or need support using `match-gtfs-rt-to-gtfs`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/match-gtfs-rt-to-gtfs/issues).
