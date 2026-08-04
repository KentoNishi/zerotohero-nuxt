import DateHelper from "../lib/date-helper";
import axios from "axios";
import he from "he"; // html entities
import {
  randBase64,
  proxy,
  escapeRegExp,
  logError,
  DIRECTUS_API_URL,
  PYTHON_SERVER,
  LP_DIRECTUS_TOOLS_URL,
  WEB_URL,
  reduceTags,
  parseQueryString,
} from "../lib/utils";

export const YOUTUBE_VIDEOS_TABLES = {
  2: [
    1874, // Basque
    6858, // Vietnamese
  ],
  3: [
    3179, // Korean
  ],
  4: [
    7731, // Chinese
  ],
  5: [
    1824, // English
  ],
  6: [
    1540, // German
  ],
  7: [
    2780, // Japanese
  ],
  8: [
    1943, // French
  ],
  9: [
    5980, // Spanish
    1167, // Catalan
    5644, // Russian
  ],
  10: [
    6615, // Turkish - 32,150 videos
    5326, // Polish - 27,971 videos
    4677, // Dutch - 22,453 videos
  ],
  11: [
    2351, // Hebrew
    5332, // Portuguese
    1800, // Greek
    6736, // Ukrainian
    1222, // Czech
    346, // Arabic
    5892, // Slovak
    4247, // Malay
  ],
  12: [
    2645, // Italian
  ],
  13: [
    2601, // Indonesian - 19,154 videos
    6115, // Swedish - 15,236 videos
    4759, // Norwegian - 12,061 videos
    4448, // Min Nan - 8,717 videos
  ],
  14: [
    6325, // Thai - 15,576 videos
    4392, // Burmese
  ]
};

