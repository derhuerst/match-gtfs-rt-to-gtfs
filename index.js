'use strict'

const {Client} = require('pg')
const QueryStream = require('pg-query-stream')
const stops = require('./lib/prepare-stable-ids/stops')
const routes = require('./lib/prepare-stable-ids/routes')

;(async () => {
	const db = new Client()
	await db.connect()

	const convert = async ({query, onRow, beforeAll, afterAll}) => {
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

	await db.end()
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
