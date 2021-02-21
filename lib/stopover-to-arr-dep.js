'use strict'

const stopoverToArrDep = (type, st, t) => {
	const typeU = type[0].toUpperCase() + type.slice(1)
	return {
		tripId: t.id,
		direction: t.direction,
		line: t.line,

		when: st[type],
		plannedWhen: st['planned' + typeU],
		platform: st[type + 'Platform'],
		plannedPlatform: st['planned' + typeU + 'Platform'],

		stop: st.stop,
	}
}

module.exports = stopoverToArrDep
