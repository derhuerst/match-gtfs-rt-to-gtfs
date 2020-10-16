'use strict'

const findArrDep = require('./find-arrival-departure')

const stopoverToArrDep = (type, st) => {
	const typeU = type[0].toUpperCase() + type.slice(1)
	return {
		tripId: _.id,
		direction: _.direction,
		line: _.line,

		when: st[type],
		plannedWhen: st['planned' + typeU],
		platform: st[type + 'Platform'],
		plannedPlatform: st['planned' + typeU + 'Platform'],

		stop: st.stop,
	}
}

const findTrip = async (_) => {
	debug(_)
	if (!Array.isArray(_.stopovers) || _.stopovers.length === 0) return null;

	const dep0 = stopoverToArrDep('departure', _.stopovers[0])
	const arr1 = stopoverToArrDep('arrival', _.stopovers[1])
	const [
		gtfsDep0,
		gtfsArr1,
	] = await Promise.all([
		findArrDep('departure', dep0),
		findArrDep('arrival', arr1),
	])
	if (!gtfsDep0) {
		return null;
	}
	if (!gtfsArr1) {
		return null;
	}

	return todo
}

module.exports = findTrip
