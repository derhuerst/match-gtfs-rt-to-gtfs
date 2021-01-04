'use strict'

const {Pool} = require('pg')

// todo: get rid of this untestable singleton
const db = new Pool({max: 4})

module.exports = db
