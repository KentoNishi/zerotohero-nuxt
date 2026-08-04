import axios from 'axios'
import { logError, PYTHON_SERVER } from '../lib/utils'

export const state = () => {
  return {
    channels: [],
    fetchedL2Ids: [],
  };
};

export const mutations = {
  SET_CHANNELS(state, { channels, l2_id }) {
    state.channels = state.channels.concat(channels);
    // Make sure they are unique
    state.channels = state.channels.filter(
      (channel, index, self) =>
        index === self.findIndex((c) => c.id === channel.id)
    );
    if (!state.fetchedL2Ids.includes(l2_id)) {
      state.fetchedL2Ids.push(l2_id);
    }
  },
};

export const actions = {
  async fetchChannelsByLanguage({ commit, state }, l2_id) {
    if (state.fetchedL2Ids.includes(l2_id)) {
      return; // Don't fetch if already fetched
    }
    try {
      // SPEC-039 5.5 — youtube_channels served by Flask /channels.
      const l2Code = this.$directus.langCodeById(l2_id);
      if (!l2Code) return;
      const res = await axios.get(`${PYTHON_SERVER}channels?l2=${encodeURIComponent(l2Code)}`);
      const channels = res?.data || [];
      if (channels?.length > 0) {
        commit("SET_CHANNELS", { channels, l2_id });
      }
    } catch (error) {
      console.error("An error occurred while fetching channels:", error);
    }
  },
};

export const getters = {
  hasFetchedForL2Id: (state) => (l2_id) => {
    return state.fetchedL2Ids.includes(l2_id);
  },

  getChannelsByL2Id: (state) => (l2Id) => {
    if (!l2Id) return state.channels; // return all channels if no l2Id provided
    return state.channels.filter((channel) => channel.l2Id === l2Id);
  },

  getChannelbyChannelId: (state) => (channelId) => {
    return state.channels.find((channel) => channel.channel_id === channelId);
  },

  getChannelbyChannelIdAndL2Id: (state) => (channelId, l2Id) => {
    return state.channels.find((channel) => channel.channel_id === channelId && channel.l2 === l2Id);
  },

  getChannelsSortedBySubscribers: (state) => {
    return state.channels.slice().sort((a, b) => b.subscribers - a.subscribers); // Sort in descending order
  },
};
