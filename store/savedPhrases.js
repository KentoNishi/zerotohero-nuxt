import axios from 'axios'
import { logError, PYTHON_SERVER } from "../lib/utils"

export const state = () => {
  return {
    savedPhrases: {},
    savedPhrasesLoaded: false
  }
}
export const mutations = {
  LOAD_SAVED_PHRASES(state) {
    if (typeof localStorage !== 'undefined') {
      let savedPhrases = JSON.parse(localStorage.getItem('zthSavedPhrases') || '{}')
      state.savedPhrases = savedPhrases || state.savedPhrases
      state.savedPhrasesLoaded = true
    }
  },
  ADD_SAVED_PHRASE(state, { l2, phrase, phrasebookId, pronunciation, exact, translations = {} } = {}) {
    if (typeof localStorage !== 'undefined') {
      let phraseToSave = {
        phrase, phrasebookId, pronunciation, exact,
        date: Date.now()
      }
      for (let key in translations) {
        phraseToSave[key] = translations[key]
      }
      if (!state.savedPhrases[l2]) {
        state.savedPhrases[l2] = []
      }
      if (
        !state.savedPhrases[l2].find(phrase => phrase.phrase === phraseToSave.phrase)
      ) {
        let savedPhrases = Object.assign({}, state.savedPhrases)
        savedPhrases[l2].push(phraseToSave)
        localStorage.setItem('zthSavedPhrases', JSON.stringify(savedPhrases))
        this._vm.$set(state, 'savedPhrases', savedPhrases)
      }
    }
  },
  IMPORT_PHRASES(state, rows) {
    if (typeof localStorage !== 'undefined') {
      for (let row of rows) {
        if (!state.savedPhrases[row.l2]) {
          state.savedPhrases[row.l2] = []
        }
        if (
          !state.savedPhrases[row.l2].find(p => p.phrase === row.phrase)
        ) {
          state.savedPhrases[row.l2].push(row)
        }
      }
      localStorage.setItem('zthSavedPhrases', JSON.stringify(state.savedPhrases))
    }
  },
  IMPORT_PHRASES_FROM_JSON(state, json) {
    if (typeof localStorage !== 'undefined') {
      let savedPhrases
      try {
        savedPhrases = JSON.parse(json)
      } catch (err) {
        logError(err)
      }
      if (savedPhrases) {
        state.savedPhrases = savedPhrases
        localStorage.setItem('zthSavedPhrases', JSON.stringify(savedPhrases))
      }
      state.savedPhrasesLoaded = true
    }
  },
  REMOVE_SAVED_PHRASE(state, { l2, phrase, phrasebookId, pronunciation, exact, translations = {} } = {}) {
    if (typeof localStorage !== 'undefined' && state.savedPhrases[l2]) {
      let phraseToRemove = {
        phrase, phrasebookId, pronunciation, exact, translations
      }
      let phrases = state.savedPhrases[l2]
      if (phrases) {
        const index = phrases.findIndex(
          phrase => phrase.phrase === phraseToRemove.phrase
        )
        if (index !== -1) {
          phrases.splice(index, 1)
          let savedPhrases = Object.assign({}, state.savedPhrases)
          savedPhrases[l2] = phrases
          localStorage.setItem('zthSavedPhrases', JSON.stringify(savedPhrases))
          this._vm.$set(state, 'savedPhrases', savedPhrases)
        }
      }
    }
  },
  REMOVE_ALL_SAVED_PHRASES(state, { l2 } = {}) {
    if (typeof localStorage !== 'undefined') {
      let savedPhrases = Object.assign({}, state.savedPhrases)
      if (l2) {
        if (state.savedPhrases[l2]) {
          savedPhrases[l2] = []
        }
      } else {
        savedPhrases = {}
      }
      localStorage.setItem('zthSavedPhrases', JSON.stringify(savedPhrases))
      this._vm.$set(state, 'savedPhrases', savedPhrases)
    }
  }
}
export const actions = {
  load({ commit, dispatch }) {
    if (!state.savedPhrasesLoaded) commit('LOAD_SAVED_PHRASES')
  },
  async fetchFromFlask({ commit }) {
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    try {
      const res = await axios.get(`${PYTHON_SERVER}saved-phrases`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.data && res.data.phrases) {
        commit('IMPORT_PHRASES_FROM_JSON', JSON.stringify(res.data.phrases))
      }
    } catch (err) {
      logError(err, 'savedPhrases.js: fetchFromFlask()')
    }
  },
  async add({ commit, dispatch }, options) {
    commit('ADD_SAVED_PHRASE', options)
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    let phraseToSave = {
      phrase: options.phrase,
      phrasebookId: options.phrasebookId,
      pronunciation: options.pronunciation,
      exact: options.exact,
      date: Date.now()
    }
    for (let key in options.translations || {}) {
      phraseToSave[key] = options.translations[key]
    }
    try {
      await axios.put(`${PYTHON_SERVER}saved-phrases`, {
        l2: options.l2,
        phrase: phraseToSave
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } catch (err) {
      logError(err, 'savedPhrases.js: add()')
    }
  },
  async importPhrases({ commit, dispatch, state }, rows) {
    commit('IMPORT_PHRASES', rows)
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    for (let row of rows) {
      try {
        await axios.put(`${PYTHON_SERVER}saved-phrases`, {
          l2: row.l2,
          phrase: row
        }, {
          headers: { Authorization: `Bearer ${token}` }
        })
      } catch (err) {
        logError(err, 'savedPhrases.js: importPhrases()')
      }
    }
  },
  async remove({ commit, dispatch }, options) {
    commit('REMOVE_SAVED_PHRASE', options)
    if (!$nuxt.$auth.loggedIn || !options.phrase) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    try {
      await axios.delete(
        `${PYTHON_SERVER}saved-phrases/${encodeURIComponent(options.l2)}/${encodeURIComponent(options.phrase)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch (err) {
      logError(err, 'savedPhrases.js: remove()')
    }
  },
  async removeAll({ commit, dispatch, state }, options) {
    const l2 = options && options.l2
    const phrases = []
    if (l2) {
      phrases.push(...(state.savedPhrases[l2] || []))
    } else {
      for (let lang of Object.values(state.savedPhrases)) {
        phrases.push(...(lang || []))
      }
    }
    commit('REMOVE_ALL_SAVED_PHRASES', options)
    if (!$nuxt.$auth.loggedIn) return
    let token = $nuxt.$auth.strategy.token.get()
    if (!token) return
    token = token.replace(/^Bearer\s+/i, '')
    for (let phrase of phrases) {
      try {
        await axios.delete(
          `${PYTHON_SERVER}saved-phrases/${encodeURIComponent(l2 || '')}/${encodeURIComponent(phrase.phrase)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      } catch (err) {
        logError(err, 'savedPhrases.js: removeAll()')
      }
    }
  },
  async importFromJSON({ commit, dispatch }, json) {
    commit('IMPORT_PHRASES_FROM_JSON', json)
  }
}
export const getters = {
  has: state => ({ l2, phrase, phrasebookId, pronunciation, exact, translations = {} } = {}) => {
    let phraseToTest = {
      phrase, phrasebookId, pronunciation, exact, translations
    }
    if (state.savedPhrases && state.savedPhrases[l2]) {
      let savedphrase = false
      savedphrase = state.savedPhrases[l2].find(
        phrase => phrase.phrase === phraseToTest.phrase
      )
      return savedphrase ? true : false
    }
  },
  get: state => ({ l2, phrase, phrasebookId, pronunciation, exact, translations = {} } = {}) => {
    let phraseToTest = {
      phrase, phrasebookId, pronunciation, exact, translations
    }
    if (state.savedPhrases && state.savedPhrases[l2]) {
      let savedphrase = state.savedPhrases[l2].find(
        phrase => phrase.phrase === phraseToTest.phrase
      )
      return savedphrase
    }
  },
  count: state => ({ l2 }) => {
    if (state.savedPhrases && state.savedPhrases[l2]) {
      return state.savedPhrases[l2].length
    } else {
      return 0
    }
  }
}
