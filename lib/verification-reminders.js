/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use strict'

const P = require('./promise')

const INTERVAL_PATTERN = /^([a-z]+)Interval$/

module.exports = (log, config) => {
  const redis = require('fxa-shared/redis')({
    ...config.redis,
    ...config.verificationReminders.redis
  }, log)

  const { rolloutRate } = config.verificationReminders

  const { keys, intervals } = Object.entries(config.verificationReminders).reduce(({ keys, intervals }, [ key, value ]) => {
    const matches = INTERVAL_PATTERN.exec(key)
    if (matches && matches.length === 2) {
      keys.push(matches[1])
      intervals.push(value)
    }
    return { keys, intervals }
  }, { keys: [], intervals: [] })

  return {
    create (uid) {
      if (rolloutRate <= 1 && Math.random() < rolloutRate) {
        const now = Date.now()
        return P.all(reminders.map(reminder => redis.zadd(reminder, now, uid)))
      }

      return P.resolve()
    },

    delete (uid) {
      return P.all(reminders.map(reminder => redis.zrem(reminder, uid)))
    },

    process () {
      const now = Date.now()
      return P.all(reminders.map(async (reminder, index) => {
        const cutoff = now - intervals[index]
        const results = await redis.zrangebyscore(reminder, 0, cutoff)
        await(redis.zremrangebyscore(reminder, 0, cutoff)
        return results
      })
    },
  }
}
