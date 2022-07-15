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

const {readFileSync} = require('fs')
const {resolve: pathResolve} = require('path')
const {types: {isModuleNamespaceObject}} = require('util')
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

;(async () => {

if (!argv._[0]) showError('missing/invalid gtfs-rt-info argument')
let gtfsRtInfo = await import(pathResolve(process.cwd(), argv._[0]))
// handle CommonJS modules & default exports
if (isModuleNamespaceObject(gtfsRtInfo)) gtfsRtInfo = gtfsRtInfo.default

if (!argv._[1]) showError('missing/invalid gtfs-info argument')
let gtfsInfo = await import(pathResolve(process.cwd(), argv._[1]))
// handle CommonJS modules & default exports
if (isModuleNamespaceObject(gtfsInfo)) gtfsInfo = gtfsInfo.default

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

	process.stdout.write(`\
-- GTFS SQL dump generated by ${pkg.name} v${pkg.version}
-- ${pkg.homepage}
\\set ON_ERROR_STOP on;
BEGIN;
\n`)

	console.error('stops')
	await convert(stops)
	console.error('routes')
	await convert(routes)

	process.stdout.write(`
CREATE INDEX ON trips (trip_id);
CREATE INDEX ON trips (route_id);
`)

	process.stdout.write(ARRS_DEPS_WITH_STABLE_IDS)
	process.stdout.write(FIND_ARR_DEP)

	process.stdout.write(`
COMMIT;
`)

	await db.end()
})()
.catch(showError)
