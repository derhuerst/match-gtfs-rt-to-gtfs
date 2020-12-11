'use strict'

const db = require('./lib/db')

const findShape = async (tripId) => {
	// todo: this query takes ~2s, make it faster
	const {rows: matched} = await db.query(`
		select
			-- shapes_aggregated.shape_id,
			-- distances_travelled,
			ST_AsGeoJson(shape) as shape
		from shapes_aggregated
		join trips on trips.shape_id = shapes_aggregated.shape_id
		where trip_id = $1
	`, [
		tripId
	])
	const m = matched[0]
	return m ? JSON.parse(m.shape) : null
}

module.exports = findShape
