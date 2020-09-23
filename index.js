'use strict'

const {Client} = require('pg')
const QueryStream = require('pg-query-stream')
const stops = require('./lib/prepare-stable-ids/stops')

;(async () => {
	const db = new Client()
	await db.connect()

	const convert = async (query, onRow) => {
		const stream = db.query(new QueryStream(query))
		stream.on('data', onRow)
		await new Promise((resolve, reject) => {
			stream.once('end', resolve)
			stream.once('error', reject)
		})
	}

	console.error('stops')
	await convert(stops.query, stops.onRow)
	await db.end()
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
