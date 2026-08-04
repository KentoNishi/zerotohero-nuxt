import { logError } from '../lib/helper'
import axios from 'axios'
import { PYTHON_SERVER } from '../lib/utils'

export const DEFAULT_LEVEL = 1
export const DEFAULT_WEEKLY_HOURS = 7

export const state = () => {
  return {
    progress: {}, // Each language has its own progress
    progressLoaded: false
  }
}
export const mutations = {
  IMPORT_FROM_JSON(state, json) {
    if (typeof localStorage !== 'undefined') {
      let progress
      try {
        progress = JSON.parse(json)
      } catch (err) {
        logError(err)
      }
      if (progress) {
        state.progress = progress
        localStorage.setItem('zthProgress', JSON.stringify(state.progress))
      }
      state.progressLoaded = true
    }
  },
  LOAD(state) {
    if (typeof localStorage !== 'undefined') {
      let progress = JSON.parse(localStorage.getItem('zthProgress') || '{}')
      state.progress = progress || state.progress
      state.progressLoaded = true
    }
  },
  REMOVE_L2_PROGRESS(state, { l2 }) {
    if (typeof localStorage !== 'undefined') {
      state.progress[l2.code] = null
      let progress = Object.assign({}, state.progress)
      localStorage.setItem('zthProgress', JSON.stringify(progress))
      this._vm.$set(state, 'progress', progress)
    }
  },
  SET_LEVEL(state, { l2, level }) {
    if (typeof localStorage !== 'undefined') {
      if (!state.progress[l2.code]) {
        state.progress[l2.code] = {}
      }
      let progress = Object.assign({}, state.progress)
      progress[l2.code].level = level
      localStorage.setItem('zthProgress', JSON.stringify(progress))
      this._vm.$set(state, 'progress', progress)
    }
  },
  SET_WEEKLY_HOURS(state, { l2, weeklyHours }) {
    if (typeof localStorage !== 'undefined') {
      if (!state.progress[l2.code]) {
        state.progress[l2.code] = {}
      }
      let progress = Object.assign({}, state.progress)
      progress[l2.code].weeklyHours = weeklyHours
      localStorage.setItem('zthProgress', JSON.stringify(progress))
      this._vm.$set(state, 'progress', progress)
    }
  },
  SET_TIME(state, { l2, time }) {
    if (typeof localStorage !== 'undefined') {
      if (!state.progress[l2.code]) {
        state.progress[l2.code] = {}
      }
      let progress = Object.assign({}, state.progress)
      if (!time) time = 0
      progress[l2.code].time = time
      localStorage.setItem('zthProgress', JSON.stringify(progress))
      this._vm.$set(state, 'progress', progress)
      // console.log(`Progress: New time set: ${time / 1000}s for '${l2.code}'`)
    }
  },
  ADD_CERTIFICATION(state, { l2, certification }) {
    if (typeof localStorage !== 'undefined') {
      if (!state.progress[l2.code]) {
        state.progress[l2.code] = {}
      }
      let progress = Object.assign({}, state.progress)
      if (!progress[l2.code].certifications) progress[l2.code].certifications = []
      progress[l2.code].certifications.push(certification)
      localStorage.setItem('zthProgress', JSON.stringify(progress))
      this._vm.$set(state, 'progress', progress)
    }
  },
}
export const actions = {
  load({ commit }) {
    if (!state.progressLoaded) commit('LOAD')
    // Data from the server is loaded via directus.js's fetchOrCreateUserData()
  },
  async fetchFromFlask({ commit }) {
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    try {
      const res = await axios.get(`${PYTHON_SERVER}progress`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && res.data.progress) {
        commit('IMPORT_FROM_JSON', JSON.stringify(res.data.progress))
      }
    } catch (err) {
      logError(err, 'progress.js: fetchFromFlask()')
    }
  },
  async importFromJSON({ commit }, json) {
    commit('IMPORT_FROM_JSON', json)
  },
  setLevel({ dispatch, commit }, { l2, level }) {
    commit('SET_LEVEL', { l2, level })
    dispatch('pushL2', { l2, progress: state.progress[l2.code] })
    // Dispatch shows/loadRecommendedVideos action after setting the level
    dispatch('shows/loadRecommendedVideos', { userId: this.$auth.$storage.getUniversal('userId'), l2, level, clear: true }, { root: true })
  },
  setWeeklyHours({ dispatch, commit }, { l2, weeklyHours }) {
    commit('SET_WEEKLY_HOURS', { l2, weeklyHours })
    dispatch('pushL2', { l2, progress: state.progress[l2.code] })
  },
  removeL2Progress({ dispatch, commit }, { l2 }) {
    commit('REMOVE_L2_PROGRESS', { l2 })
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    axios.delete(`${PYTHON_SERVER}progress/${encodeURIComponent(l2.code)}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch((err) => logError(err, 'progress.js: removeL2Progress()'))
  },
  async fetchProgressFromServer() {
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return false
    token = token.replace(/^Bearer\s+/i, '')
    let res = await axios.get(`${PYTHON_SERVER}progress`, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch((err) => {
      logError(err, 'progress.js: fetchProgressFromServer()')
    })
    if (res && res.data && res.data.progress) {
      let progress = res.data.progress
      return progress
    } else {
      return false
    }
  },
  /**
   * 
   * @param {object} context 
   * @param {object} options { l2: language object, time: time in milliseconds, autoLog: whether this action is dispatched from the auto time logger }
   */
  async setTime({ dispatch, commit }, { l2, time, autoLog }) {
    if (autoLog) {
      // Every minute
      if (time % 60000 === 0) {
        let progress = await dispatch('fetchProgressFromServer')
        if (progress?.[l2.code]) {
          let timeFromServer = progress[l2.code].time
          // If timeFromServer is undefined, or if time is greater than timeFromServer, push to server
          if (!timeFromServer || time > timeFromServer) {
            commit('SET_TIME', { l2, time })
            dispatch('pushL2', { l2, progress: state.progress[l2.code] })
          } else {
            commit('SET_TIME', { l2, time: timeFromServer })
          }
        }
      } else {
        commit('SET_TIME', { l2, time })
      }
    } else {
      commit('SET_TIME', { l2, time })
      dispatch('pushL2', { l2, progress: state.progress[l2.code] })
    }
  },
  async pushL2({ state }, { l2, progress }) {
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    const entry = progress || state.progress[l2.code]
    if (!entry) return
    await axios.put(`${PYTHON_SERVER}progress`, {
      l2: l2.code,
      progress: {
        level: entry.level,
        time: entry.time,
        weeklyHours: entry.weeklyHours
      }
    }, {
      headers: { Authorization: `Bearer ${token}` }
    }).catch((err) => {
      logError(err, 'progress.js: pushL2()')
    })
  }
}
export const getters = {
  level: state => l2 => {
    if (state.progress[l2.code]) return state.progress[l2.code].level || DEFAULT_LEVEL
  },
  time: state => l2 => {
    let time = 0
    if (state.progress[l2.code] && state.progress[l2.code].time) time = state.progress[l2.code].time
    return time
  },
  weeklyHours: state => l2 => {
    let weeklyHours = DEFAULT_WEEKLY_HOURS
    if (state.progress[l2.code] && state.progress[l2.code].weeklyHours) weeklyHours = state.progress[l2.code].weeklyHours || DEFAULT_WEEKLY_HOURS
    return weeklyHours
  }
}
