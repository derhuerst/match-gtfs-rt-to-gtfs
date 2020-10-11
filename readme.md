# match-gtfs-rt-to-gtfs

Try to **match realtime transit data (e.g. from [GTFS Realtime](https://gtfs.org/reference/realtime/v2/)) with [GTFS Static](https://gtfs.org/reference/static) data**, even if they don't share an ID.

[![npm version](https://img.shields.io/npm/v/match-gtfs-rt-to-gtfs.svg)](https://www.npmjs.com/package/match-gtfs-rt-to-gtfs)
[![build status](https://api.travis-ci.org/derhuerst/match-gtfs-rt-to-gtfs.svg?branch=master)](https://travis-ci.org/derhuerst/match-gtfs-rt-to-gtfs)
![ISC-licensed](https://img.shields.io/github/license/derhuerst/match-gtfs-rt-to-gtfs.svg)
![minimum Node.js version](https://img.shields.io/node/v/match-gtfs-rt-to-gtfs.svg)
[![chat with me on Gitter](https://img.shields.io/badge/chat%20with%20me-on%20gitter-512e92.svg)](https://gitter.im/derhuerst)
[![support me via GitHub Sponsors](https://img.shields.io/badge/support%20me-donate-fa7664.svg)](https://github.com/sponsors/derhuerst)

This repo uses [`@derhuerst/stable-public-transport-ids`](https://github.com/derhuerst/stable-public-transport-ids) to compute IDs from transit data itself:

1. [`gtfs-utils`](https://github.com/public-transport/gtfs-utils) is used to read GTFS Static data.
2. It computes these "stable IDs" for all relevant items in the GTFS Static data and stores them as a lookup index.
3. When given a pice of realtime data (e.g. from a GTFS Realtime feed), compute its "stable IDs" and check if they match those stored in the index.


## Installation

```shell
git clone https://derhuerst/match-gtfs-rt-to-gtfs.git
cd match-gtfs-rt-to-gtfs
```


## Usage

### building the index

```shell
./build-index.js path/to/gtfs/*.txt
```

### using the index

Check the [example code](example.js).


## Contributing

*Note:* This repos blends two families of techinical terms – GTFS-related ones and [FPTF](https://public-transport.github.io/friendly-public-transport-format/)-/[`vbb-hafas`](https://github.com/public-transport/vbb-hafas)-related ones –, which makes the code somewhat confusing.

If you have a question or need support using `match-gtfs-rt-to-gtfs`, please double-check your code and setup first. If you think you have found a bug or want to propose a feature, use [the issues page](https://github.com/derhuerst/match-gtfs-rt-to-gtfs/issues).
