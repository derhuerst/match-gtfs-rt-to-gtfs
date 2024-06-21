import {db} from './db.js'

const queryGtfsDataImportedAt = async () => {
	const {rows: [{t}]} = await db.query(`
		SELECT EXTRACT(epoch FROM amtrak.gtfs_data_imported_at())::integer AS t
	`)
	return new Date(t * 1000).toISOString()
}

export {
	queryGtfsDataImportedAt,
}
