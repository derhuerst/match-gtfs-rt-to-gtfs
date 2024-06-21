import {stringify as csvStringifier} from 'csv-stringify'

const csv = csvStringifier({
	quoted: true,
})
csv.pipe(process.stdout)

export {
	csv,
}
