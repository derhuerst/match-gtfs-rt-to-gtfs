'use strict'

const {strictEqual} = require('assert')

const normalize = (name) => {
	return name
	.replace(/\s+/g, '-')
	.replace(/[^-\p{L}\p{N}]/ug, '')
	.toLowerCase()
}

strictEqual(normalize('Foo Str.'), 'foo-str')
strictEqual(normalize('Foo Str'), 'foo-str')
strictEqual(normalize('Foo   Str'), 'foo-str')
strictEqual(normalize('Foo ^Str'), 'foo-str')

module.exports = {
	normalizeStopName: normalize,
	normalizeLineName: normalize,
}
