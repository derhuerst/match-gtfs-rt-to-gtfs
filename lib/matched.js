const MATCHED = Symbol.for('match-gtfs-rt-to-gtfs:matched')

const withMatchedFlag = (obj) => {
	Object.defineProperty(obj, MATCHED, {value: true})
	return obj
}

export {
	MATCHED,
	withMatchedFlag,
}
