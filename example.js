'use strict'

const matchArrDep = require('./lib/match-arrival-departure')

const dep = {
	tripId: 'vbb-rb13-abcdefg',
	direction: 'Parchim Bhf',
	fahrtNr: '68998',

	plannedWhen: '2020-09-21T22:21:48+02:00',
	plannedPlatform: null,

	stop: {
		type: 'station',
		id: '900000559813',
		name: 'Schwerin-Margaretenhof',
		location: {
			latitude: 53.65855,
			longitude: 11.36098,
		},
	},
}

;(async () => {
	console.log(await matchArrDep('departure', dep))
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
