<template>
  <div
    class="show-card"
    :class="{ 'tv-show-card-hidden': show.hidden }"
    v-observe-visibility="{
      callback: visibilityChanged,
      once: true,
    }"
  >
    <VideoThumbnailStack
      :thumbnail="thumbnail"
      :to="to"
      :title="show.title"
      :videos="show.episodes || []"
    >
      <!-- Turn off levels for now before we refresh difficulty score averages -->
      <!-- <template #afterTitle
        ><span
          v-if="show.level"
          :data-bg-level="levels[show.level].level"
          class="level-tag"
        >
          {{ levels[show.level].name }}
        </span></template
      > -->
      <template #belowTitle
        ><MediaItemStats
          :item="show"
          style="font-size: 0.8em; margin-top: 0.25rem; opacity: 0.8" />
        <div v-if="$adminMode">
          <b-button
            v-if="$adminMode"
            size="sm"
            class="admin-hide-button"
            @click.stop.prevent="toggle(show, 'hidden')"
          >
            <i class="far fa-eye" v-if="show.hidden"></i>
            <i class="far fa-eye-slash" v-else></i>
          </b-button>
          <b-button
            v-if="$adminMode"
            size="sm"
            class="admin-audiobook-button"
            @click.stop.prevent="toggle(show, 'audiobook')"
          >
            <i class="fa fa-microphone" v-if="show.audiobook"></i>
            <i class="fa fa-microphone-slash" v-else></i>
          </b-button>
          <b-button
            v-if="$adminMode"
            size="sm"
            class="admin-remove-button"
            @click.stop.prevent="remove(show)"
          >
            <i class="fa fa-trash"></i>
          </b-button></div
      ></template>
    </VideoThumbnailStack>
  </div>
</template>

<script>
import { languageLevels } from "../lib/utils";
import YouTube from "../lib/youtube";
import { mapState } from "vuex";
import Vue from "vue";
export default {
  async created() {
    // If the show has no episodes, load them
    if (!this.show.episodes || !this.show.episodes.length) {
      this.$store.dispatch("shows/getEpisodesFromServer", {
        l2: this.$l2,
        collection: this.type,
        showId: this.show.id,
        limit: 5,
      });
    }
  },
  data() {
    return {
      field: this.type === "tvShows" ? "tv_show" : "talk",
      slug: this.type === "tvShows" ? "tv-show" : "talk",
      coverUnavailable: false, // Set to true if the cover image is not available, meaning that the first video is not available
    };
  },
  props: {
    show: {
      type: Object,
    },
    type: {
      type: String, // 'tvShows' or 'talks'
    },
  },
  computed: {
    ...mapState("shows", ["categories"]),
    levels() {
      return languageLevels(this.$l2);
    },
    thumbnail() {
      return `https://img.youtube.com/vi/${this.show.youtube_id}/hqdefault.jpg`;
    },
    to() {
      const showList = {
        name: "l1-l2-show-type-id",
        params: { type: this.slug, id: this.show.id },
      };
      // const firstEpisode = {
      //   name: "l1-l2-video-view-type",
      //   params: { type: "youtube" },
      //   query: { v: this.show.youtube_id },
      // };
      const to = showList
      return to;
    },
  },
  methods: {
    async visibilityChanged(visible) {
      if (visible && !this.$adminMode) {
        let unavailable = await YouTube.videoUnavailable(this.show.youtube_id);
        if (unavailable) {
          this.unavailable = true;
          this.$emit("unavailable", this.show);
        }
      }
    },
    async remove(show) {
      if (
        confirm(
          `Are you sure you want to remove the show "${show.title} (${show.id})?"`
        )
      ) {
        this.$store.dispatch("shows/remove", {
          l2: this.$l2,
          type: this.type,
          show,
        });
      }
    },
    async toggle(show, property) {
      let toggled = !show[property]; // If true, make it false, and vice versa
      let path = `items/${this.field}s/${show.id}`;
      let payload = {};
      payload[property] = toggled;
      let response = await this.$directus.patch(path, payload, {
        contentType: "application/json",
      });
      if (response && response.data.data) {
        Vue.set(show, property, toggled);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../assets/scss/variables.scss";

.show-tag {
  font-size: 0.8em;
  color: #888;
}

.show-tags {
  line-height: 1;
}
</style>
