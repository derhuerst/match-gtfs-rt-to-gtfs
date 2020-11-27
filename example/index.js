'use strict'

const {
	normalizeStopName,
	normalizeLineName,
} = require('./util')
const createMatchStop = require('../lib/match-stop')
const {createMatchDeparture} = require('../lib/match-arrival-departure')
const createMatchTrip = require('../lib/match-trip')
const createMatchMovement = require('../lib/match-movement')

const gtfsRtInfo = {
	endpointName: 'hvv-hafas',
	normalizeStopName,
	normalizeLineName,
}
const gtfsInfo = {
	endpointName: 'hvv', // todo: rename to dataSrcName?
	normalizeStopName,
	normalizeLineName,
}
const matchStop = createMatchStop(gtfsRtInfo, gtfsInfo)
const matchDeparture = createMatchDeparture(gtfsRtInfo, gtfsInfo)
const matchTrip = createMatchTrip(gtfsRtInfo, gtfsInfo)
const matchMovement = createMatchMovement(gtfsRtInfo, gtfsInfo)

const dep = {
	tripId: '1|27986|21|80|31102020',
	direction: 'Schlump - Barmbek',
	line: {
		type: 'line',
		id: 'hha-u-u3',
		fahrtNr: '93778',
		name: 'U3',
		public: true,
		adminCode: 'HHA-U_',
		mode: 'train',
		product: 'subway',
		operator: {
			type: 'operator',
			id: 'hochbahn-u-bahn',
			name: 'HOCHBAHN - U-Bahn',
		},
	},

	when: '2020-10-31T13:49:00+01:00',
	plannedWhen: '2020-10-31T13:49:00+01:00',
	delay: 0,
	platform: '2',
	plannedPlatform: '2',

	stop: {
		type: 'stop',
		id: '16269',
		name: 'Lübecker Straße',
		location: {latitude: 53.560095, longitude: 10.028788},
		station: {
			type: 'station',
			id: '82',
			name: 'Lübecker Straße',
			location: {latitude: 53.560095, longitude: 10.028788},
		},
	},
}

const arrDep = (stopId, stopName, stopLoc, plannedArrival, plannedDeparture) => ({
	stop: {
		id: stopId,
		name: stopName,
		location: stopLoc,
	},
	plannedArrival,
	plannedArrivalPlatform: null,
	plannedDeparture,
	plannedDeparturePlatform: null,
})

