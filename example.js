'use strict'

const {matchDeparture} = require('.')

const dep = {
	tripId: 'vbb-rb13-abcdefg', // this is made up
	direction: 'Parchim Bhf',
	line: {
		id: '1234567', // this is made up
		name: 'RB 13',
		mode: 'train',
		product: 'regional',
		fahrtNr: '68998',
	},

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
	console.log(await matchDeparture(dep))
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
