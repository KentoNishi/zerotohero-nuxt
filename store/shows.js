import { CATEGORIES } from "@/lib/youtube";
import { LANGS_WITH_CONTENT, uniqueByValue, unique, PYTHON_SERVER, proxy } from "@/lib/utils";
import Vue from "vue";

export const state = () => {
  return {
    tvShows: {},
    talks: {},
    recommendedVideos: {},
    stats: {},
    showsLoaded: {},
    recommendedVideosLoaded: {},
    categories: {},
  };
};

export const categories = (l2, tvShows, talks) => {
  if (!l2 || !LANGS_WITH_CONTENT.includes(l2.code)) return {};
  tvShows = tvShows[l2.code] || [];
  talks = talks[l2.code] || [];
  let shows = [...tvShows, ...talks];
  shows = shows.filter((s) => !["News", "Music", "Movies"].includes(s.title));
  let categories = {};
  let ids = shows.map((show) => show.category).filter((c) => c);
  for (let id in CATEGORIES) {
    if (ids.includes(Number(id))) categories[id] = CATEGORIES[id];
  }
  return categories;
};

export const determineSortType = ({ type = "talk", show }) => {
  let sort = type === "talk" && !show.audiobook ? "-views" : "title";
  if (show.title === "News") sort = "-date";
  if (show.title === "Music") sort = "-views";
  if (show.title === "Movies") sort = "-views";
  return sort;
};

// services/dataService.js

export const fetchShows = async ($directus, type, l2, forceRefresh, limit) => {
  try {
    const response = await $directus.get(
      `items/${type}?filter[l2][eq]=${l2.id}${forceRefresh ? "" : "&filter[hidden][empty]=true"}&limit=${limit}&timestamp=${forceRefresh ? Date.now() : 0}`
    );
    
    if (response.data.data) {
      const shows = response.data.data;
      shows.forEach((show) => (show.tags = unique((show.tags || "").split(","))));
      shows.sort((x, y) => x.title?.localeCompare(y.title, l2.locales[0]) || 0);
      return shows;
    }
  } catch (err) {
    console.error(`Error fetching ${type}`, err);
  }
  return [];
};

const normalizeDifficulty = (video) => {
  if (!video.difficulty) {
    if (video.lex_div && video.word_freq) {
      let lex_div = video.lex_div;
      let word_freq = video.word_freq;
      let difficulty = lex_div / word_freq
      video.difficulty = difficulty;
    }
  }
  return video;
}

export const fetchRecommendedVideos = async (userId, l2, level, preferredCategories, start, limit, excludeIds) => {
  try {
    let params = {
      l2: l2.code,
      limit,
      start,
      made_for_kids: 0,
    };
    if (level) params.level = level;
    if (userId) params.user_id = userId;
    if (preferredCategories) params.preferred_categories = preferredCategories.join(',');
    if (excludeIds) params.exclude_ids = excludeIds.join(',');
    params.timestamp = Date.now(); // We don't want to cache this, otherwise when the user refreshes they will get the same videos
    // unset params with empty values
    Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
    const queryString = Object.keys(params).map((key) => key + '=' + params[key]).join('&');
    let res = await axios(`${PYTHON_SERVER}recommend-videos?${queryString}`);
    let videos = res.data;
    if (typeof videos !== "string") {
      videos = videos.map((video) => normalizeDifficulty(video));
      return videos
    }
    else
      return [];
  } catch (err) {
    console.error("Error fetching recommended videos", err);
  }
  return [];
}


