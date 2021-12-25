'use strict'

const {stringify: csvStringifier} = require('csv-stringify')

const csv = csvStringifier({
	quoted: true,
})
csv.pipe(process.stdout)

module.exports = csv
