'use strict'

const Redis = require('ioredis')

const opts = {}
if (process.env.REDIS_URL) {
	const url = new URL(process.env.REDIS_URL, 'redis://127.0.0.1:6379')
	if (url.hostname) opts.host = url.hostname
	if (url.port) opts.port = url.port
	if (url.password) opts.password = url.password
	if (url.pathname && url.pathname.length > 1) {
		opts.db = parseInt(url.pathname.slice(1))
	}
}

const redis = new Redis(opts)

module.exports = redis
