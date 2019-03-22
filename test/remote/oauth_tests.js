/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const { assert } = require('chai')
const TestServer = require('../test_server')
const Client = require('../client')()
const config = require('../../config').getProperties()
const testUtils = require('../lib/util')
const oauthServerModule = require('../../fxa-oauth-server/lib/server')


const PUBLIC_CLIENT_ID = '3c49430b43dfba77'

describe('/oauth/authorization', function () {
  this.timeout(15000)
  let client
  let email
  let oauthServer
  let password
  let server

  before(async () => {
    testUtils.disableLogs()
    oauthServer = await oauthServerModule.create()
    await oauthServer.start()
    server = await TestServer.start(config, false, {oauthServer})
  })

  after(async () => {
    await TestServer.stop(server)
    await oauthServer.stop()
    testUtils.restoreStdoutWrite()
  })

  beforeEach(async () => {
    email = server.uniqueEmail()
    password = 'test password'
    client = await Client.createAndVerify(config.publicUrl, email, password, server.mailbox)
  })

  it('successfully grants an authorization code', async () => {
    const res = await client.createAuthorizationCode({
      client_id: PUBLIC_CLIENT_ID,
      state: 'xyz'
    })
    assert.ok(res.redirect);
    assert.ok(res.code);
    assert.equal(res.state, 'xyz');
  })

  it('rejects `assertion` parameter in /authorization request', async () => {
    const res = await client.createAuthorizationCode({
      client_id: PUBLIC_CLIENT_ID,
      state: 'xyz',
      assertion: 'a~b'
    })
    throw new Error('should have thrown');
  })
})
