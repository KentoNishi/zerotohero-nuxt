import axios from 'axios'
import { logError, PYTHON_SERVER } from '../lib/utils'

export const state = () => {
  return {
    stats: {},
    statsLoaded: {}
  }
}

export const mutations = {
  LOAD(state, { l2, stats }) {
    state.stats[l2.code] = stats;
    state.statsLoaded[l2.code] = true
  },
}

export const actions = {
  async load({ state, rootGetters, commit }, { l2, adminMode }) {
    if (state.statsLoaded[l2.code]) return
    try {
      let stats = {}
      // SPEC-039 5.5 — count.php replaced by Flask /videos/count.
      let data = await axios.get(
        `${PYTHON_SERVER}videos/count?l2=${encodeURIComponent(l2.code)}&type=new_videos`
      );
      data = Number(data?.data)
      if (data) stats.newVideos = data

      data = await axios.get(
        `${PYTHON_SERVER}videos/count?l2=${encodeURIComponent(l2.code)}`
      );
      data = Number(data?.data)
      if (data) stats.allVideos = data

      commit('LOAD', { l2, stats })
    } catch (err) {
      logError(err)
    }
  },
}
