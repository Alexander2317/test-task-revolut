// @flow

import { put, call, select, delay, takeLatest } from 'redux-saga/effects'

import { converter } from '../selectors'
import { actionTypes, routes, messages, base } from '../constants'

import priceRation from './price-ratio'
import { updateAmout } from './converter'
import { fetchApi } from './utils'

function* getExchangeRate(action): Generator<Object, void, any> {
  const {
    payload: { type },
  } = action
  const { from, to } = yield select(converter.getEntitiesSelector)
  yield put({
    type: actionTypes.GET_EXCHANGE_RATE_START,
  })

  try {
    const { data, error } = yield call(
      fetchApi,
      `${routes.api}?base=${from.currency}&symbols=${to.currency}`,
    )
    if (error) {
      return yield put({
        type: actionTypes.GET_EXCHANGE_RATE_FAIL,
        error: {
          message: error,
        },
      })
    }
    const { rates } = data
    if (Number.isNaN(rates[to.currency])) {
      return yield put({
        type: actionTypes.GET_EXCHANGE_RATE_FAIL,
        error: {
          message: messages.INVALID_RESPONSE,
        },
      })
    }
    const rate = rates[to.currency]
    yield put({
      type: actionTypes.GET_EXCHANGE_RATE_SUCCESS,
      payload: { rate },
    })
    yield call(priceRation, rate)
    if (type) {
      yield call(updateAmout, type)
    }
    yield delay(base.DELAY_REFETCH_RATE)
    return yield put({
      type: actionTypes.REFETCH_EXCHANGE_RATE,
    })
  } catch (error) {
    return yield put({
      type: actionTypes.GET_EXCHANGE_RATE_FAIL,
      error: {
        message: messages.ERROR_RESPONSE,
      },
    })
  }
}

function* saga(): Generator<Function, void, any> {
  yield takeLatest(actionTypes.REFETCH_EXCHANGE_RATE, getExchangeRate)
}

export default saga