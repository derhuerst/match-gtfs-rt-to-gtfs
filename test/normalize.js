import {strictEqual} from 'node:assert'

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

const normalizeTripHeadsign = (name) => {
	if (!name) return name
	// test that not just any of the normalization functions is being used
	return 'headsign--' + normalize(name)
}

export {
	normalize as normalizeStopName,
	normalize as normalizeLineName,
	normalizeTripHeadsign,
}