const trip = {
	"id": "1|27986|21|80|31102020",
	"direction": "Hauptbahnhof Süd - Schlump",
	"line": {
		"type": "line",
		"id": "hha-u-u3",
		"fahrtNr": "93778",
		"name": "U3",
		"public": true,
		"adminCode": "HHA-U_",
		"mode": "train",
		"product": "subway",
		"operator": {
			"type": "operator",
			"id": "hochbahn-u-bahn",
			"name": "HOCHBAHN - U-Bahn",
		}
	},

	"origin": {
		"type": "stop",
		"id": "16399",
		"name": "Barmbek",
		"location": {
			"type": "location",
			"id": "16399",
			"latitude": 53.587395,
			"longitude": 10.044448
		},
	},
	"plannedDeparture": "2020-10-31T13:41:00+01:00",
	"plannedDeparturePlatform": "4",

	"destination": {
		"type": "stop",
		"id": "16383",
		"name": "Barmbek",
		"location": {
			"type": "location",
			"id": "16383",
			"latitude": 53.587305,
			"longitude": 10.044385
		},
	},
	"plannedArrival": "2020-10-31T14:20:00+01:00",
	"plannedArrivalPlatform": null,

	"stopovers": [
		arrDep(
			"16399",
			"Barmbek",
			{latitude: 53.587395, longitude: 10.044448},
			null,
			"2020-10-31T13:41:00+01:00",
		),
		arrDep(
			"16385",
			"Dehnhaide",
			{latitude: 53.579143, longitude: 10.040879},
			"2020-10-31T13:43:00+01:00",
			"2020-10-31T13:43:00+01:00",
		),
		arrDep(
			"16387",
			"Hamburger Straße",
			{latitude: 53.57437, longitude: 10.037211},
			"2020-10-31T13:44:00+01:00",
			"2020-10-31T13:44:00+01:00",
		),
		arrDep(
			"16389",
			"Mundsburg",
			{latitude: 53.569426, longitude: 10.027539},
			"2020-10-31T13:46:00+01:00",
			"2020-10-31T13:46:00+01:00",
		),
		arrDep(
			"16265",
			"Uhlandstraße",
			{latitude: 53.564607, longitude: 10.026802},
			"2020-10-31T13:47:00+01:00",
			"2020-10-31T13:47:00+01:00",
		),
		arrDep(
			"16269",
			"Lübecker Straße",
			{latitude: 53.560095, longitude: 10.028788},
			"2020-10-31T13:49:00+01:00",
			"2020-10-31T13:49:00+01:00",
		),
		arrDep(
			"16275",
			"Berliner Tor",
			{latitude: 53.553011, longitude: 10.024617},
			"2020-10-31T13:51:00+01:00",
			"2020-10-31T13:51:00+01:00",
		),
		arrDep(
			"16282",
			"Hauptbahnhof Süd",
			{latitude: 53.552014, longitude: 10.009462},
			"2020-10-31T13:53:00+01:00",
			"2020-10-31T13:53:00+01:00",
		),
		arrDep(
			"16300",
			"Mönckebergstraße",
			{latitude: 53.551312, longitude: 10.001992},
			"2020-10-31T13:54:00+01:00",
			"2020-10-31T13:54:00+01:00",
		),
		arrDep(
			"16302",
			"Rathaus",
			{latitude: 53.550494, longitude: 9.994719},
			"2020-10-31T13:56:00+01:00",
			"2020-10-31T13:56:00+01:00",
		),
		arrDep(
			"16304",
			"Rödingsmarkt",
			{latitude: 53.547798, longitude: 9.986566},
			"2020-10-31T13:57:00+01:00",
			"2020-10-31T13:57:00+01:00",
		),
		arrDep(
			"16306",
			"Baumwall (Elbphilharmonie)",
			{latitude: 53.544229, longitude: 9.981703},
			"2020-10-31T13:59:00+01:00",
			"2020-10-31T13:59:00+01:00",
		),
		arrDep(
			"16429",
			"Landungsbrücken",
			{latitude: 53.546234, longitude: 9.970583},
			"2020-10-31T14:01:00+01:00",
			"2020-10-31T14:01:00+01:00",
		),
		arrDep(
			"16427",
			"St.Pauli",
			{latitude: 53.550782, longitude: 9.970188},
			"2020-10-31T14:03:00+01:00",
			"2020-10-31T14:03:00+01:00",
		),
		arrDep(
			"16312",
			"Feldstraße (Heiligengeistfeld)",
			{latitude: 53.55711, longitude: 9.968705},
			"2020-10-31T14:04:00+01:00",
			"2020-10-31T14:04:00+01:00",
		),
		arrDep(
			"16445",
			"Sternschanze (Messe)",
			{latitude: 53.563825, longitude: 9.969442},
			"2020-10-31T14:06:00+01:00",
			"2020-10-31T14:06:00+01:00",
		),
		arrDep(
			"16443",
			"Schlump",
			{latitude: 53.567583, longitude: 9.970125},
			"2020-10-31T14:08:00+01:00",
			"2020-10-31T14:08:00+01:00",
		),
		arrDep(
			"16465",
			"Hoheluftbrücke",
			{latitude: 53.577417, longitude: 9.976085},
			"2020-10-31T14:10:00+01:00",
			"2020-10-31T14:10:00+01:00",
		),
		arrDep(
			"16463",
			"Eppendorfer Baum",
			{latitude: 53.583898, longitude: 9.985487},
			"2020-10-31T14:11:00+01:00",
			"2020-10-31T14:11:00+01:00",
		),
		arrDep(
			"16461",
			"Kellinghusenstraße",
			{latitude: 53.588752, longitude: 9.991007},
			"2020-10-31T14:13:00+01:00",
			"2020-10-31T14:13:00+01:00",
		),
		arrDep(
			"16459",
			"Sierichstraße",
			{latitude: 53.590335, longitude: 10.00121},
			"2020-10-31T14:15:00+01:00",
			"2020-10-31T14:15:00+01:00",
		),
		arrDep(
			"16391",
			"Borgweg (Stadtpark)",
			{latitude: 53.59073, longitude: 10.01419},
			"2020-10-31T14:16:00+01:00",
			"2020-10-31T14:16:00+01:00",
		),
		arrDep(
			"16393",
			"Saarlandstraße",
			{latitude: 53.589112, longitude: 10.031611},
			"2020-10-31T14:18:00+01:00",
			"2020-10-31T14:18:00+01:00",
		),
		arrDep(
			"16383",
			"Barmbek",
			{latitude: 53.587305, longitude: 10.044385},
			"2020-10-31T14:21:00+01:00",
			null,
		),
	],
}

const movement = {
	location: {latitude: 1.23, longitude: 2.34},

	tripId: '1|27986|21|80|31102020',
	direction: 'Schlump - Barmbek',
	line: {
		type: 'line',
		id: 'hha-u-u3',
		fahrtNr: '93778',
		name: 'U3',
		public: true,
		adminCode: 'HHA-U_',
		mode: 'train',
		product: 'subway',
		operator: {
			type: 'operator',
			id: 'hochbahn-u-bahn',
			name: 'HOCHBAHN - U-Bahn',
		},
	},

	nextStopovers: [{
		stop: {
			type: 'stop',
			id: '16269',
			name: 'Lübecker Straße',
			location: {latitude: 53.560095, longitude: 10.028788},
			station: {
				type: 'station',
				id: '82',
				name: 'Lübecker Straße',
				location: {latitude: 53.560095, longitude: 10.028788},
			},
		},

		arrival: null, plannedArrival: null, arrivalDelay: null,
		arrivalPlatform: null, plannedArrivalPlatform: null,

		departure: '2020-10-31T13:49:00+01:00',
		plannedDeparture: '2020-10-31T13:49:00+01:00',
		departureDelay: 0,
		departurePlatform: '2',
		plannedDeparturePlatform: '2',
	}],
}

;(async () => {
	console.log(await matchStop(dep.stop))
	console.log(await matchDeparture(dep))
	console.log(await matchTrip(trip))
	console.log(await matchMovement(movement))
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
