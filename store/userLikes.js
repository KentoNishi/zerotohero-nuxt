import { logError } from '../lib/helper';
import { PYTHON_SERVER } from '../lib/utils';

export const state = () => ({
  userLikes: []
})

export const mutations = {
  SET_USER_LIKES(state, likes) {
    state.userLikes = likes;
  },
  ADD_LIKE(state, like) {
    state.userLikes.push(like);
  },
  REMOVE_LIKE(state, videoId) {
    state.userLikes = state.userLikes.filter(like => like.id !== videoId);
  }
}

export const actions = {
  async fetchUserLikes({ commit, rootState }, l2) {
    if (!$nuxt.$auth.loggedIn) return;
    if ($nuxt.$auth.strategy.token.get()) {
      try {
        let response = await $nuxt.$axios.get(`${PYTHON_SERVER}likes?l2=${encodeURIComponent(l2.code)}`);
        // Handle success (e.g., update UI or state)
        if (response?.status !== 200) {
          logError('Error loading likes from the server', response);
          return;
        } else {
          let userLikes = response.data?.likes || [];
          userLikes.forEach(item => {
            item.created_on = new Date(item.created_on) // Date returned from the server is a Human-readable string
          })
          commit('SET_USER_LIKES', userLikes || []);
        }
      } catch (error) {
        // User likes not found for this language.
      }
    }
  },
  async like({ commit, rootState }, { l2Id, video }) {
    const videoId = parseInt(video.id);
    if (!$nuxt.$auth.loggedIn) return
    const user = rootState.auth.user;

    if (user && user.id && $nuxt.$auth.strategy.token.get()) {
      try {
        await $nuxt.$axios.put(`${PYTHON_SERVER}likes`, {
          videoId,
          l2: String(l2Id)
        })
        commit('ADD_LIKE', { youtube_id: video.youtube_id, id: videoId, l2: l2Id, tags: video.tags, title: video.title, created_on: new Date()})
      } catch (err) {
        logError(err, 'userLikes.js: like()')
      }
    }
  },

  async unlike({ commit, rootState }, { l2Id, videoId }) {
    videoId = parseInt(videoId);
    if (!$nuxt.$auth.loggedIn) return;
    const user = rootState.auth.user;

    if (user && user.id && $nuxt.$auth.strategy.token.get()) {
      try {
        await $nuxt.$axios.delete(
          `${PYTHON_SERVER}likes/${String(l2Id)}/${videoId}`
        )
        commit('REMOVE_LIKE', videoId);
        console.log(`User Likes: Unliked video with ID ${videoId} and L2 ${l2Id}`);
      } catch (err) {
        logError(err, 'userLikes.js: unlike()')
      }
    }
  },

}

export const getters = {
  liked: (state) => ({ l2Id, videoId }) => {
    videoId = parseInt(videoId);
    return state.userLikes?.some(like => 
      like.l2 === l2Id && like.id === videoId
    );
  },
  likedVideos: (state) => (l2Id) => {
    return state.userLikes?.filter(like => like.l2 === l2Id);
  }
}
