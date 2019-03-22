/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict'

const ROOT_DIR = '../../..'

const sinon = require('sinon')
const assert = { ...sinon.assert, ...require('chai').assert }
const uuid = require('uuid')
const getRoute = require('../../routes_helpers').getRoute
const mocks = require('../../mocks')

const MOCK_CLIENT_ID = '01234567890ABCDEF'
const MOCK_SCOPES = 'mock-scope another-scope'

describe('/oauth/ routes', () => {
  let mockOAuthDB, mockLog, sessionToken

  async function loadAndCallRoute(path, request) {
    const routes = require('../../../lib/routes/oauth')(mockLog, {}, mockOAuthDB)
    const response = await getRoute(routes, path).handler(request)
    if (response instanceof Error) {
      throw response
    }
    return response
  }

  async function mockSessionToken(props = {}) {
    const Token = require(`${ROOT_DIR}/lib/tokens/token`)(mockLog)
    const SessionToken = require(`${ROOT_DIR}/lib/tokens/session_token`)(mockLog, Token, {
      tokenLifetimes: {
        sessionTokenWithoutDevice: 2419200000
      }
    })
    return await SessionToken.create({
      uid: uuid.v4('binary').toString('hex'),
      email: 'foo@example.com',
      emailVerified: true,
      ...props,
    })
  }

  beforeEach(() => {
    mockLog = mocks.mockLog()
  })

  describe('/oauth/client/{client_id}', () => {

    it('calls oauthdb.getClientInfo', async () => {
      mockOAuthDB = mocks.mockOAuthDB({
        getClientInfo: sinon.spy(async () => {
          return { id: MOCK_CLIENT_ID, name: 'mock client' }
        })
      })
      const mockRequest = mocks.mockRequest({
        params: {
          client_id: MOCK_CLIENT_ID
        }
      })
      const resp = await loadAndCallRoute('/oauth/client/{client_id}', mockRequest)
      assert.calledOnce(mockOAuthDB.getClientInfo)
      assert.calledWithExactly(mockOAuthDB.getClientInfo, MOCK_CLIENT_ID)
      assert.equal(resp.id, MOCK_CLIENT_ID)
      assert.equal(resp.name, 'mock client')
    })

  })

  describe('/account/scoped-key-data', () => {

    it('calls oauthdb.getScopedKeyData', async () => {
      mockOAuthDB = mocks.mockOAuthDB({
        getScopedKeyData: sinon.spy(async () => {
          return { key: 'data' }
        })
      })
      sessionToken = await mockSessionToken()
      const mockRequest = mocks.mockRequest({
        credentials: sessionToken,
        payload: {
          client_id: MOCK_CLIENT_ID,
          scope: MOCK_SCOPES
        }
      })
      const resp = await loadAndCallRoute('/account/scoped-key-data', mockRequest)
      assert.calledOnce(mockOAuthDB.getScopedKeyData)
      assert.calledWithExactly(mockOAuthDB.getScopedKeyData, sessionToken, {
        client_id: MOCK_CLIENT_ID,
        scope: MOCK_SCOPES
      })
      assert.deepEqual(resp, { key: 'data' })
    })
  })


  describe('/oauth/authorization', () => {

    it('calls oauthdb.createAuthorizationCode', async () => {
      mockOAuthDB = mocks.mockOAuthDB({
        createAuthorizationCode: sinon.spy(async () => {
          return {
            redirect: 'bogus',
            code: 'aaabbbccc',
            state: 'xyz'
          }
        })
      })
      sessionToken = await mockSessionToken()
      const mockRequest = mocks.mockRequest({
        credentials: sessionToken,
        payload: {
          client_id: MOCK_CLIENT_ID,
          scope: MOCK_SCOPES,
          state: 'xyz',
        }
      })
      const resp = await loadAndCallRoute('/oauth/authorization', mockRequest)
      assert.calledOnce(mockOAuthDB.createAuthorizationCode)
      assert.calledWithExactly(mockOAuthDB.createAuthorizationCode, sessionToken, {
        client_id: MOCK_CLIENT_ID,
        scope: MOCK_SCOPES,
        state: 'xyz',
      })
      assert.deepEqual(resp, {
        redirect: 'bogus',
        code: 'aaabbbccc',
        state: 'xyz'
      })
    })
  })
})
