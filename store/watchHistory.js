import { logError } from '../lib/helper'
import { PYTHON_SERVER } from '../lib/utils'
import Vue from 'vue';


export const state = () => {
  return {
    /**
     * A historyItem represents a history item saved in the system.
     * 
     * @property {string} id - A unique identifier for the history item (automatically generated).
     * @property {string} owner - Foreign Key. Identifies which user the record pertains to.
     * @property {number} video_id - Foreign Key. Identifies which video the record pertains to.
     * @property {string} l2 - Foreign Key. The internal language ID of the user's secondary language.
     * @property {number} date - Timestamp. This indicates when the user viewed the video. You can use this to show the user's most recently watched videos.
     * @property {number} last_position - Integer. This represents the timestamp (in seconds) where the user last stopped/paused the video. This can be useful if you want to allow users to continue watching from where they left off.
     */
    l2Id: null, // The internal language ID of the current language
    watchHistory: [], // Array of historyItem objects for the current language
    watchHistoryLoading: false, // Whether the user's history is currently being loaded from the server
    watchHistoryLoadedForL2Id: false // Whether the user's history has been loaded from the server for the current language
  }
}
export const mutations = {
  // Load the user's history from the Flask watch-history API.
  LOAD_WATCH_HISTORY(state, { l2Id, watchHistoryItems }) {
    // Load the user's history from the Flask watch-history API
    state.watchHistory = watchHistoryItems
    state.watchHistoryLoadedForL2Id = l2Id
    state.l2Id = l2Id
  },
  // Add a new history item to the user's history.
  ADD_HISTORY_ITEM(state, historyItem) {
    state.watchHistory.push(historyItem)
  },
  // Update a history item.
  UPDATE_HISTORY_ITEM(state, historyItem) {
    const index = state.watchHistory.findIndex(item => item.id === historyItem.id)
    if (index !== -1) {
      state.watchHistory[index] = historyItem
    } 
  },
  // Remove a specific history item from the user's history.
  REMOVE_HISTORY_ITEM(state, historyItem) {
    state.watchHistory = state.watchHistory.filter(item => item.id !== historyItem.id)
  },
  // Remove all history items from the user's history.
  REMOVE_ALL_HISTORY(state) {
    state.watchHistory = []
  },
}
export const actions = {
  // Load the user's history if it hasn't been loaded yet.
  async load({ commit, rootState }, l2) {
    let l2Id = l2.id
    if (state.watchHistoryLoadedForL2Id !== l2Id && !state.watchHistoryLoading) {
      if (!$nuxt.$auth.loggedIn) return
      state.watchHistoryLoading = true
      if ($nuxt.$auth.strategy.token.get()) {
        let response = await $nuxt.$axios.get(`${PYTHON_SERVER}watch-history?l2=${encodeURIComponent(l2.code)}`)
        if (response?.status !== 200) {
          logError('Error loading watch history from the server', response)
        } else {
          const watchHistoryItems = response.data?.history || []
          watchHistoryItems.forEach(item => {
            item.date = new Date(item.date) // Date returned from the server is a Human-readable string
          })
          commit('LOAD_WATCH_HISTORY', { watchHistoryItems, l2Id })
          console.log(`Watch History: ${watchHistoryItems.length} items loaded for L2 ${l2Id}`)
        }
      }
      state.watchHistoryLoading = false
    }
  },

  // Add a history item to the Vuex state and sync it to the backend.
  async addOrUpdate({ state, commit, dispatch, getters }, historyItem) {
    if (!historyItem.video_id) return
    if (state.watchHistoryLoadedForL2Id !== historyItem.l2) {
      await dispatch('load', historyItem.l2)
    }
    // First, check if this history item already exists in the user's history. If so, update it; otherwise, add it.
    let hasHistoryItem = getters.has(historyItem)
    if (!$nuxt.$auth.loggedIn) return
    if (!$nuxt.$auth.strategy.token.get()) return
    try {
      // Row API (SPEC-039 5.3): old per-shard video_id + l2 are remapped server-side.
      const payload = {
        videoId: parseInt(historyItem.video_id, 10),
        l2: String(historyItem.l2),
        lastPosition: historyItem.last_position || 0
      }
      if (historyItem.date) {
        payload.date = new Date(historyItem.date).toISOString()
      }
      const response = await $nuxt.$axios.post(`${PYTHON_SERVER}watch-history`, payload)
      if (response.status !== 200) {
        logError('Error saving watch history item', response)
        return
      }
      historyItem.id = response.data.id
      if (hasHistoryItem) {
        commit('UPDATE_HISTORY_ITEM', historyItem)
        console.log(`Watch History: YouTube video ${historyItem.video_id} updated with new position ${historyItem.last_position}`)
      } else {
        commit('ADD_HISTORY_ITEM', historyItem)
        console.log(`Watch History: YouTube video ${historyItem.video_id} added with position ${historyItem.last_position}`)
      }
    } catch (err) {
      logError(err, 'watchHistory.js: addOrUpdate()')
    }
  },
  // Remove a history item from the Vuex state and sync it to the backend.
  async remove({ commit }, historyItem) {
    if (!$nuxt.$auth.loggedIn) return
    if (!$nuxt.$auth.strategy.token.get()) return
    try {
      await $nuxt.$axios.delete(`${PYTHON_SERVER}watch-history/${historyItem.id}`)
    } catch (err) {
      logError(err, 'watchHistory.js: remove()')
    }
    commit('REMOVE_HISTORY_ITEM', historyItem)
  },
  // Remove all history items from the Vuex state and sync it to the backend.
  async removeAll({ state, dispatch }) {
    // Using the remove action, remove all history items one by one, from the last to the first.
    let historyItems = state.watchHistory
    for (let i = historyItems.length - 1; i >= 0; i--) {
      await dispatch('remove', historyItems[i])
    }
  },
}
export const getters = {
  // Check if a specific history item exists in the user's history.
  has: state => historyItem => {
    if (state.watchHistory) {
      let hasHistoryItem = false
      hasHistoryItem = state.watchHistory.find(
        item => {
          return item.video_id && item.video_id === historyItem.video_id
        }
      )
      return hasHistoryItem
    }
  },
  // Get the total count of items in the user's history.
  count: state => () => {
    if (state.watchHistory) {
      return state.watchHistory.length
    } else {
      return 0
    }
  }
}
