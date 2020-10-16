'use strict'

const {Client} = require('pg')

// todo: get rid of this untestable singleton
const db = new Client()
db.connect().catch((err) => {
	console.error(err)
	process.exit(1)
})

module.exports = db
