import { logError, uniqueByValue } from '../lib/helper'
import axios from 'axios'
import { PYTHON_SERVER } from '../lib/utils'

export const state = () => {
  return {
    history: [],
    historyLoaded: false
  }
}
export const mutations = {
  IMPORT_HISTORY_FROM_JSON(state, json) {
    if (typeof localStorage !== 'undefined') {
      let history
      try {
        history = JSON.parse(json)
      } catch (err) {
        logError(err)
      }
      if (history) {
        state.history = history
        localStorage.setItem('zthHistory', JSON.stringify(state.history))
      }
      state.historyLoaded = true
    }
  },
  LOAD_HISTORY(state) {
    if (typeof localStorage !== 'undefined') {
      let history = JSON.parse(localStorage.getItem('zthHistory') || '[]')
      history = uniqueByValue(history, 'id')
      state.history = history || state.history
      state.historyLoaded = true
    }
  },
  ADD_HISTORY_ITEM(state, historyItem) {
    if (typeof localStorage !== 'undefined') {
      let history = state.history
      let prevVersionOfSameItemIndex = history.findIndex(i => i.id === historyItem.id)
      if (prevVersionOfSameItemIndex !== -1)
        history[prevVersionOfSameItemIndex] = historyItem
      else history.push(historyItem)
      localStorage.setItem('zthHistory', JSON.stringify(history))
      this._vm.$set(state, 'history', history)
    }
  },
  REMOVE_HISTORY_ITEM(state, historyItem) {
    if (typeof localStorage !== 'undefined' && state.history) {
      const keepers = state.history.filter(
        item => item.id !== historyItem.id
      )
      let history = [].concat(state.history)
      history = keepers
      localStorage.setItem('zthHistory', JSON.stringify(history))
      this._vm.$set(state, 'history', history)
    }
  },
  REMOVE_ALL_HISTORY(state) {
    if (typeof localStorage !== 'undefined' && state.history) {
      let history = [].concat(state.history)
      history = []
      localStorage.setItem('zthHistory', JSON.stringify(history))
      this._vm.$set(state, 'history', history)
    }
  }
}
export const actions = {
  load({ commit }) {
    if (!state.historyLoaded) commit('LOAD_HISTORY')
  },
  add({ state, commit, dispatch }, historyItem) {
    if (!state.historyLoaded) {
      dispatch('load')
    }
    commit('ADD_HISTORY_ITEM', Object.assign({}, historyItem))
    dispatch('push')
  },
  remove({ commit, dispatch }, historyItem) {
    commit('REMOVE_HISTORY_ITEM', Object.assign({}, historyItem))
    dispatch('push')
  },
  removeAll({ commit, dispatch }) {
    commit('REMOVE_ALL_HISTORY')
    dispatch('push')
  },
  async importFromJSON({ commit }, json) {
    commit('IMPORT_HISTORY_FROM_JSON', json)
  },
  async fetchFromFlask({ commit }) {
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    try {
      const res = await axios.get(`${PYTHON_SERVER}history`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && res.data.history) {
        commit('IMPORT_HISTORY_FROM_JSON', JSON.stringify(res.data.history))
      }
    } catch (err) {
      logError(err, 'history.js: fetchFromFlask()')
    }
  },
  async push() {
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    let history = []
    try {
      history = JSON.parse(localStorage.getItem('zthHistory') || '[]')
    } catch (err) {
      logError(err, 'history.js: push()')
    }
    try {
      await axios.put(`${PYTHON_SERVER}history`, { history }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      logError(err, 'history.js: push()')
    }
  }
}
export const getters = {
  has: state => historyItem => {
    if (state.history) {
      let hasHistoryItem = false
      hasHistoryItem = state.history.find(
        item => item.path && item.path === historyItem.path
      )
      return hasHistoryItem
    }
  },
  count: state => () => {
    if (state.history) {
      return state.history.length
    } else {
      return 0
    }
  }
}
