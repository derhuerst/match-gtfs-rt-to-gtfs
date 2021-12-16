'use strict'

const csvStringifier = require('csv-stringify')

const csv = csvStringifier({
	quoted: true,
})
csv.pipe(csv)

module.exports = csv