export const mutations = {
  LOAD_SHOWS(state, { l2, tvShows, talks }) {
    tvShows.forEach((show) => {
      show.episodes = show.episodes || [];
      show.sort = determineSortType({ type: "tvShow", show });
      show.type = "tvShow";
    }); // So that they are reactive
    talks.forEach((show) => {
      show.episodes = show.episodes || [];
      show.sort = determineSortType({ type: "talk", show });
      show.type = "talk";
    }); // So that they are reactive
    state.tvShows[l2.code] = tvShows;
    state.talks[l2.code] = talks;
    state.showsLoaded[l2.code] = true;

    state.categories = categories(l2, state.tvShows, state.talks);
  },
  CLEAR_RECOMMENDED_VIDEOS(state, l2) {
    state.recommendedVideos[l2.code] = [];
    state.recommendedVideosLoaded[l2.code] = false;
  },
  ADD_RECOMMENDED_VIDEOS(state, { l2, videos }) {
    let existingVideos = state.recommendedVideos[l2.code] || [];
    state.recommendedVideos[l2.code] = uniqueByValue(
      [...existingVideos, ...videos],
      "youtube_id"
    );
    state.recommendedVideosLoaded[l2.code] = true;
  },
  ADD_SHOW(state, { l2, type, show }) {
    state[type][l2.code].push(show);
  },
  REMOVE_SHOW(state, { l2, type, show }) {
    state[type][l2.code] = state[type][l2.code].filter((s) => s !== show);
  },
  UPDATE_SHOW(state, { l2, type, id, payload }) {
    let show = state[type][l2.code].find((s) => s.id === id);
    if (show) {
      for (let key in payload) {
        show[key] = payload[key];
      }
    }
  },
  REMOVE_EPISODE_FROM_SHOW(
    state,
    { l2, collection = "tvShows", showId, episode }
  ) {
    let show = state[collection][l2.code].find((s) => s.id === showId);
    if (show.episodes)
      show.episodes = show.episodes.filter(
        (e) => e.youtube_id !== episode.youtube_id
      );
  },
  // Modify any item in the store, be it a show, a video, or a line in the subs.
  MODIFY_ITEM(state, { item, key, value }) {
    Vue.set(item, key, value);
  },
  ADD_EPISODES_TO_SHOW(
    state,
    { l2, collection = "tvShows", showId, episodes, sort = "-date" }
  ) {
    let show = state[collection][l2.code].find((s) => s.id === showId);
    if (!show) {
      console.error(`Trying to add episodes to show '${showId}' but it doesn't exist in state.${collection}:`, state[collection][l2.code]);
      return
    }
    if (show.episodes && show.episodes.length > 0)
      episodes = episodes.concat(show.episodes);
    episodes = uniqueByValue(episodes, "youtube_id");
    if (sort === "-date") {
      episodes = episodes.sort((a, b) =>
        b.date ? b.date.localeCompare(a.date) : 0
      );
    } else if (sort === "title") {
      episodes = episodes.sort((a, b) =>
        a.title
          ? a.title.localeCompare(
              b.title,
              l2 && l2.locales && l2.locales[0] ? l2.locales[0] : "en",
              {
                numeric: true,
              }
            )
          : 0
      );
    }
    show.episodes = episodes;
  },
  SET_EPISODE_COUNT(state, { l2, collection, showId, episodeCount }) {
    let show = state[collection][l2.code].find((s) => s.id === Number(showId));
    if (!show) return;
    show.episodeCount = episodeCount;
  },
};

export const getMinLexDivByLevel = (shows) => {
  let lexDivs = shows.map((s) => s.lex_div).filter((l) => l > 0);
  lexDivs = lexDivs.sort((a, b) => a - b);
  let minLexDivByLevel = {};
  minLexDivByLevel[7] = lexDivs[lexDivs.length - 1];
  minLexDivByLevel[6] = lexDivs[Math.ceil(lexDivs.length / 2)];
  minLexDivByLevel[5] = lexDivs[Math.ceil(lexDivs.length / 2 / 2)];
  minLexDivByLevel[4] = lexDivs[Math.ceil(lexDivs.length / 2 / 2 / 2)];
  minLexDivByLevel[3] = lexDivs[Math.ceil(lexDivs.length / 2 / 2 / 2 / 2)];
  minLexDivByLevel[2] = lexDivs[Math.ceil(lexDivs.length / 2 / 2 / 2 / 2 / 2)];
  minLexDivByLevel[1] =
    lexDivs[Math.ceil(lexDivs.length / 2 / 2 / 2 / 2 / 2 / 2)];
  return minLexDivByLevel;
};

export const levelByLexDiv = (lexDiv, minLexDivByLevel) => {
  if (!lexDiv) return;
  for (let i = 1; i <= 7; i++) {
    if (lexDiv < minLexDivByLevel[i]) return i;
  }
};

