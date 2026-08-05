import DateHelper from "../lib/date-helper";
import he from "he"; // html entities
import {
  escapeRegExp,
  logError,
  PYTHON_SERVER,
  WEB_URL,
  reduceTags,
  parseQueryString,
} from "../lib/utils";

export default ({ app }, inject) => {
  // Use the Nuxt axios instance so @nuxtjs/auth attaches the token and
  // auto-refreshes expired access tokens on 401 (SPEC-039 5.7/5.8).
  const axios = app.$axios;

  inject("directus", {
    langCodeById(langId) {
      let lang = app.$languages && app.$languages.getById
        ? app.$languages.getById(langId)
        : null;
      return lang ? lang.code : null;
    },

    /**
     * SPEC-039 5.7/5.8 — every Classic data call now goes to Flask with the
     * nuxt-auth token (a verified Supabase JWT through Flask). Directus is
     * gone from Classic.
     */
    flaskHeaders() {
      let token = app.$auth && app.$auth.strategy.token.get();
      let headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = token;
      return headers;
    },

    // ── Curated content wrapper (SPEC-039 5.8) ────────────────────────

    async content(collection, query = "") {
      let url = `${PYTHON_SERVER}content/${collection}`;
      if (query) url += (url.includes("?") ? "&" : "?") + query;
      let res = await axios
        .get(url, { headers: this.flaskHeaders() })
        .catch((err) => logError(err, `directus.js: content(${collection})`));
      return res;
    },

    async contentGet(collection, id, query = "") {
      let url = `${PYTHON_SERVER}content/${collection}/${id}`;
      if (query) url += (url.includes("?") ? "&" : "?") + query;
      let res = await axios
        .get(url, { headers: this.flaskHeaders() })
        .catch((err) => logError(err, `directus.js: contentGet(${collection})`));
      return res;
    },

    async contentPost(collection, payload) {
      let res = await axios
        .post(`${PYTHON_SERVER}content/${collection}`, payload, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, `directus.js: contentPost(${collection})`));
      return res;
    },

    async contentPatch(collection, id, payload) {
      let res = await axios
        .patch(`${PYTHON_SERVER}content/${collection}/${id}`, payload, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, `directus.js: contentPatch(${collection})`));
      return res;
    },

    async contentDelete(collection, id) {
      let res = await axios
        .delete(`${PYTHON_SERVER}content/${collection}/${id}`, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, `directus.js: contentDelete(${collection})`));
      return res;
    },

    // ── Classic dictionary + feedback adapters (SPEC-039 5.8) ─────────

    async classicDict(table, query = "") {
      let url = `${PYTHON_SERVER}classic/dictionary/${table}`;
      if (query) url += (url.includes("?") ? "&" : "?") + query;
      let res = await axios
        .get(url, { headers: this.flaskHeaders() })
        .catch((err) => logError(err, `directus.js: classicDict(${table})`));
      return res;
    },

    async postFeedback(payload) {
      let res = await axios
        .post(`${PYTHON_SERVER}classic/feedback`, payload, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: postFeedback()"));
      return res;
    },

    async deleteAccount() {
      let res = await axios
        .delete(`${PYTHON_SERVER}auth/delete-account`, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: deleteAccount()"));
      return res;
    },

    // ── Stats (SPEC-039 5.8) ──────────────────────────────────────────

    async statsVideoCounts() {
      let res = await axios
        .get(`${PYTHON_SERVER}stats/video-counts`)
        .catch((err) => logError(err, "directus.js: statsVideoCounts()"));
      return res;
    },

    async statsContentCounts(l2Code) {
      let res = await axios
        .get(`${PYTHON_SERVER}stats/content-counts?l2=${encodeURIComponent(l2Code)}`)
        .catch((err) => logError(err, "directus.js: statsContentCounts()"));
      return res;
    },

    // ── Admin video tools (SPEC-039 5.8) ──────────────────────────────

    async adminVideoList(query = "") {
      let url = `${PYTHON_SERVER}admin/videos`;
      if (query) url += (url.includes("?") ? "&" : "?") + query;
      let res = await axios
        .get(url, { headers: this.flaskHeaders() })
        .catch((err) => logError(err, "directus.js: adminVideoList()"));
      return res;
    },

    async adminVideoDelete(id) {
      let res = await axios
        .delete(`${PYTHON_SERVER}admin/videos/${id}`, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: adminVideoDelete()"));
      return res;
    },

    // ── Admin shows/talks CRUD (SPEC-039 5.8) ─────────────────────────

    async createShow(type, payload) {
      // type: 'tv-shows' | 'talks'
      let res = await axios
        .post(`${PYTHON_SERVER}admin/${type}`, payload, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: createShow()"));
      return res;
    },

    async patchShow(type, id, payload) {
      let res = await axios
        .patch(`${PYTHON_SERVER}admin/${type}/${id}`, payload, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: patchShow()"));
      return res;
    },

    async deleteShow(type, id) {
      let res = await axios
        .delete(`${PYTHON_SERVER}admin/${type}/${id}`, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: deleteShow()"));
      return res;
    },

    // ── Content reads already on Flask (SPEC-039 5.5) ─────────────────

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

    async deleteVideo({ id }) {
      let res = await this.adminVideoDelete(id);
      return res && res.status === 204;
    },

    async patchVideo({ id, payload }) {
      let res = await axios
        .patch(`${PYTHON_SERVER}admin/videos/${id}`, payload, {
          headers: this.flaskHeaders(),
        })
        .catch((err) => logError(err, "directus.js: patchVideo()"));
      return res && res.data && res.data.video;
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
      // SPEC-039 5.5 — legacy filter params are translated to the Flask
      // /search-videos contract; ids returned by Flask are consolidated.
      let p = {
        l2: l2Code,
        subs: subs ? "1" : undefined,
        offset: params.offset || 0,
        limit: params.limit || 50,
      };
      // Legacy filter keys are `filter[field][op]`. `key` arrives as
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
      if (!l2Obj) throw "searchCaptions: l2Obj is not set!";

      let params = {};
      // SPEC-039 5.5 — subs search served by Flask on Postgres/pg_trgm.
      params.l2 = l2Obj.code;
      if (tv_show) params.tv_show = tv_show;
      if (category) params.category = category;
      if (terms) params.terms = terms.join(",");
      if (timestamp) params.timestamp = timestamp;
      if (limit) params.limit = limit;
      if (sort) params.sort = sort;
      let res = await axios
        .get(`${PYTHON_SERVER}subs-search`, { params })
        .catch((err) => logError(err, "directus.js: searchCaptions()"));
      if (res?.data) {
        let videos = res.data;
        return videos;
      } else return [];
    },

    // ── Video admin create (SPEC-039 5.8) ─────────────────────────────

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
        let res = await axios.post(
          `${PYTHON_SERVER}admin/videos`,
          data,
          { headers: this.flaskHeaders() }
        );
        if (res && res.data) {
          return res.data.id;
        }
      } catch (err) {
        if (tries > 1) return; // Only 2 tries
        if (!limit) limit = video.subs_l2.length;
        if (limit > 0) {
          return this.postVideo(video, l2, Math.floor(limit / 2), tries + 1); // Try with half the lines each time
        }
      }
    },

    // ── Shows/talks enrichment (SPEC-039 5.5) ─────────────────────────

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

    // ── Auth helpers (SPEC-039 5.7 — Flask → GoTrue) ──────────────────

    async sendPasswordResetEmail({ email }) {
      let host = WEB_URL;
      if (process.server) host = process.env.baseUrl;
      let reset_url = `${host}/password-reset`;
      let res = await axios
        .post(
          `${PYTHON_SERVER}auth/password-request`,
          { email, reset_url },
          { headers: this.flaskHeaders() }
        )
        .catch((err) => {
          throw err; // Don't catch errors
        });
      return res && res.status === 200;
    },

    async resetPassword({ token, password }) {
      let res = await axios
        .post(
          `${PYTHON_SERVER}auth/password-reset`,
          { token, password },
          { headers: this.flaskHeaders() }
        )
        .catch((err) => logError(err, "directus.js: resetPassword()"));
      return res && res.status === 200;
    },

    // ── Subscriptions (SPEC-039 5.6 — Flask) ──────────────────────────

    async checkSubscription() {
      const userId = app.$auth?.user?.id;
      if (!userId) return false;
      try {
        const token = app.$auth.strategy.token.get() || '';
        let res = await axios.get(
          `${PYTHON_SERVER}user-subscription`,
          { headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, '')}` } }
        );
        const data = res?.data;
        const subscription = data && data.subscription !== undefined
          ? data.subscription
          : data;
        if (subscription) {
          app.$auth.$storage.setUniversal("subscription", subscription);
          return subscription;
        }
        return false;
      } catch (err) {
        logError(err, "directus.js: checkSubscription()");
        return false;
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
