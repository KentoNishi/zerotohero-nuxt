import axios from 'axios'
import { logError, PYTHON_SERVER } from '../lib/utils'

const LOCAL_KEY = 'zthSavedText'


export const state = () => {
  return {
    itemsByL2: {}, // One key per language
    loadedByL2: {} // One key per language
  }
}

export const mutations = {
  SAVE_LOCAL(state) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(state.itemsByL2))
  },
  LOAD(state, { l2, itemsByL2 }) {
    state.itemsByL2 = itemsByL2
    state.loadedByL2[l2.code] = true
  },
  LOAD_ITEM(state, { l2, id, data }) {
    let item = (state.itemsByL2[l2.code] || []).find(i => Number(i.id) === Number(id))
    if (item) item = Object.assign(item, data)
    else {
      item = data
      if (!state.itemsByL2[l2.code]) state.itemsByL2[l2.code] = []
      state.itemsByL2[l2.code].push(item)
    }
  },
  ADD(state, { l2, item }) {
    if (!state.itemsByL2[l2.code]) state.itemsByL2[l2.code] = []
    state.itemsByL2[l2.code].push(item);
  },
  REMOVE(state, { l2, itemId }) {
    state.itemsByL2[l2.code] = state.itemsByL2[l2.code].filter((i) => i.id !== itemId);
  },
  UPDATE(state, { l2, payload }) {
    let items = state.itemsByL2[l2.code]
    if (items) {
      let existing = state.itemsByL2[l2.code].find(i => i.id === payload.id)
      if (!existing) {
        existing = {}
        state.itemsByL2[l2.code].push(existing)
      }
      for (let key in payload) {
        existing[key] = payload[key]
      }
    }
  },
}


export const getters = {
  getItems: (state) => {
    return (l2) => state.itemsByL2[l2]
  }
}

export const loadFromServer = async ({ l2, adminMode }) => {
  let items = []
  if ($nuxt.$auth.loggedIn) {
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return []
    token = token.replace(/^Bearer\s+/i, '')
    try {
      // SPEC-039 5.4 — notes now live in Supabase (Flask /user-notes).
      let res = await axios.get(`${PYTHON_SERVER}user-notes?l2=${encodeURIComponent(l2.code)}&timestamp=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      items = res?.data || []
    } catch (e) {
      logError(e, 'savedText.js: loadFromServer()')
    }
  }
  return items
}

export const actions = {
  saveLocal({ commit }) {
    commit('SAVE_LOCAL')
  },
  async load({ commit, state }, { l2, adminMode }) {
    // Check if already loaded
    if (state.loadedByL2[l2.code]) return
    let itemsByL2 = {}
    let items = await loadFromServer({ l2, adminMode })
    if (items.length !== 0) {
      items = items.sort((x, y) =>
        (x.title || "").localeCompare(y.title, l2.locales[0])
      ) || [];
      itemsByL2[l2.code] = items
    }
    commit('LOAD', { l2, itemsByL2 })
  },
  async loadItem({ commit }, { l2, id, adminMode }) {
    if (!$nuxt.$auth.loggedIn) return null
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return null
    token = token.replace(/^Bearer\s+/i, '')
    let res
    try {
      res = await axios.get(`${PYTHON_SERVER}user-notes/${id}?timestamp=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (e) {
      logError(e, 'savedText.js: loadItem()')
      return null
    }
    if (res.data) {
      let data = res.data;
      commit('LOAD_ITEM', { l2, id, data })
    }
    return res.data
  },
  async add({ commit }, { l2, item }) {
    item = item || { text: '', translation: '', title: 'Untitled', l2: l2.code }
    if ($nuxt.$auth.loggedIn) {
      let token = $nuxt.$auth.strategy.token.get()
      if (token) {
        token = token.replace(/^Bearer\s+/i, '')
        try {
          let response = await axios.post(`${PYTHON_SERVER}user-notes`, item, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (response?.data?.id) {
            item = response.data
          }
        } catch (e) {
          logError(e, 'savedText.js: add()')
        }
      }
    }
    commit('ADD', { l2, item })
    return item
  },
  async remove({ commit }, { l2, itemId }) {
    if ($nuxt.$auth.loggedIn) {
      let token = $nuxt.$auth.strategy.token.get()
      if (token) {
        token = token.replace(/^Bearer\s+/i, '')
        try {
          let response = await axios.delete(`${PYTHON_SERVER}user-notes/${itemId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (response?.data) {
            return response.data
          }
        } catch (e) {
          logError(e, 'savedText.js: remove()')
        }
      }
    }
    commit('REMOVE', { l2, itemId })
  },
  async update({ commit }, { l2, payload }) {
    if ($nuxt.$auth.loggedIn) {
      let token = $nuxt.$auth.strategy.token.get()
      if (token) {
        token = token.replace(/^Bearer\s+/i, '')
        try {
          let response = await axios.patch(`${PYTHON_SERVER}user-notes/${payload.id}`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (response?.data?.id) {
            payload = response.data
          }
        } catch (e) {
          logError(e, 'savedText.js: update()')
        }
      }
    }
    commit('UPDATE', { l2, payload })
  }
}