export const actions = {
  async load(context, { l2, forceRefresh, limit = 1000 }) {
    const [tvShows, talks] = await Promise.all([
      fetchShows(this.$directus, "tv_shows", l2, forceRefresh, limit),
      fetchShows(this.$directus, "talks", l2, forceRefresh, limit)
    ]);
    
    const processShows = (shows, minLexDivByLevel) => 
      shows.map(show => ({ ...show, level: levelByLexDiv(show.lex_div, minLexDivByLevel) }));
    
    const minLexDivByLevel = getMinLexDivByLevel([...tvShows, ...talks]);
    
    const processedTalks = processShows(talks, minLexDivByLevel);
    const processedTvShows = processShows(tvShows, minLexDivByLevel);
    
    context.commit("LOAD_SHOWS", { l2, tvShows: processedTvShows, talks: processedTalks });
  },
/**
 * Load recommended videos based on user preferences and progress.
 *
 * @param {Object} context - The Vuex context object.
 * @param {Object} payload - The payload object.
 * @param {string} payload.userId - The ID of the user.
 * @param {Object} payload.l2 - The second language object.
 * @param {number} [payload.level] - The user's level in the second language. If not provided, it will be fetched from the progress state.
 * @param {Array} [payload.preferredCategories] - The user's preferred categories. If not provided, it will be fetched from the settings state.
 * @param {boolean} [payload.clear=false] - Whether to clear the current recommended videos before adding new ones.
 * @param {number} [payload.start=0] - The start index for the videos to fetch.
 * @param {number} [payload.limit=48] - The maximum number of videos to fetch.
 */
async loadRecommendedVideos({state, commit, rootState, rootGetters}, { userId, l2, level, preferredCategories, clear = false, start = 0, limit = 48 }) {
    // If level is not provided and progress is loaded, fetch level from progress state
    if (!level && rootState.progress.progressLoaded) {
      level =  Number(rootGetters["progress/level"](l2));
    }
    // If preferred categories are not provided and settings are loaded, fetch preferred categories from settings state
    if (!preferredCategories && rootState.settings.settingsLoaded) {
      preferredCategories = rootState.settings.preferredCategories;
    }
    // Exclude videos that are already loaded
    const excludeIds = state.recommendedVideos[l2.code] ? state.recommendedVideos[l2.code].map((v) => v.id) : [];
    // Fetch recommended videos
    let videos = await fetchRecommendedVideos(userId, l2, level, preferredCategories, start, limit, excludeIds);
    // If clear is true, clear the current recommended videos
    if (clear) {
      commit("CLEAR_RECOMMENDED_VIDEOS", l2);
    }
    // Add the fetched videos to the recommended videos
    commit("ADD_RECOMMENDED_VIDEOS", { l2, videos });
  },
  async add(context, { l2, type, show }) {
    let response = await this.$directus.post(
      `items/${type === "tvShows" ? "tv_shows" : "talks"}`,
      show
    );
    if (response && response.data) {
      context.commit("ADD_SHOW", { l2, type, show: response.data.data });
      let show = Object.assign(response.data.data, {
        l2,
        type: type === "tvShows" ? "tv_show" : "talk",
      });
      return show;
    } else {
      return false;
    }
  },
  async remove(context, { l2, type, show }) {
    let response = await this.$directus.delete(
      `items/${type === "tvShows" ? "tv_shows" : "talks"}/${show.id}`
    );
    if (response?.status === 204) {
      context.commit("REMOVE_SHOW", { l2, type, show });
    }
    return true;
  },
  async update(context, { l2, type, id, payload }) {
    let response = await this.$directus.patch(
      `items/${type === "tvShows" ? "tv_shows" : "talks"}/${id}`,
      payload
    );
    if (response) {
      context.commit("UPDATE_SHOW", { l2, type, id, payload });
    }
    return true;
  },
  async addEpisodesToShow(
    { commit },
    { l2, collection = "tvShows", showId, episodes, sort = "-date" }
  ) {
    commit("ADD_EPISODES_TO_SHOW", { l2, collection, showId, episodes, sort });
  },
  async removeEpisodeFromShow(
    { commit },
    { l2, collection = "tvShows", showId, episode }
  ) {
    commit("REMOVE_EPISODE_FROM_SHOW", { l2, collection, showId, episode });
  },
  async setEpisodeCount(
    { commit },
    { l2, collection = "tvShows", showId, episodeCount }
  ) {
    commit("SET_EPISODE_COUNT", { l2, collection, showId, episodeCount });
  },
  async getEpisodesFromServer(
    { dispatch },
    {
      l2,
      collection = "tvShows",
      showId,
      forceRefresh = false,
      keyword,
      filters = {},
      limit = 96,
      offset = 0,
      sort = "-views",
    } = {}
  ) {

    const showType = collection === "tvShows" ? "tv_show" : "talk";

    filters[`filter[${showType}][eq]`] = showId;
  
    let params = {
      'filter[l2][eq]': l2.id,
      ...filters,
      sort,
      limit,
      offset,
      timestamp: forceRefresh ? Date.now() : 0
    }

    if (keyword) params['filter[title][contains]'] = keyword;
    let videos = await this.$directus.getVideos({ l2Id :l2.id, params });
    videos = uniqueByValue(videos, "youtube_id");

    if (sort === "title") {
      videos =
        videos.sort((x, y) =>
          (x.title || "").localeCompare(y.title, l2.locales[0], {
            numeric: true,
          })
        ) || [];
    } else if (sort === "-date") {
      videos =
        videos.sort((y, x) =>
          x.date
            ? x.date.localeCompare(y.date, l2.locales[0], { numeric: true })
            : -1
        ) || [];
    }

    dispatch("addEpisodesToShow", {
      l2,
      collection,
      showId,
      episodes: videos,
      sort,
    });

    return videos;
  },
};

export const getters = {
  tvShow:
    (state) =>
    ({ l2, id }) => {
      if (state.showsLoaded[l2.code]) {
        let show = state.tvShows[l2.code].find((s) => s.id === Number(id));
        return show;
      }
    },
  talk:
    (state) =>
    ({ l2, id }) => {
      if (state.showsLoaded[l2.code])
        return state.talks[l2.code].find((s) => s.id === Number(id));
    },
  audiobooks:
    (state) =>
    ({ l2 }) => {
      if (state.showsLoaded[l2.code])
        return state.talks[l2.code].filter((s) => s.audiobook);
    },
};
