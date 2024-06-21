import {strictEqual} from 'node:assert'

const normalize = (name) => {
	return name
	.replace(/\s+/g, '-')
	.replace(/[^-\p{L}\p{N}]/ug, '')
	.toLowerCase()
}

strictEqual(normalize('Foo Str.'), 'foo-str')
strictEqual(normalize('Foo Str'), 'foo-str')
strictEqual(normalize('Foo ^Str'), 'foo-str')

export {
	normalize as normalizeStopName,
	normalize as normalizeLineName,
}
