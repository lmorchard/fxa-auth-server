/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

'use strict'

const ROOT_DIR = '../..'

const { assert } = require('chai')
const config = require(`${ROOT_DIR}/config`).getProperties()
const mocks = require('../mocks')

describe('lib/verification-reminders:', () => {
  let log, mockConfig, redis, verificationReminders

  beforeEach(() => {
    log = mocks.mockLog()
    mockConfig = {
      redis: config.redis,
      verificationReminders: {
        rolloutRate: 1,
        firstInterval: 1000,
        secondInterval: 2000,
        thirdInterval: 4000,
        redis: {
          maxConnections: 1,
          minConnections: 1,
          prefix: 'test-verification-reminders:',
        },
      },
    }
    redis = require('fxa-shared/redis')({
      ...config.redis,
      enabled: true,
      maxConnections: 1,
      minConnections: 1,
      prefix: 'test-verification-reminders:',
    }, mocks.mockLog())
    verificationReminders = require(`${ROOT_DIR}/lib/verification-reminders`)(log, config)
  })

  it('returned the expected interface', () => {
    assert.isObject(verificationReminders)
    assert.lengthOf(Object.keys(verificationReminders), 3)

    assert.isFunction(verificationReminders.create)
    assert.lengthOf(verificationReminders.create, 1)

    assert.isFunction(verificationReminders.delete)
    assert.lengthOf(verificationReminders.delete, 1)

    assert.isFunction(verificationReminders.process)
    assert.lengthOf(verificationReminders.process, 0)
  })
})
