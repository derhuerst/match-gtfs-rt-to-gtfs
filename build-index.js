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
    build-index
Examples:
    build-index
\n`)
	process.exit(0)
}

if (argv.version || argv.v) {
	process.stdout.write(`build-index v${pkg.version}\n`)
	process.exit(0)
}

const readCsv = require('gtfs-utils/read-csv')
const prepareStops = require('./lib/prepare-stable-ids/stops')
const prepareRoutes = require('./lib/prepare-stable-ids/routes')
const redis = require('./lib/redis')

// todo: customizable gtfs dir
const readFile = (file) => {
	return readCsv(require.resolve('sample-gtfs-feed/gtfs/' + file + '.txt'))
}

;(async () => {
	console.error('stops')
	await prepareStops(readFile)
	console.error('routes')
	await prepareRoutes(readFile)

	redis.quit()
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
