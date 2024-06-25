import {strictEqual} from 'node:assert'
import {createMatch} from '../../index.js'
import gtfsRtInfo from '../gtfs-rt-info.js'
import gtfsInfo from '../gtfs-info.js'
import {MATCHED} from '../../lib/matched.js'
import {redis} from '../../lib/redis.js'
import {db} from '../../lib/db.js'

const {
	matchDeparture,
} = createMatch(gtfsRtInfo, gtfsInfo)

const twoTripsSameTimeSameStopSameLine = async () => {
	const dep0 = {
		tripId: 'doesnt-match',
		// make sure the direction field is normalized
		direction: 'S+U FrIeDrIcHsTr.     BhF (BeRlIn)',
		line: {
			// S1 replacement service
			id: 'doesnt-match-either',
			name: 'S1A',
			mode: 'bus',
			operator: {id: 'whatever'},
		},
		stop: {
			type: 'stop',
			id: 'also-doesnt-match',
			name: 'S+U Friedrichstr. Bhf (Berlin)',
			location: {
				type: 'location',
				// https://github.com/derhuerst/stable-public-transport-ids/blob/3.0.0/stop.js#L22-L35
				// snapped/rounded to 52.521
				latitude: 52.520531 + .0001,
				// snapped/rounded to 13.388
				longitude: 13.3873 + .0001,
			},
			station: null,
		},
		when: '2024-01-07T15:24+01:00',
		plannedWhen: '2024-01-07T15:24+01:00',
		delay: null,
		platform: null, plannedPlatform: null,
	}
	const res0 = await matchDeparture(dep0)
	strictEqual(res0[MATCHED], true, 'MATCHED should be true')
}

{
	await redis.flushdb()

	await twoTripsSameTimeSameStopSameLine()

	await redis.flushdb()
	redis.quit()
	await db.end()
}
