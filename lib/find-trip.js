'use strict'

const findArrDep = require('./find-arrival-departure')
const matchStop = require('./match-stop')

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

const findTrip = async (t) => {
	if (!Array.isArray(t.stopovers) || t.stopovers.length === 0) return null;

	const firstDep = stopoverToArrDep('departure', t.stopovers[0], t)
	const lastArr = stopoverToArrDep('arrival', t.stopovers[t.stopovers.length - 1], t)
	const [
		gtfsFirstDep,
		gtfsLastArr,
	] = await Promise.all([
		findArrDep('departure', firstDep),
		findArrDep('arrival', lastArr),
	])
	if (!gtfsFirstDep) {
		return null;
	}
	if (!gtfsLastArr) {
		return null;
	}

	const gtfsStopovers = await Promise.all(t.stopovers.map(async (st) => {
		return {
			...st,
			stop: await matchStop(st.stop),
		}
	}))

	return {
		...t,

		id: gtfsFirstDep.tripId,
		direction: gtfsFirstDep.direction,
		line: gtfsFirstDep.line,

		origin: gtfsFirstDep.stop,
		plannedDeparture: gtfsFirstDep.plannedWhen,
		plannedDeparturePlatform: gtfsFirstDep.plannedPlatform,
		destination: gtfsLastArr.stop,
		plannedArrival: gtfsLastArr.plannedWhen,
		plannedArrivalPlatform: gtfsLastArr. plannedPlatform,

		stopovers: gtfsStopovers,
	}
}

module.exports = findTrip
