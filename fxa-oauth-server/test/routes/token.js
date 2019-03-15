/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { assert } = require('chai');
const Joi = require('joi');
const route = require('../../lib/routes/token');

const CLIENT_SECRET = 'b93ef8a8f3e553a430d7e5b904c6132b2722633af9f03128029201d24a97f2a8';
const CLIENT_ID = '98e6508e88680e1b';
const CODE = 'df6dcfe7bf6b54a65db5742cbcdce5c0a84a5da81a0bb6bdf5fc793eef041fc6';
const PKCE_CODE_VERIFIER = 'au3dqDz2dOB0_vSikXCUf4S8Gc-37dL-F7sGxtxpR3R';

function joiRequired(err, param) {
  assert.ok(err.isJoi);
  assert.ok(err.name, 'ValidationError');
  assert.equal(err.details[0].message, `"${param}" is required`);
}

function joiNotAllowed(err, param) {
  assert.ok(err.isJoi);
  assert.ok(err.name, 'ValidationError');
  assert.equal(err.details[0].message, `"${param}" is not allowed`);
}

describe('/token POST', function () {
  // route validation function
  function v(req, ctx, cb) {
    if (typeof ctx === 'function' && ! cb) {
      cb = ctx;
      ctx = undefined;
    }
    Joi.validate(req, route.validate.payload, {context: ctx}, cb);
  }

  it('fails with no client_id', (done) => {
    v({
      client_secret: CLIENT_SECRET,
      code: CODE
    }, (err) => {
      joiRequired(err, 'client_id');
      done();
    });
  });

  it('valid client_secret scheme', (done) => {
    v({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: CODE
    }, (err) => {
      assert.equal(err, null);
      done();
    });
  });

  it('requires client_secret', (done) => {
    v({
      client_id: CLIENT_ID,
      code: CODE
    }, (err) => {
      joiRequired(err, 'client_secret');
      done();
    });
  });

  it('forbids client_id when authz header provided', (done) => {
    v({
      client_id: CLIENT_ID
    }, {
      headers: {
        authorization: 'Basic ABCDEF'
      }
    }, (err) => {
      joiNotAllowed(err, 'client_id');
      done();
    });
  });

  it('forbids client_secret when authz header provided', (done) => {
    v({
      client_secret: CLIENT_SECRET,
      code: CODE
    }, {
      headers: {
        authorization: 'Basic ABCDEF'
      }
    }, (err) => {
      joiNotAllowed(err, 'client_secret');
      done();
    });
  });

  describe('pkce', () => {
    it('accepts pkce code_verifier instead of client_secret', (done) => {
      v({
        client_id: CLIENT_ID,
        code_verifier: PKCE_CODE_VERIFIER,
        code: CODE
      }, (err) => {
        assert.equal(err, null);
        done();
      });
    });

    it('rejects pkce code_verifier that is too small', (done) => {
      const bad_code_verifier = PKCE_CODE_VERIFIER.substring(0, 32);
      v({
        client_id: CLIENT_ID,
        code_verifier: bad_code_verifier,
        code: CODE
      }, (err) => {
        assert.ok(err.isJoi);
        assert.ok(err.name, 'ValidationError');
        assert.equal(err.details[0].message, `"code_verifier" length must be at least 43 characters long`); // eslint-disable-line quotes
        done();
      });
    });

    it('rejects pkce code_verifier that is too big', (done) => {
      const bad_code_verifier = PKCE_CODE_VERIFIER + PKCE_CODE_VERIFIER + PKCE_CODE_VERIFIER + PKCE_CODE_VERIFIER;
      v({
        client_id: CLIENT_ID,
        code_verifier: bad_code_verifier,
        code: CODE
      }, (err) => {
        assert.ok(err.isJoi);
        assert.ok(err.name, 'ValidationError');
        assert.equal(err.details[0].message, `"code_verifier" length must be less than or equal to 128 characters long`);  // eslint-disable-line quotes
        done();
      });
    });

    it('rejects pkce code_verifier that contains invalid characters', (done) => {
      const bad_code_verifier = PKCE_CODE_VERIFIER + ' :.';
      v({
        client_id: CLIENT_ID,
        code_verifier: bad_code_verifier,
        code: CODE
      }, (err) => {
        assert.ok(err.isJoi);
        assert.ok(err.name, 'ValidationError');
        assert.equal(err.details[0].message, `"code_verifier" with value "${bad_code_verifier}" fails to match the required pattern: /^[A-Za-z0-9-_]+$/`);
        done();
      });
    });
  });

});