export default ({ app }, inject) => {
  inject("directus", {
    host: process.server
      ? process.env.baseUrl
      : window.location.protocol +
        "//" +
        window.location.hostname +
        ":" +
        window.location.port,

    langCodeById(langId) {
      let lang = app.$languages && app.$languages.getById
        ? app.$languages.getById(langId)
        : null;
      return lang ? lang.code : null;
    },

    tokenOptions(options = {}) {
      let token = app.$auth.strategy.token.get();
      if (token) {
        if (!options.headers) options.headers = {};
        options.headers.Authorization = token;
        return options;
      } else return options;
    },

    /**
     * We append a cors=... query string because directus server caching seems to 'remember' cors header, causing problems when multiple doamins try ti access
     * @param {String} url
     * @returns Url with cors string attached
     */
    appendHostCors(url) {
      let joiner = url.includes("?") ? "&" : "?";
      return url + joiner + `cors=${this.host}`;
    },

    async patch(path, payload) {
      let res = await axios
        .patch(
          this.appendHostCors(DIRECTUS_API_URL + path),
          payload,
          this.tokenOptions()
        )
        .catch((err) => logError(err));
      if (res) return res;
    },

    async post(path, payload, catchErrors = true) {
      let res = await axios
        .post(
          this.appendHostCors(DIRECTUS_API_URL + path),
          payload,
          this.tokenOptions()
        )
        .catch((err) => {
          if (catchErrors) logError(err);
          else 
            throw err;
        });
      if (res) return res;
    },

    async delete(path) {
      let res = await axios
        .delete(
          this.appendHostCors(DIRECTUS_API_URL + path),
          this.tokenOptions()
        )
        .catch((err) => logError(err));
      if (res) return res;
    },

    async get(path, params = {}) {
      let res = await axios
        .get(
          this.appendHostCors(DIRECTUS_API_URL + path),
          this.tokenOptions({ params })
        )
        .catch((err) => logError(err));
      if (res) return res;
    },

    async getData(path, params = {}) {
      let res = await this.get(path, params);
      if (res?.data?.data) {
        let data = res.data.data;
        return data;
      }
    },

    /**
     * Count the number of episodes in a show
     * @param {string} showType 'tv_show' or 'talk'
     * @param {number} showId
     * @param {string} l2Code
     * @returns
     */
    async countShowEpisodes(showType, showId, l2Code, adminMode = false) {
      if (!l2Code) return 0;
      try {
        // SPEC-039 5.5 — count.php replaced by Flask /videos/count.
        let res = await axios.get(
          `${PYTHON_SERVER}videos/count?l2=${encodeURIComponent(l2Code)}&type=${showType}&id=${showId}`
        );
        let data = Number(res?.data);
        return data || 0;
      } catch (err) {
        logError(err, "directus.js: countShowEpisodes()");
        return 0;
      }
    },

    async getRandomEpisodeYouTubeId(langCode, type) {
      if (!langCode) return false;
      try {
        let response = await axios.get(
          `${PYTHON_SERVER}videos/random?l2=${encodeURIComponent(langCode)}${type ? `&type=${type}` : ""}`
        );
        return response?.data?.youtube_id || false;
      } catch (err) {
        logError(err, "directus.js: getRandomEpisodeYouTubeId()");
        return false;
      }
    },

    async deleteVideo({ id, l2Id }) {
      let res = await this.delete(`${this.youtubeVideosTableName(l2Id)}/${id}`);
      if (res?.status === 204) {
        return true;
      }
    },

    async patchVideo({ id, l2Id, payload, query }) {
      query = query ? `?${query}` : "";
      let queryURL = `${this.youtubeVideosTableName(l2Id)}/${id}${query}`;
      let res = await this.patch(queryURL, payload);
      if (res?.data?.data) {
        let data = res.data.data;
        return data;
      }
    },

    normalizeDifficulty(video) {
      if (!video.difficulty) {
        if (video.lex_div && video.word_freq) {
          let lex_div = video.lex_div;
          let word_freq = video.word_freq;
          let difficulty = lex_div / word_freq
          video.difficulty = difficulty;
        }
      }
      return video;
    },

    async getVideo({ id, l2Code }) {
      if (!l2Code) return null;
      // SPEC-039 5.5 — PHP video/{suffix}/{id} replaced by Flask /videos/id/<id>.
      const url = `${PYTHON_SERVER}videos/id/${id}?l2=${encodeURIComponent(l2Code)}&subs_l2=1`;
      let res = await axios.get(url).catch((err) => logError(err, "directus.js: getVideo()"));
      if (res?.data) {
        let video = res.data;
        video = this.normalizeDifficulty(video);
        return video;
      }
      return null;
    },

    async getVideos({ l2Id, query = "", params = {}, subs = false, tags = false } = {}) {
      const l2Code = this.langCodeById(l2Id);
      if (!l2Code) return [];
      // You can use either a query string or params object
      if (query) {
        params = parseQueryString(query);
      }
      // Some call sites historically included a trailing "=" in filter keys.
      let normalized = {};
      for (let key in params) {
        normalized[key.replace(/=$/, "")] = params[key];
      }
      params = normalized;
      // SPEC-039 5.5 — Directus filter params are translated to the Flask
      // /search-videos contract; ids returned by Flask are consolidated.
      let p = {
        l2: l2Code,
        subs: subs ? "1" : undefined,
        offset: params.offset || 0,
        limit: params.limit || 50,
      };
      // Directus filter keys are `filter[field][op]`. `key` arrives as
      // `field[op]`, so the canonical lookup is `filter[` + `field][op]`.
      const filter = (key) => params["filter[" + key.replace("[", "][")];
      const eq = (key) => filter(`${key}[eq]`);
      const isNull = (key) => filter(`${key}[null]`) === 1 || filter(`${key}[null]`) === "1";

      if (eq("youtube_id")) p.youtubeIds = eq("youtube_id");
      if (filter("youtube_id[in]")) p.youtubeIds = filter("youtube_id[in]");
      if (eq("tv_show")) p.tvShow = eq("tv_show");
      if (eq("talk")) p.talk = eq("talk");
      if (isNull("tv_show") || isNull("talk")) p.noShow = "1";
      if (filter("title[contains]")) p.q = filter("title[contains]");
      if (filter("title[eq]")) p.q = filter("title[eq]");
      if (filter("title[gt]")) p.titleGt = filter("title[gt]");
      if (filter("date[lt]")) p.dateLt = filter("date[lt]");
      if (filter("views[lt]")) p.viewsLt = filter("views[lt]");
      if (filter("difficulty[gt]")) p.difficultyGt = filter("difficulty[gt]");
      if (filter("difficulty[between]")) p.difficultyBetween = filter("difficulty[between]");
      if (eq("channel_id")) p.channelId = eq("channel_id");
      if (filter("channel_id[in]")) p.channelIds = filter("channel_id[in]");
      if (eq("category")) p.category = eq("category");
      if (filter("category[nin]")) p.excludeCategories = filter("category[nin]");
      if (eq("locale")) p.locale = eq("locale");
      if (filter("locale[contains]")) p.localeContains = filter("locale[contains]");
      if (eq("made_for_kids")) p.madeForKids = eq("made_for_kids");
      if (filter("type[neq]")) p.typeNeq = filter("type[neq]");
      if (filter("lesson[eq]")) p.lesson = filter("lesson[eq]");
      if (eq("level")) p.level = eq("level");
      if (params.sort) p.sort = params.sort;
      if (params.meta === "filter_count") p.withCount = "1";

      // New-API call sites pass canonical /search-videos params directly
      // (q, tag, tvShow, channelId, ...). Prefer those over translated
      // Directus filters when both are present.
      const canonicalParams = [
        "q", "tag", "tvShow", "talk", "noShow", "channelId", "channelIds",
        "category", "excludeCategories", "locale", "localeContains",
        "madeForKids", "typeNeq", "lesson", "level", "difficultyBetween",
        "titleGt", "dateLt", "viewsLt", "difficultyGt", "sort", "limit",
        "offset", "subs",
      ];
      for (let key of canonicalParams) {
        if (params[key] !== undefined) p[key] = params[key];
      }

      Object.keys(p).forEach((key) => p[key] === undefined && delete p[key]);
      let res = await axios
        .get(`${PYTHON_SERVER}search-videos`, { params: p })
        .catch((err) => logError(err, "directus.js: getVideos()"));
      if (res?.data) {
        let videos = res.data;
        if (videos && videos.meta) videos = videos.data;
        videos = (videos || []).map((video) => this.normalizeDifficulty(video));
        return videos;
      } else return [];
    },

    async searchCaptions({ l2Obj, tv_show, category, terms, limit, sort, timestamp }) {
      if (!l2Obj) throw "Directus.searchCaptions: l2Obj is not set!";

      let url
      let params = {}
      // const server = 'php' // 'python' or 'php'
      const server = 'python' // 'python' or 'php'
      if (server === 'python') {
        const l2_code = l2Obj.code;
        params.l2 = l2_code;
        url = PYTHON_SERVER + "subs-search";
      }
      else if (server === 'php') {
        const l2Id = l2Obj.id;
        let suffix = this.youtubeVideosTableSuffix(l2Id);
        params.l2 = l2Id
        params.suffix = suffix ? '_' + suffix : ''
        url = LP_DIRECTUS_TOOLS_URL + "videos";
      }
      if (tv_show) params.tv_show = tv_show;
      if (category) params.category = category;
      if (terms) params.terms = terms.join(",");
      if (timestamp) params.timestamp = timestamp;
      if (limit) params.limit = limit;
      if (sort) params.sort = sort;
      let res = await axios
        .get(this.appendHostCors(url), { params })
        .catch((err) => logError(err));
      if (res?.data) {
        let videos = res.data;
        return videos;
      } else return [];
    },

    async postVideo(video, l2, limit = false, tries = 0) {
      let lines = video.subs_l2 || [];
      if (limit) lines = lines.slice(0, limit);
      for (let line of lines) {
        line.line = he.decode(line.line); // parse html entities
      }
      let csv = app.$subs.unparseSubs(lines, l2.code);
      let {
        youtube_id,
        title,
        channel,
        channel_id,
        date,
        tags,
        category,
        locale,
        duration,
        made_for_kids,
        views,
        likes,
        comments,
      } = video;
      tags = tags ? tags.split(",") : [];
      let data = {
        youtube_id,
        title: title || "Untitled",
        l2: l2.id,
        subs_l2: csv.replace(/&quot;/g, "”"),
        channel_id: channel ? channel.id : channel_id,
        date: DateHelper.unparseDate(date),
        tags: reduceTags(tags, 200), // The database field is limited to 200 characters
        category,
        locale,
        duration,
        made_for_kids: made_for_kids ? 1 : 0,
        views,
        likes,
        comments,
      };
      if (video.tv_show) data.tv_show = video.tv_show.id;
      if (video.talk) data.talk = video.talk.id;
      try {
        let response = await this.post(
          `${this.youtubeVideosTableName(l2.id)}?fields=id,tv_show,talk`,
          data
        );
        response = response.data;
        if (response && response.data) {
          return response.data.id;
        }
      } catch (err) {
        if (tries > 1) return; // Only 2 tries
        if (!limit) limit = video.subs_l2.length;
        if (limit > 0) {
          return this.postVideo(video, l2, Math.floor(limit / 2), tries + 1); // Try with half the lines each time
        }
      }
    },

    // Returns '' (empty string), '1', '2, '3', etc.
    youtubeVideosTableSuffix(langId) {
      langId = parseInt(langId);
      if (!langId)
        throw "Directus.youtubeVideosTableSuffix: langId is not set!";
      let suffix = "";
      for (let key in YOUTUBE_VIDEOS_TABLES) {
        if (YOUTUBE_VIDEOS_TABLES[key].includes(langId)) {
          suffix = key;
        }
      }
      return suffix;
    },

    youtubeVideosTableHasOnlyOneLanguage(langId) {
      if (!langId)
        throw "Directus.youtubeVideosTableHasOnlyOneLanguage: langId is not set!";
      for (let key in YOUTUBE_VIDEOS_TABLES) {
        if (YOUTUBE_VIDEOS_TABLES[key].includes(langId)) {
          return YOUTUBE_VIDEOS_TABLES[key].length === 1;
        }
      }
    },

    youtubeVideosTableName(langId) {
      let suffix = this.youtubeVideosTableSuffix(langId);
      if (suffix) suffix = "_" + suffix;
      return `items/youtube_videos${suffix}`;
    },

    async checkShows(videos, langId, adminMode = false) {
      const l2Code = this.langCodeById(langId);
      if (!l2Code) return videos;
      let shows = [];
      try {
        // SPEC-039 5.5 — tv_shows/talks served by Flask.
        const [tvRes, talkRes] = await Promise.all([
          axios.get(`${PYTHON_SERVER}tv-shows?l2=${encodeURIComponent(l2Code)}&limit=500`),
          axios.get(`${PYTHON_SERVER}talks?l2=${encodeURIComponent(l2Code)}&limit=500`),
        ]);
        shows = [...(tvRes?.data || []), ...(talkRes?.data || [])];
      } catch (err) {
        logError(err, "directus.js: checkShows()");
      }
      let showTitles = shows.map((show) => show.title);
      let regex = new RegExp(showTitles.map((t) => escapeRegExp(t)).join("|"));
      for (let video of videos) {
        if (regex.test(video.title)) {
          video.show = shows.find((show) => video.title.includes(show.title));
        }
      }
      return videos;
    },

    async sendPasswordResetEmail({ email }) {
      let host = WEB_URL;
      if (process.server) host = process.env.baseUrl;
      let reset_url = `${host}/password-reset`;
      let res = await this.post(`auth/password/request`, {
        email,
        reset_url,
      }, false); // Don't catch errors
      return res && res.status === 200;
    },

    async resetPassword({ token, password }) {
      let res = await this.post(`auth/password/reset`, {
        token,
        password,
      });
      return res && res.status === 200;
    },

    // Initialize the user data record if there isn't one
    async createNewUserDataRecord(token, payload = {}) {
      let res = await this.post(`items/user_data`, payload).catch((err) => {
        console.log(
          "Axios error in savedWords.js: err, url, payload",
          err,
          url,
          payload
        );
      });
      if (res && res.data && res.data.data) {
        let userDataId = res.data.data.id;
        return userDataId;
      }
    },

    /**
     * Initialize and fetch the user data if they are logged in.
     * If no user data is found, create and store it.
     * If the user is not logged in or the token is invalid, log out and redirect.
     */
    async fetchOrCreateUserData() {
      // Check if the user is logged in, return false if not
      if (!this.isLoggedIn()) {
        return false;
      }

      // Get the user's authentication token
      const token = this.getToken();
      // If the token is not available, log out and redirect the user
      if (!token) {
        this.logoutAndRedirect();
        return;
      }

      // Fetch the user's data using the token
      const userData = await this.fetchUserData(token);
      // If no user data is found, create and store new user data
      if (!userData) {
        await this.createAndStoreUserData(token);
      } else {
        // If user data is found, store it in the application
        this.storeUserData(userData);
      }
    },

    isLoggedIn() {
      return app.$auth && app.$auth.loggedIn && app.$auth.user;
    },

    async getCurrentUser() {
      // Make sure to bust cache
      let res = await this.get(`users/me?timestamp=${Date.now()}`);
      let user = res?.data?.data;
      return user;
    },

    getToken() {
      const token = app.$auth.strategy.token.get();
      return token ? token.replace("Bearer ", "") : undefined;
    },

    logoutAndRedirect() {
      app.$auth.setUser(null);
      app.$toast.error($tb("Sorry, but you need to login again."), {
        position: "top-center",
        duration: 5000,
      });
      app.$router.push({ name: "login" });
    },

    async fetchUserData(token) {
      const user = app.$auth.user;
      const userDataRes = await this.get(
        `items/user_data?fields=id,owner,saved_hits,saved_collocations&filter[owner][eq]=${
          user.id
        }&limit=1&timestamp=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      return (
        userDataRes &&
        userDataRes.data &&
        userDataRes.data.data &&
        userDataRes.data.data[0]
      );
    },

    async createAndStoreUserData(token) {
      const dataId = await this.createNewUserDataRecord(token);
      app.$auth.$storage.setUniversal("dataId", dataId);
    },

    storeUserData({ id }) {
      app.$auth.$storage.setUniversal("dataId", id);
      // Saved words now come from Flask's row API (SPEC-034); the Directus
      // saved_words blob is no longer read here.
      app.store.dispatch("savedWords/fetchFromFlask");
      // Progress, settings, and saved phrases come from Flask's row API
      // (SPEC-039 5.2); only the remaining Classic-only fields still load from
      // the Directus blob.
      app.store.dispatch("savedPhrases/fetchFromFlask");
      app.store.dispatch("progress/fetchFromFlask");
      app.store.dispatch("settings/fetchFromFlask");
      app.store.dispatch("history/fetchFromFlask");
      app.store.dispatch("bookshelf/fetchFromFlask");
    },

    async checkSubscription() {
      let res = await this.get(
        `items/subscriptions?filter[owner][eq]=${
          app.$auth.user.id
        }&timestamp=${Date.now()}`
      );
      if (res && res.data && res.data.data) {
        if (res.data.data[0]) {
          let subscription = res.data.data[0];
          app.$auth.$storage.setUniversal("subscription", subscription);
          return subscription;
        } else {
          return false;
        }
      }
    },

    async subscriptionExpired() {
      let subscription = await this.checkSubscription();
      if (subscription) {
        if (subscription.type === "lifetime") return false;
        let now = new Date();
        let expires = new Date(subscription.expires_on);
        let expired = now > expires;
        return expired;
      }
      return true;
    },
  });
};
