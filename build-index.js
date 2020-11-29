#!/usr/bin/env node
'use strict'

const mri = require('mri')
const pkg = require('./package.json')

const argv = mri(process.argv.slice(2), {
	boolean: [
		'help', 'h',
		'version', 'v',
	]
})

if (argv.help || argv.h) {
	process.stdout.write(`
Usage:
    build-gtfs-match-index <path-to-gtfs-rt-info> <path-to-gtfs-info>
Examples:
    build-gtfs-match-index gtfs-rt.js gtfs.js
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`build-index v${pkg.version}\n`)
	process.exit(0)
}

const {readFileSync, realpathSync} = require('fs')
const {Client} = require('pg')
const QueryStream = require('pg-query-stream')
const stops = require('./lib/prepare-stable-ids/stops')
const routes = require('./lib/prepare-stable-ids/routes')

const ARRS_DEPS_WITH_STABLE_IDS = readFileSync(require.resolve('./lib/arrivals_departures_with_stable_ids.sql'))
const FIND_ARR_DEP = readFileSync(require.resolve('./lib/find_arr_dep.sql'))

const showError = (err) => {
	console.error(err)
	process.exit(1)
}

if (!argv._[0]) showError('missing/invalid gtfs-rt-info argument')
const gtfsRtInfo = require(realpathSync(argv._[0]))
if (!argv._[1]) showError('missing/invalid gtfs-info argument')
const gtfsInfo = require(realpathSync(argv._[1]))

;(async () => {
	const db = new Client()
	await db.connect()

	const convert = async ({query, createOnRow, beforeAll, afterAll}) => {
		const onRow = createOnRow(gtfsRtInfo, gtfsInfo)

		if (beforeAll) process.stdout.write(beforeAll)
		const stream = db.query(new QueryStream(query))
		stream.on('data', onRow)
		await new Promise((resolve, reject) => {
			stream.once('end', () => {
				if (afterAll) process.stdout.write(afterAll)
				resolve()
			})
			stream.once('error', reject)
		})
	}

	console.error('stops')
	await convert(stops)
	console.error('routes')
	await convert(routes)

	process.stdout.write(`
		CREATE INDEX ON trips (route_id, trip_id);
	`)

	process.stdout.write(ARRS_DEPS_WITH_STABLE_IDS)
	process.stdout.write(FIND_ARR_DEP)

	await db.end()
})()
.catch(showError)
