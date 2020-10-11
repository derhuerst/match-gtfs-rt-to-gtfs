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

// const stops = require('./lib/prepare-stable-ids/stops')
// const routes = require('./lib/prepare-stable-ids/routes')

;(async () => {
	// todo
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
