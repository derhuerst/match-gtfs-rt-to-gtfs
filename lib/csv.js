'use strict'

const {Stringifier} = require('csv-stringify')

const csv = new Stringifier({quoted: true})
const formatRowAsCsv = row => csv.stringify(row) + '\n'

module.exports = formatRowAsCsv
