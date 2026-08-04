<template>
  <div class="loader-bg">
    <SocialHead
      title="Discover TV Shows Across Languages | Language Player"
      description="Watch TV shows across languages at random and be surprised!"
    />
    <div class="container">
      <div class="row">
        <div
          class="col-12 loader-wrapper"
        >
          <LazyDiscoverPlayer
            routeType="tv-shows"
            :shows="[]"
            style="flex: 1"
            :l1="$l1"
            :l2="$l2"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from "axios";
import { randomInt, unique, PYTHON_SERVER } from "../lib/utils";

export default {
  props: {
    type: {
      default: "tv-shows", // or 'talks'
    },
    l1: {
      type: String,
    },
    l2: {
      type: String,
    },
  },
  data() {
    return {
      lastShowId: undefined,
      limit: 500,
      randomShows: undefined,
    };
  },
  computed: {
    english() {
      return this.$languages.l1s.find((language) => language.code === "en");
    },
  },
  methods: {
    async getLastShowId() {
      try {
        // SPEC-039 5.5 — tv_shows/talks served by Flask.
        const endpoint = this.type === "tv-shows" ? "tv-shows" : "talks";
        let res = await axios.get(
          `${PYTHON_SERVER}${endpoint}?limit=${this.limit}`
        );
        const shows = Array.isArray(res?.data) ? res.data : [];
        if (shows.length > 0) {
          return Math.max(...shows.map((s) => Number(s.id) || 0));
        }
      } catch (err) {
        console.error("Error fetching max show id", err);
      }
      return undefined;
    },
    generateRandomIds(max, count = 500) {
      let randIds = [];
      for (let i = 0; i < count; i++) {
        randIds.push(randomInt(max));
      }
      return unique(randIds);
    },
    async loadRandomShowsMatchingIds(ids, adminMode) {
      try {
        const endpoint = this.type === "tv-shows" ? "tv-shows" : "talks";
        let response = await axios.get(
          `${PYTHON_SERVER}${endpoint}?limit=${this.limit}${adminMode ? "&includeHidden=1" : ""}`
        );
        const shows = Array.isArray(response?.data) ? response.data : [];
        return shows.filter((show) => ids.includes(Number(show.id)));
      } catch (err) {
        console.error("Error loading random shows", err);
        return [];
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.loader-wrapper {
  padding-top: 3rem;
  color: white;
}

.loader-bg {
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
}
</style>
