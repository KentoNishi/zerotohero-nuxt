import Vue from "vue";
import axios from "axios";
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
    let token = $nuxt.$auth.strategy.token.get();
    if (!token) return;
    token = token.replace(/^Bearer\s+/i, "");
    try {
      const response = await axios.get(
        `${PYTHON_SERVER}playlists?l2=${l2.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
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
    let token = $nuxt.$auth.strategy.token.get();
    if (!token) return;
    token = token.replace(/^Bearer\s+/i, "");
    try {
      const response = await axios.post(
        `${PYTHON_SERVER}playlists`,
        {
          title: playlist.title,
          l2: String(l2.id),
          videos: playlist.videos || []
        },
        { headers: { Authorization: `Bearer ${token}` } }
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
    let token = $nuxt.$auth.strategy.token.get();
    if (!token) return;
    token = token.replace(/^Bearer\s+/i, "");
    try {
      await axios.put(
        `${PYTHON_SERVER}playlists/${playlist.id}`,
        { title: playlist.title, videos: playlist.videos || [] },
        { headers: { Authorization: `Bearer ${token}` } }
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
    let token = $nuxt.$auth.strategy.token.get();
    if (!token) return;
    token = token.replace(/^Bearer\s+/i, "");
    try {
      await axios.delete(`${PYTHON_SERVER}playlists/${playlist.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    let token = $nuxt.$auth.strategy.token.get();
    if (!token) return null;
    token = token.replace(/^Bearer\s+/i, "");
    try {
      const response = await axios.get(`${PYTHON_SERVER}playlists/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
