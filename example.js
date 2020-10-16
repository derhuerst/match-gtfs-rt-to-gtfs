'use strict'

const matchStop = require('./lib/match-stop')
const {matchDeparture} = require('.')
const matchTrip = require('./lib/match-trip')

const dep = {
	tripId: '1|31269|0|86|16102020',
	direction: 'Parchim, Bhf',
	line: {
		id: 'rb13',
		name: 'RB 13',
		mode: 'train',
		product: 'regional',
		operator: {
			id: 'odeg-ostdeutsche-eisenbahn-gmbh',
			name: 'ODEG Ostdeutsche Eisenbahn GmbH',
		},
	},

	when: '2020-10-16T22:21:00+02:00',
	plannedWhen: '2020-10-16T22:21:00+02:00',
	delay: 0,
	platform: '1',
	plannedPlatform: '1',

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
	id: "1|18006|13|86|16102020",
	direction: "S Schöneweide",
	line: {
		type: "line",
		id: "21",
		fahrtNr: "1151",
		name: "21",
		mode: "train",
		product: "tram",
		operator: {
			id: "berliner-verkehrsbetriebe",
			name: "Berliner Verkehrsbetriebe",
		},
	},

	origin: {
		type: "stop",
		id: "900000160021",
		name: "S+U Lichtenberg/Gudrunstr.",
		location: {
			latitude: 52.512366,
			longitude: 13.500063
		},
	},
	plannedDeparture: "2020-10-16T18:33:00+02:00",
	plannedDeparturePlatform: null,

	destination: {
		type: "stop",
		id: "900000162504",
		name: "Blockdammweg/Ehrlichstr.",
		location: {
			latitude: 52.484095,
			longitude: 13.509834,
		},
	},
	plannedArrival: "2020-10-16T19:13:00+02:00",
	plannedArrivalPlatform: null,

	stopovers: [
		arrDep(
			"900000160021",
			"S+U Lichtenberg/Gudrunstr.",
			{latitude: 52.512366, longitude: 13.500063},
			null,
			"2020-10-16T18:33:00+02:00",
		),
		arrDep(
			"900000160020",
			"S+U Lichtenberg/Siegfriedstr.",
			{latitude: 52.511953, longitude: 13.497654},
			"2020-10-16T18:34:00+02:00",
			"2020-10-16T18:34:00+02:00",
		),
		arrDep(
			"900000160016",
			"Freiaplatz",
			{latitude: 52.515683, longitude: 13.498616},
			"2020-10-16T18:35:00+02:00",
			"2020-10-16T18:35:00+02:00",
		),
		arrDep(
			"900000160523",
			"Gotlindestr.",
			{latitude: 52.518119, longitude: 13.499389},
			"2020-10-16T18:36:00+02:00",
			"2020-10-16T18:36:00+02:00",
		),
		arrDep(
			"900000160522",
			"Betriebshof Lichtenberg",
			{latitude: 52.519989, longitude: 13.49938},
			"2020-10-16T18:37:00+02:00",
			"2020-10-16T18:37:00+02:00",
		),
		arrDep(
			"900000160521",
			"Siegfriedstr./Josef-Orlopp-Str.",
			{latitude: 52.522875, longitude: 13.499434},
			"2020-10-16T18:38:00+02:00",
			"2020-10-16T18:38:00+02:00",
		),
		arrDep(
			"900000160012",
			"Herzbergstr./Siegfriedstr.",
			{latitude: 52.526228, longitude: 13.499964},
			"2020-10-16T18:39:00+02:00",
			"2020-10-16T18:39:00+02:00",
		),
		arrDep(
			"900000160712",
			"Herzbergstr./ Siegfriedstr",
			{latitude: 52.526344, longitude: 13.49911},
			"2020-10-16T18:40:00+02:00",
			"2020-10-16T18:40:00+02:00",
		),
		arrDep(
			"900000160518",
			"Herzbergstr./Industriegebiet",
			{latitude: 52.526578, longitude: 13.489833},
			"2020-10-16T18:41:00+02:00",
			"2020-10-16T18:41:00+02:00",
		),
		arrDep(
			"900000160509",
			"Bernhard-Bästlein-Str.",
			{latitude: 52.526767, longitude: 13.4823},
			"2020-10-16T18:43:00+02:00",
			"2020-10-16T18:43:00+02:00",
		),
		arrDep(
			"900000160014",
			"Möllendorffstr./Storkower Str.",
			{latitude: 52.523171, longitude: 13.479271},
			"2020-10-16T18:45:00+02:00",
			"2020-10-16T18:45:00+02:00",
		),
		arrDep(
			"900000160017",
			"Loeperplatz",
			{latitude: 52.52007, longitude: 13.479918},
			"2020-10-16T18:47:00+02:00",
			"2020-10-16T18:47:00+02:00",
		),
		arrDep(
			"900000160538",
			"Scheffelstr./Paul-Junius-Str.",
			{latitude: 52.520501, longitude: 13.473805},
			"2020-10-16T18:48:00+02:00",
			"2020-10-16T18:48:00+02:00",
		),
		arrDep(
			"900000120539",
			"James-Hobrecht-Str.",
			{latitude: 52.52016, longitude: 13.466947},
			"2020-10-16T18:49:00+02:00",
			"2020-10-16T18:49:00+02:00",
		),
		arrDep(
			"900000120538",
			"Proskauer Str.",
			{latitude: 52.519854, longitude: 13.463117},
			"2020-10-16T18:50:00+02:00",
			"2020-10-16T18:50:00+02:00",
		),
		arrDep(
			"900000120542",
			"Forckenbeckplatz",
			{latitude: 52.520403, longitude: 13.459567},
			"2020-10-16T18:51:00+02:00",
			"2020-10-16T18:51:00+02:00",
		),
		arrDep(
			"900000120816",
			"Bersarinplatz [Weidenweg]",
			{latitude: 52.519072, longitude: 13.454658},
			"2020-10-16T18:53:00+02:00",
			"2020-10-16T18:53:00+02:00",
		),
		arrDep(
			"900000120008",
			"U Frankfurter Tor",
			{latitude: 52.515773, longitude: 13.454083},
			"2020-10-16T18:56:00+02:00",
			"2020-10-16T18:56:00+02:00",
		),
		arrDep(
			"900000120517",
			"Niederbarnimstr.",
			{latitude: 52.512762, longitude: 13.457859},
			"2020-10-16T18:58:00+02:00",
			"2020-10-16T18:58:00+02:00",
		),
		arrDep(
			"900000120518",
			"Wismarplatz",
			{latitude: 52.510604, longitude: 13.463684},
			"2020-10-16T18:59:00+02:00",
			"2020-10-16T18:59:00+02:00",
		),
		arrDep(
			"900000120013",
			"Boxhagener Str./Holteistr.",
			{latitude: 52.508609, longitude: 13.466299},
			"2020-10-16T19:00:00+02:00",
			"2020-10-16T19:00:00+02:00",
		),
		arrDep(
			"900000120519",
			"Neue Bahnhofstr.",
			{latitude: 52.506415, longitude: 13.46976},
			"2020-10-16T19:02:00+02:00",
			"2020-10-16T19:02:00+02:00",
		),
		arrDep(
			"900000160535",
			"Marktstr.",
			{latitude: 52.502802, longitude: 13.474776},
			"2020-10-16T19:04:00+02:00",
			"2020-10-16T19:04:00+02:00",
		),
		arrDep(
			"900000160001",
			"S Rummelsburg",
			{latitude: 52.501211, longitude: 13.478696},
			"2020-10-16T19:06:00+02:00",
			"2020-10-16T19:06:00+02:00",
		),
		arrDep(
			"900000160536",
			"Kosanke-Siedlung",
			{latitude: 52.496707, longitude: 13.485797},
			"2020-10-16T19:08:00+02:00",
			"2020-10-16T19:08:00+02:00",
		),
		arrDep(
			"900000160502",
			"Gustav-Holzmann-Str.",
			{latitude: 52.493129, longitude: 13.490651},
			"2020-10-16T19:09:00+02:00",
			"2020-10-16T19:09:00+02:00",
		),
		arrDep(
			"900000160006",
			"Heizkraftwerk",
			{latitude: 52.487924, longitude: 13.496126},
			"2020-10-16T19:10:00+02:00",
			"2020-10-16T19:10:00+02:00",
		),
		arrDep(
			"900000160007",
			"Köpenicker Chaussee/Blockdammweg",
			{latitude: 52.483439, longitude: 13.502364},
			"2020-10-16T19:12:00+02:00",
			"2020-10-16T19:12:00+02:00",
		),
		arrDep(
			"900000162504",
			"Blockdammweg/Ehrlichstr.",
			{latitude: 52.484095, longitude: 13.509834},
			"2020-10-16T19:13:00+02:00",
			null,
		),
	],
}

;(async () => {
	console.log(await matchStop(dep.stop))
	console.log(await matchDeparture(dep))
	console.log(await matchTrip(trip))
})()
.catch((err) => {
	console.error(err)
	process.exit(1)
})
