import {stringify as csvStringifier} from 'csv-stringify'

const csvPrinter = csvStringifier({
	quoted: true,
})
csvPrinter.pipe(process.stdout)

export {
	csvPrinter,
}
