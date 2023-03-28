'use strict'

const db = require('./db')

const gtfsDataImportedAt = async () => {
	const {rows: [{t}]} = await db.query(`
		SELECT EXTRACT(epoch FROM amtrak.gtfs_data_imported_at())::integer AS t
	`)
	return new Date(t * 1000).toISOString()
}

module.exports = gtfsDataImportedAt
