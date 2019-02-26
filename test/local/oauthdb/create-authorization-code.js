/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const { assert } = require('chai')
const nock = require('nock')
const oauthdbModule = require('../../../lib/oauthdb')
const error = require('../../../lib/error')
const { mockLog } = require('../../mocks')

const MOCK_CLIENT_ID = '0123456789ABCDEF';
const mockSessionToken = {
  emailVerified: true,
  tokenVerified: true,
  uid: 'ABCDEF123456',
  lastAuthAt: () => Date.now(),
  authenticationMethods: ['pwd', 'email'],
}
const mockConfig = {
  publicUrl: 'https://accounts.example.com',
  oauth: {
    url: 'https://oauth.server.com',
    secretKey: 'secret-key-oh-secret-key',
  },
  domain: 'accounts.example.com'
}
const mockOAuthServer = nock(mockConfig.oauth.url).defaultReplyHeaders({
  'Content-Type': 'application/json'
})

describe('oauthdb/checkRefreshToken', () => {
  let oauthdb

  afterEach(async () => {
    assert.ok(nock.isDone(), 'there should be no pending request mocks at the end of a test')
    if (oauthdb) {
      await oauthdb.close()
    }
  })

  it('can use a sessionToken to return a code', async () => {
    mockOAuthServer.post('/v1/authorization', body => true)
      .reply(200, {
        redirect: 'http://localhost/mock/redirect',
        code: '11111122222233333344444455555566',
        state: 'xyz',
      })
    oauthdb = oauthdbModule(mockLog(), mockConfig)
    const res = await oauthdb.createAuthorizationCode(mockSessionToken, {
      client_id: MOCK_CLIENT_ID,
      state: 'xyz'
    })
    assert.deepEqual(res, {
      redirect: 'http://localhost/mock/redirect',
      code: '11111122222233333344444455555566',
      state: 'xyz',
    })
  })

  it('refuses to do response_type=token grants', async () => {
    oauthdb = oauthdbModule(mockLog(), mockConfig)
    try {
      await oauthdb.createAuthorizationCode(mockSessionToken, {
        client_id: MOCK_CLIENT_ID,
        state: 'xyz',
        response_type: 'token'
      })
      throw new Error('should have thrown')
    } catch (err) {
      assert.ok(err)
      assert.equal(err.errno, error.ERRNO.INTERNAL_VALIDATION_ERROR)
    }
  })
})
