var path = require('path')
require(path.join(__dirname, '/../test_helpers/html_assertions.js'))
var assert = require('assert')
var CardModel = require(path.join(__dirname, '/../../app/models/card.js'))
var nock = require('nock')
var wrongPromise = require(path.join(__dirname, '/../test_helpers/test_helpers.js')).unexpectedPromise

var aRequestId = 'unique-request-id'
var aCorrelationHeader = {
  reqheaders: {
    'x-request-id': aRequestId
  }
}

describe('card', function () {
  describe('check card', function () {
    describe('when card is not found', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
            .post('/v1/api/card')
            .reply(404)
      })

      it('should return the correct message', function () {
        return CardModel({}, aRequestId).checkCard(1234).then(wrongPromise, function (message) {
          assert.equal(message, 'Your card is not supported')
        })
      })
    })

    describe('when an unexpected response code', function () {
      before(function () {
        nock.cleanAll()

        nock(process.env.CARDID_HOST, aCorrelationHeader)
            .post('/v1/api/card')
            .reply(201)
      })

      it('should resolve', function () {
        return CardModel({}, aRequestId).checkCard(1234).then(() => {}, wrongPromise)
      })
    })

    describe('an unkown card', function () {
      before(function () {
        nock.cleanAll()

        nock(process.env.CARDID_HOST)
            .post('/v1/api/card')
            .reply(201)
      })

      it('should resolve', function () {
        return CardModel().checkCard(1234).then(() => {}, wrongPromise)
      })
    })

    describe('a card that is not allowed', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar'})
      })

      it('should reject with appropriate message', function () {
        return CardModel([{brand: 'foo', label: 'foo', type: 'CREDIT', id: 'id-0'}])
        .checkCard(1234).then(wrongPromise, function (message) {
          assert.equal(message, 'Bar is not supported')
        })
      })
    })

    describe('a card that is not allowed debit withrawal type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'D'})
      })

      it('should reject with appropriate message', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}], aRequestId)
        .checkCard(1234).then(wrongPromise, function (message) {
          assert.equal(message, 'Bar debit cards are not supported')
        })
      })
    })

    describe('a card that is not allowed Credit withrawal type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'C'})
      })

      it('should reject with appropriate message', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'DEBIT', id: 'id-0'}])
        .checkCard(1234).then(wrongPromise, function (message) {
          assert.equal(message, 'Bar credit cards are not supported')
        })
      })
    })

    describe('a card that is allowed', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'C'})
      })

      it('should resolve with correct card brand', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}])
          .checkCard(1234).then((cardBrand) => {
            assert.equal(cardBrand, 'bar')
          }, wrongPromise)
      })
    })

    describe('a card that is allowed but of unknown type', function () {
      before(function () {
        nock.cleanAll()
        nock(process.env.CARDID_HOST)
          .post('/v1/api/card')
          .reply(200, {brand: 'bar', label: 'bar', type: 'CD'})
      })

      it('should resolve with correct card brand', function () {
        return CardModel([{brand: 'bar', label: 'bar', type: 'CREDIT', id: 'id-0'}])
          .checkCard(1234).then((cardBrand) => {
            assert.equal(cardBrand, 'bar')
          }, wrongPromise)
      })
    })
  })

  describe('allowedCards', function () {
    it('should return the passed in cards', function () {
      var cards = [{brand: 'foo', debit: true}]
      var Card = CardModel(cards)
      var CardCopy = CardModel(cards)
      assert.deepEqual(Card.allowed, cards)
      // shoudl return a copy
      assert.notEqual(Card.allowed, cards)
      assert.notEqual(Card.allowed, CardCopy.allowed)
    })

    it('should return the passed in cards wityhdrawal types', function () {
      var debitOnly = CardModel([{brand: 'foo', debit: true}])
      var creditOnly = CardModel([{brand: 'foo', credit: true}])
      var both = CardModel([{brand: 'foo', credit: true, debit: true}])

      assert.deepEqual(debitOnly.withdrawalTypes, ['debit'])
      assert.deepEqual(creditOnly.withdrawalTypes, ['credit'])
      assert.deepEqual(both.withdrawalTypes, ['debit', 'credit'])
    })
  })

  describe('withdrawalTypes', function () {
    it('should return the passed in cards wityhdrawal types', function () {
      var debitOnly = CardModel([{brand: 'foo', debit: true}])
      var creditOnly = CardModel([{brand: 'foo', credit: true}])
      var both = CardModel([{brand: 'foo', credit: true, debit: true}])

      assert.deepEqual(debitOnly.withdrawalTypes, ['debit'])
      assert.deepEqual(creditOnly.withdrawalTypes, ['credit'])
      assert.deepEqual(both.withdrawalTypes, ['debit', 'credit'])
    })
  })
})
