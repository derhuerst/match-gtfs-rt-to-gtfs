'use strict'

const {Pool} = require('pg')

// todo: get rid of this untestable singleton
const db = new Pool({max: 4})
db.connect().catch((err) => {
	console.error(err)
	process.exit(1)
})

module.exports = db
