import Vue from "vue";
import { logError, PYTHON_SERVER } from "../lib/utils";

export const state = () => ({
  playlists: {},
  playlistsLoaded: {},
});

export const mutations = {
  LOAD_PLAYLISTS(state, { l2, playlists }) {
    Vue.set(state.playlists, l2.code, playlists);
    Vue.set(state.playlistsLoaded, l2.code, true);
  },
  ADD_PLAYLIST(state, { l2, playlist }) {
    state.playlists[l2.code].push(playlist);
  },
  REMOVE_PLAYLIST(state, { l2, playlist }) {
    state.playlists[l2.code] = state.playlists[l2.code].filter(
      (p) => p !== playlist
    );
  },
  UPDATE_PLAYLIST(state, { l2, playlist }) {
    const playlists = state.playlists[l2.code];
    const playlistToUpdate = playlists.find((pl) => pl.id === playlist.id);
    if (playlistToUpdate) {
      if (playlist.title) Vue.set(playlistToUpdate, 'title', playlist.title);
      if (playlist.videos) Vue.set(playlistToUpdate, 'videos', playlist.videos);
    }
  },
};

export const actions = {
  async loadPlaylists({ commit }, { l2, forceRefresh }) {
    if (!$nuxt.$auth.loggedIn) return;
    if (!$nuxt.$auth.strategy.token.get()) return;
    try {
      const response = await $nuxt.$axios.get(
        `${PYTHON_SERVER}playlists?l2=${l2.id}`
      );
      let playlists = response?.data?.playlists || [];
      playlists = playlists.sort((x, y) =>
        (x.title || "").localeCompare(y.title, l2.locales[0])
      );
      commit("LOAD_PLAYLISTS", { l2, playlists });
    } catch (err) {
      logError(err, "playlists.js: loadPlaylists()");
    }
  },
  async createPlaylist({ commit }, { l2, playlist }) {
    if (!$nuxt.$auth.loggedIn) return;
    if (!$nuxt.$auth.strategy.token.get()) return;
    try {
      const response = await $nuxt.$axios.post(
        `${PYTHON_SERVER}playlists`,
        {
          title: playlist.title,
          l2: String(l2.id),
          videos: playlist.videos || []
        }
      );
      const id = response?.data?.id;
      if (id) {
        commit("ADD_PLAYLIST", {
          l2,
          playlist: {
            id,
            title: playlist.title,
            l2: String(l2.id),
            videos: playlist.videos || []
          }
        });
      }
    } catch (err) {
      logError(err, "playlists.js: createPlaylist()");
    }
  },
  async updatePlaylist({ commit }, { l2, playlist }) {
    if (!$nuxt.$auth.loggedIn) return;
    if (!$nuxt.$auth.strategy.token.get()) return;
    try {
      await $nuxt.$axios.put(
        `${PYTHON_SERVER}playlists/${playlist.id}`,
        { title: playlist.title, videos: playlist.videos || [] }
      );
      commit("UPDATE_PLAYLIST", {
        l2,
        playlist: { id: playlist.id, title: playlist.title, videos: playlist.videos || [] }
      });
    } catch (err) {
      logError(err, "playlists.js: updatePlaylist()");
    }
  },
  async deletePlaylist({ commit }, { l2, playlist }) {
    if (!$nuxt.$auth.loggedIn) return;
    if (!$nuxt.$auth.strategy.token.get()) return;
    try {
      await $nuxt.$axios.delete(`${PYTHON_SERVER}playlists/${playlist.id}`);
    } catch (err) {
      logError(err, "playlists.js: deletePlaylist()");
    }
    commit("REMOVE_PLAYLIST", { l2, playlist });
  },
  async fetchPlaylist({ state }, { l2, id }) {
    const playlists = state.playlists[l2.code];
    if (playlists) {
      const playlistFromStore = playlists.find((pl) => pl.id === id);
      if (playlistFromStore) return playlistFromStore;
    }
    if (!$nuxt.$auth.loggedIn) return null;
    if (!$nuxt.$auth.strategy.token.get()) return null;
    try {
      const response = await $nuxt.$axios.get(`${PYTHON_SERVER}playlists/${id}`);
      return response?.data?.playlist || null;
    } catch (err) {
      logError(err, "playlists.js: fetchPlaylist()");
      return null;
    }
  },
};

export const getters = {
  playlists: (state) => (l2) => state.playlists[l2.code],
};
