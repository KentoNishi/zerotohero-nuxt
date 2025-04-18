<template>
  <div
    :class="{
      'search-subs search-subs-dark pb-3': true,
      fullscreen,
      reels: fullscreen && reels,
    }"
  >
    <div class="text-center pb-2">
      <span>
        <!-- Navigation Buttons -->
        <SimpleButton
          v-if="hits.length > 0"
          :disabled="hitIndex === 0"
          iconClass="fas fa-step-backward"
          :title="$t('Previous Clip')"
          @click="goToPrevHit"
        />
        <SimpleButton
          v-if="hits.length > 0"
          :disabled="hitIndex >= hits.length - 1"
          iconClass="fas fa-step-forward"
          :title="$t('Next Clip')"
          @click="goToNextHit"
        />


        <!-- Show playlist modal, showing current Hit Index -->
        <SimpleButton
          v-if="hits.length > 0"
          iconClass="fa-solid fa-list mr-1"
          :title="$t('List All Clips')"
          @click="showPlaylistModal"
          :text="
            $t('{num} of {total}', { num: hitIndex + 1, total: hits.length })
          "
        />
        
        <!-- Filter and List -->
        <SimpleButton
          v-if="!regex && hits.length > 0"
          iconClass="fas fa-filter"
          :title="$t('Filter Clips by Keywords')"
          @click="showFilter = !showFilter"
        />

        <!-- Search Input -->
        <div class="d-flex" style="gap: 0.25rem;">
          <b-form-input
            v-if="regex || showFilter"
            type="text"
            class="d-inline-block"
            size="sm"
            v-model="regex"
            :placeholder="$t('Filter with regex...')"
          />
          <b-form-input
            v-if="regex || showFilter"
            type="text"
            class="d-inline-block"
            size="sm"
            v-model="regexExclude"
            :placeholder="$t('Exclude with regex...')"
          />
        </div>
      </span>
    </div>

    <div
      :class="{ 'loader text-center pb-5 pt-3': true, 'd-none': !checking }"
      style="flex: 1"
    >
      <Loader :sticky="true" message="Searching through video captions..." />
    </div>
    <div class="p-3" v-if="!checking && hits.length === 0">
      <p>{{ $t("Sorry, no hits found.") }} {{ $t("To see more results:") }}</p>
      <ol>
        <li>
          {{ $t("Select different search terms from the dropdown above.") }}
        </li>
        <li>
          {{
            $t(
              "Select more video categories and shows from the dropdown above."
            )
          }}
        </li>
        <li v-if="$store.state.settings.subsSearchLimit">
          {{
            $t(
              "Turn off ‘Limit “this word in TV Shows” search result (faster)’ in Settings."
            )
          }}
          <router-link :to="{ name: 'l1-l2settings' }">
            {{ $t("Go to settings") }}
          </router-link>
        </li>
      </ol>
      <b-button
        v-if="$adminMode"
        size="sm"
        variant="primary"
        @click="searchSubsAndProcessHits"
      >
        <i class="fa fa-sync-alt"></i>
        {{ $t("Refresh") }}
      </b-button>
    </div>
    <template v-if="pro || hitIndex < NON_PRO_MAX_SUBS_SEARCH_HITS">
      <div v-if="reels && currentHit" class="video-title">
        <b>{{ $t("VIDEO SOURCE") }}:</b>
        <span>{{ currentHit.video.title }}</span>
      </div>
      <LazyVideoWithTranscript
        v-if="currentHit"
        :ref="`youtube-${hitIndex}`"
        v-bind="{
          autoload: true,
          autoplay: false,
          cc: true,
          episodes: hits.map((h) => h.video),
          forcePro: true,
          forceMode: 'subtitles',
          show: currentHit.show,
          showInfoButton: true,
          showAnimation: !reels,
          showFullscreenToggle: true,
          showInfo: true,
          showLineList: false,
          showType: currentHit.showType,
          speed,
          starttime: currentHit.video.subs_l2[currentHit.lineIndex].starttime,
          type: 'youtube',
          video: currentHit.video,
        }"
        @previous="goToPrevHit"
        @next="goToNextHit"
        @videoUnavailable="onVideoUnavailable"
      />
    </template>
    <div v-if="!pro">
      <YouNeedPro
        v-if="hitIndex > NON_PRO_MAX_SUBS_SEARCH_HITS - 1"
        :showLogo="false"
        :showScreen="false"
        class="pb-5"
        :message="
          $t('See all {num} search results with a Pro account', {
            num: hits.length,
          })
        "
      />
    </div>
    <!-- Open Full Video -->
    <div class="text-center my-4">
      <router-link
        v-if="currentHit"
        :to="{
          name: 'l1-l2-video-view-type',
          params: {
            type: 'youtube',
            youtube_id: currentHit.video.youtube_id,
          },
          query: {
            t: currentHit.video.subs_l2[currentHit.lineIndex].starttime,
          },
        }"
        class="btn btn-no-bg"
        :title="$t('Open this video with full transcript')"
      >
        {{ $t("View Full Video") }} <i class="fa-solid fa-chevron-right ml-1"></i>
      </router-link>
    </div>
    <PlaylistModal
      ref="playlist-modal"
      v-bind="{
        sort,
        currentHit,
        terms,
        level,
        get,
        goToHit,
      }"
      @updateSort="(newSortValue) => (sort = newSortValue)"
      @goToNextHit="goToNextHit"
      @removeSavedHit="removeSavedHit"
      @saveHit="saveHit"
      @removeHit="removeSavedHit"
    />
  </div>
</template>

<script>
import {
  unique,
  ucFirst,
  timeout,
  highlightMultiple,
  iOS,
  NON_PRO_MAX_SUBS_SEARCH_HITS,
} from "../lib/utils";
import YouTube from "../lib/youtube";
import Vue from "vue";

export default {
  props: {
    terms: {
      type: Array,
    },
    level: {
      type: String,
    },
    keyboard: {
      default: true,
    },
    fullscreenToggle: {
      default: true,
    },
    tvShow: {
      default: undefined,
    },
    exact: {
      default: false,
    },
    skin: {
      default: "light",
    },
    context: {
      type: Object, // { form, text, starttime = undefined, youtube_id = undefined }
    },
    excludeTerms: {
      type: Array,
      default: undefined,
    },
  },
  data() {
    return {
      paused: true,
      currentHit: undefined,
      groupsRight: {},
      groupsLeft: {},
      foundHits: [],
      groupsLength: {},
      groupsViews: {},
      navigated: false,
      checking: true,
      videos: [],
      contextLeft: [],
      contextRight: [],
      groupIndexLeft: [],
      groupIndexRight: [],
      groupIndexLength: [],
      groupIndexViews: [],
      fullscreen: false,
      subsSearchLimit: 50,
      maxNumOfHitsForSanity: 500,
      showFilter: false,
      regex: undefined,
      regexExclude: undefined,
      reels: false,
      excludeArr: [],
      speed: 1,
      slideIndex: 0,
      sort: "views",
      tvShowFilter: this.tvShow ? [this.tvShow.id] : undefined,
      categoryFilter: undefined,
      NON_PRO_MAX_SUBS_SEARCH_HITS,
    };
  },
  computed: {
    // Determines if we can sort by views without too much of a performance hit
    canSortByViews() {
      if (this.$l2.continua && !["zh"].includes(this.$l2.code)) return false; // continua script without ngram index, so this filters out japanse and thai among other languages
      return true; // It seems like performance is not too bad for most common words in most languages
      // return false; // Stilll figuring out how this can be done without SQL filesort which is too slow
      // return !this.categoryFilter && !this.tvShowFilter;
    },
    hitIndex() {
      let hits = this.hits;
      return hits.findIndex((hit) => hit === this.currentHit);
    },
    hits() {
      let hits = [];
      let groups = this[`groups${ucFirst(this.sort)}`];
      let groupIndex = this[`groupIndex${ucFirst(this.sort)}`];
      for (let index of groupIndex) {
        if (!groups[index]) {
          console.log(
            `this.groups${ucFirst(this.sort)}[${index}] is undefined`
          );
          continue;
        }
        for (let hit of groups[index]) {
          hits.push(hit);
        }
      }
      return hits;
    },
    prevHit() {
      if (this.hitIndex > 0) return this.hits[this.hitIndex - 1];
      else return this.hits[this.hits.length - 1];
    },
    nextHit() {
      if (this.hitIndex < this.hits.length - 1)
        return this.hits[this.hitIndex + 1];
      else return this.hits[0];
    },
    pro() {
      return this.forcePro || this.$store.state.subscriptions.active;
    },
  },
  watch: {
    regex() {
      this.filterHits(this.regex, true);
    },
    regexExclude() {
      console.log("regexExclude", this.regexExclude);
      this.filterHits(this.regexExclude, false);
    },
    currentHit: {
      async handler(newVal, oldVal) {
        // If currentHit is not set, we don't do anything
        if (!newVal) return;
        let unavailable = await YouTube.videoUnavailable(
          this.currentHit?.video?.youtube_id
        );
        if (unavailable) {
          this.onVideoUnavailable(this.currentHit.video.youtube_id);
        }
        this.loadL1SubsIfNeeded();
      },
      deep: false, // Watch only for object reference changes
    },
  },
  async mounted() {
    if (typeof this.$store.state.settings !== "undefined") {
      this.loadSettings();
    }
    this.unsubscribeSettings = this.$store.subscribe((mutation, state) => {
      if (mutation.type === "settings/LOAD_JSON_FROM_LOCAL") {
        this.loadSettings();
      }
    });
    await this.searchSubsAndProcessHits();
  },
  activated() {
    setTimeout(() => {
      if (this.$refs[`youtube-${this.hitIndex}`])
        this.$refs[`youtube-${this.hitIndex}`].pause();
    }, 800);
  },
  beforeDestroy() {
    this.unsubscribeSettings();
  },
  methods: {
    ucFirst,
    highlightMultiple,
    iOS,
    filterHits(pattern, include) {
      if (!this.unfilteredHits) this.unfilteredHits = this.hits;
      if (!pattern) {
        this.collectContext(this.unfilteredHits);
        this.$emit("updated", this.unfilteredHits);
        return;
      }
      let r = pattern.startsWith("!") || pattern.startsWith("！")
      ? `^((?!${pattern.substr(1).replace(/[,，]/gi, "|")}).)*$`
      : pattern;
      let hits = [];
      for (let hit of this.unfilteredHits) {
      try {
        let regex = new RegExp(r, "gim");
        if (include ? regex.test(hit.video.subs_l2[hit.lineIndex].line) : !regex.test(hit.video.subs_l2[hit.lineIndex].line)) {
        hits.push(hit);
        }
      } catch (error) {
        console.error(`Failed to create or test regex: ${error}`);
      }
      }
      this.collectContext(hits);
      this.$emit("updated", hits);
    },
    pauseYouTube() {
      if (this.$refs[`youtube-${this.hitIndex}`])
        this.$refs[`youtube-${this.hitIndex}`].pause();
    },
    async loadL1SubsIfNeeded() {
      let video = this.currentHit?.video;
      if (!video) return;

      // If the video doesn't have L1 subtitles, we load it from YouTube
      if (!(video?.subs_l1?.length > 0)) {
        let subs;

        let { l1Locale, l2Locale, l2Name } = await YouTube.getTranscriptLocales(
          video.youtube_id,
          this.$l1,
          this.$l2
        );

        if (l1Locale) {
          subs = await YouTube.getTranscript(video.youtube_id, l1Locale);
        }

        // If we still don't have it, we get translated ones
        if (!(subs?.length > 0)) {
          subs = await YouTube.getTranslatedTranscript({
            youtube_id: video.youtube_id,
            locale: l2Locale,
            name: l2Name,
            tlangs: this.$l1.locales,
          });
        }
        if (subs && subs.length > 0) Vue.set(video, `subs_l1`, subs);
      }
    },
    async onVideoUnavailable(youtube_id) {
      if (!this.currentHit) return;
      let video = this.currentHit.video;
      if (youtube_id && youtube_id !== video.youtube_id) return; // Always make sure the unavailable video is indeed what the user is looking at
      // Go to next video
      await timeout(2000);
      if (this.currentHit?.video.youtube_id === youtube_id)
        this.removeCurrentHitAndGoToNext();
    },
    loadSettings() {
      this.tvShowFilter = this.tvShow
        ? [this.tvShow.id]
        : this.$l2Settings.tvShowFilter;
      this.categoryFilter = this.$l2Settings.categoryFilter;
    },
    showPlaylistModal() {
      this.$refs["playlist-modal"].show();
    },
    removeCurrentHitAndGoToNext() {
      let hits = [];
      let index = this.hitIndex;
      let id = this.currentHit.video.id;
      for (let hit of this.hits) {
        if (hit !== this.currentHit && hit.video.id !== id) {
          hits.push(hit);
        }
      }
      this.collectContext(hits);
      this.$emit("updated", hits);
      this.goToHitIndex(index);
    },
    calculateLimit() {
      // No limit unless set
      if (this.$store.state.settings.subsSearchLimit) {
        return this.subsSearchLimit;
      } else {
        return this.maxNumOfHitsForSanity;
      }
    },
    async searchSubsAndProcessHits() {
      this.checking = true;
      let terms = this.terms;
      let mustIncludeYouTubeId = this.context?.youtube_id;
      let limit = this.calculateLimit();
      let options = {
        terms,
        excludeTerms: this.excludeTerms,
        l2Obj: this.$l2,
        adminMode: false,
        continua: this.$l2.continua,
        sort: this.canSortByViews ? "-views" : undefined,
        limit,
        tvShowFilter: this.tvShowFilter,
        categoryFilter: this.categoryFilter,
        exact: this.exact,
        apostrophe: true,
        mustIncludeYouTubeId,
      };

      let hits = await this.$subs.searchSubs(options);
      hits = this.updateSaved(hits);
      hits = this.setShows(hits);
      this.collectContext(hits);
      this.$emit("loaded", hits);
      this.checking = false;
    },
    setShows(hits) {
      for (let hit of hits) {
        let show, showType;
        if (hit.video) {
          if (hit.video.tv_show) {
            show = this.$store.getters["shows/tvShow"]({
              id: Number(hit.video.tv_show),
              l2: this.$l2,
            });
            showType = "tv_show";
          } else if (hit.video.talk) {
            show = this.$store.getters["shows/talk"]({
              id: hit.video.talk,
              l2: this.$l2,
            });
            showType = "talk";
          }
          hit.show = show;
          hit.showType = showType;
        }
      }
      return hits;
    },
    get(name) {
      return this[name];
    },
    // Helper function to update hit contexts
    updateHitContexts(hit, termsRegex) {
      // Helper function to get the context of a hit
      const getContext = (line1 = "", line2 = "", regex, direction) => {

        if (direction === 'left') {
          let replacedLine2 = line2;
          let match = line2.match(regex);
          if (match) {
            let index = replacedLine2.indexOf(match[0]);
            replacedLine2 = replacedLine2.substring(0, index);
          }

          return (line1.trim() + replacedLine2).trim();
        } else if (direction === 'right') {
          let replacedLine1 = line1;
          let match = line1.match(regex);
          if (match) {
            let index = replacedLine1.indexOf(match[0]);
            replacedLine1 = replacedLine1.substring(index + match[0].length);
          }

          return (replacedLine1 + line2.trim()).trim();
        }
        throw new Error(`Invalid direction: ${direction}`);
      };

      // Get the previous and next lines from the video subtitles
      let prev = hit.video.subs_l2[hit.lineIndex - 1];
      let next = hit.video.subs_l2[Number(hit.lineIndex) + 1];

      // Create a regex from the terms to match
      let regex = new RegExp(
        `(${termsRegex.join("|").replace(/[*]/g, ".+").replace(/[_]/g, ".")})`,
        "gim"
      );

      // If the hit doesn't have a left context, calculate it
      if (!hit.leftContext) {
        hit.leftContext = getContext(prev ? prev.line : "", hit.line, regex, 'left')
          .split("")
          .reverse()
          .join("")
          .trim();
      }

      // If the hit doesn't have a right context, calculate it
      if (!hit.rightContext) {
        hit.rightContext = getContext(hit.line, next ? next.line : "", regex, 'right').trim();
      }
    },
    collectContext(hits) {
      let contextLeft = [];
      let contextRight = [];
      // First run updateHitContexts over all hits, and collect the left and right contexts
      for (let hit of hits) {
        // Get the previous and next lines from the video subtitles
        let prev = hit.lineIndex > 0 ? hit.video.subs_l2[hit.lineIndex - 1] : null;
        let next = hit.lineIndex < hit.video.subs_l2.length - 1 ? hit.video.subs_l2[Number(hit.lineIndex) + 1] : null;

        // Print the previous line, current line, and next line joined together
        // console.log('Joined lines:', [prev ? prev.line : '', hit.line, next ? next.line : ''].join(' '));

        this.updateHitContexts(hit, this.terms);

        // Print the left and right context
        // console.log('Left context:', hit.leftContext);
        // console.log('Right context:', hit.rightContext);

        contextLeft.push(hit.leftContext);
        contextRight.push(hit.rightContext);
      }
      this.contextLeft = unique(contextLeft).sort((a, b) =>
        a.localeCompare(b, this.$l2.locales[0])
      );
      this.contextRight = unique(contextRight).sort((a, b) =>
        a.localeCompare(b, this.$l2.locales[0])
      );
      this.groupsLeft = this.groupContext(this.contextLeft, hits, "left");
      this.groupsRight = this.groupContext(this.contextRight, hits, "right");
      this.groupsLength = this.groupByLength(hits);
      this.groupsViews = this.groupByViews(hits);
      this.groupIndexLeft = this.sortGroupIndex(this.groupsLeft);
      this.groupIndexRight = this.sortGroupIndex(this.groupsRight);
      this.groupIndexLength = this.sortGroupIndex(this.groupsLength, false);
      this.groupIndexViews = this.sortGroupIndex(this.groupsViews, false);
      this.Length = this.sortGroupIndex(this.groupsRight);
      this.currentHit = this.hits[0];
    },
    /**
     * Matched hits are hits from the video context the word is saved from.
     */
    getSavedAndMatchedHits(hits) {
      let savedHits = [];
      let matchedHits = [];
      let remainingHits = hits.filter((hit) => {
        let pass = true;
        if (hit.saved) {
          savedHits.push(hit);
          pass = false;
        }
        if (
          this.context?.youtube_id &&
          hit.video.youtube_id === this.context.youtube_id
        ) {
          matchedHits.push(hit);
          pass = false;
        }
        return pass;
      });
      return { savedHits, matchedHits, remainingHits: remainingHits.slice(0, this.calculateLimit()) };
    },
    groupByLength(hits) {
      let hitGroups = {};
      let { savedHits, matchedHits, remainingHits } =
        this.getSavedAndMatchedHits(hits);
      let lengths = hits.map(
        (hit) => hit.video.subs_l2[hit.lineIndex].line.length
      );
      lengths = unique(lengths);
      for (let length of lengths) {
        if (!hitGroups[length]) hitGroups[length] = {};
        hitGroups[length] = remainingHits.filter(
          (hit) => hit.video.subs_l2[hit.lineIndex].line.length === length
        );
      }
      hitGroups = Object.assign(
        { zthSaved: savedHits, contextMatched: matchedHits },
        hitGroups
      );
      for (let key in hitGroups) {
        hitGroups[key] = hitGroups[key].sort(
          (a, b) => a.leftContext.length - b.leftContext.length
        );
      }
      return hitGroups;
    },
    groupByViews(hits) {
      let hitGroups = {};
      let { savedHits, matchedHits, remainingHits } =
        this.getSavedAndMatchedHits(hits);
      // Only one group
      hitGroups = {
        zthSaved: savedHits,
        contextMatched: matchedHits,
        views: remainingHits.sort((a, b) => b.video.views - a.video.views),
      };
      return hitGroups;
    },
    groupContext(context, hits, leftOrRight) {
      let hitGroups = {};
      let { savedHits, matchedHits, remainingHits } =
        this.getSavedAndMatchedHits(hits);

      for (let c of context.map((s) => s.charAt(0))) {
        if (!hitGroups[c.charAt(0)]) hitGroups[c.charAt(0)] = {};
        hitGroups[c.charAt(0)] = remainingHits.filter((hit) =>
          c.length > 0
            ? hit[`${leftOrRight}Context`].startsWith(c)
            : hit[`${leftOrRight}Context`] === ""
        );
      }

      hitGroups = Object.assign(
        { zthSaved: savedHits, contextMatched: matchedHits },
        hitGroups
      );

      for (let key in hitGroups) {
        hitGroups[key] = hitGroups[key].sort((a, b) =>
          a.leftContext.localeCompare(
            b[`${leftOrRight}Context`],
            this.$l2.locales[0]
          )
        );
      }

      return hitGroups;
    },
    sortGroupIndex(group, sort = true) {
      let index = [];
      for (let c in group) {
        index.push({ c, length: group[c].length });
      }
      if (sort) index = index.sort((a, b) => b.length - a.length);
      index = index.map((i) => i.c);
      index.splice(index.indexOf("zthSaved"), 1);
      index.splice(index.indexOf("contextMatched"), 1);
      return ["contextMatched", "zthSaved"].concat(index);
    },
    updateSaved(hits) {
      for (let hit of hits) {
        hit.saved = this.$store.getters["savedHits/has"]({
          l2: this.$l2.code,
          hit,
          terms: this.terms,
        });
      }
      return hits;
    },
    goToPrevHit() {
      this.currentHit = this.prevHit;
      this.navigated = true;
    },
    goToNextHit() {
      this.currentHit = this.nextHit;
      this.navigated = true;
    },
    goToHit(hit) {
      this.currentHit = hit;
      this.navigated = true;
      this.$refs["playlist-modal"].hide();
      setTimeout(() => {
        document.activeElement.blur();
      }, 100);
    },
    goToHitIndex(index) {
      index = Math.min(index, this.hits.length - 1);
      index = Math.max(index, 0);
      this.currentHit = this.hits[index];
      this.navigated = true;
    },

    saveHit(hit) {
      this.$store.dispatch("savedHits/add", {
        terms: this.terms,
        hit: hit,
        l2: this.$l2.code,
      });
      hit.saved = true;
      this.collectContext(this.hits);
      if (this.currentHit === hit) this.$emit("goToNextHit");
    },
    removeSavedHit(hit) {
      this.$store.dispatch("savedHits/remove", {
        terms: this.terms,
        hit: hit,
        l2: this.$l2.code,
      });
      hit.saved = false;
      this.collectContext(this.hits);
      if (this.currentHit === hit) this.$emit("goToNextHit");
    },
  },
};
</script>
<style lang="scss" scoped>
@import "../assets/scss/variables.scss";
.search-subs {
  max-width: calc(100vh - 5rem);
  margin: 0 auto;
  .search-subs-hit-index {
    margin-bottom: -0.52rem;
    overflow: hidden;
  }

  .btn {
    margin: 0;
  }

  .btn:disabled {
    opacity: 0.2;
  }

  .video-area {
    background: black;
  }

  &.fullscreen {
    position: fixed;
    left: 0;
    top: 0;
    width: 100vw;
    max-width: 100vw;
    height: 100vh;
    z-index: 99;
  }

  &.search-subs-light.fullscreen {
    background: white;
  }

  &.search-subs-dark {
    &.fullscreen {
      background: black;
    }

    .search-subs-hit-index {
      color: rgba(255, 255, 255, 0.877);
    }
  }
  :deep(.video-transcript-column) {
    min-height: 5rem; // Make sure the black space around the subs don't shift too much between lines
  }
}

.btn.active {
  color: $primary-color;
}

.show-pinyin .reels {
  :deep(.annotated) {
    line-height: 1;
  }
}

:deep(.synced-transcript-single-line) .transcript-line-both {
  min-height: 5rem;
}

.reels {
  :deep(.video-controls) {
    display: none !important;
  }

  :deep(.video-transcript-column) {
    margin-top: 0.5rem;
  }

  :deep(.quick-gloss) {
    display: none;
  }

  :deep(.add-pinyin) .word-block.saved {
    text-align: center;
  }

  :deep(.video-with-transcript) {
    width: calc(1080px / 2);
    height: calc(1920px / 2);
    background: #010101;
    margin-left: calc((100vw - 1080px / 2) / 2);
    position: relative;
  }

  :deep(.youtube) {
    width: calc(1080px / 2 * 1.77);
    height: calc(855px / 2);
    margin-left: calc(1080px / 2 * -0.77 / 2);
  }

  :deep(.synced-transcript-single-line) .transcript-line-both {
    padding-top: 0;
    font-size: 1.7em;
    font-weight: bold;
    padding-left: 1.5rem;
    padding-right: 5.75rem;
    .transcript-line-l1 {
      font-weight: normal;
      opacity: 1;
      line-height: 1.25;
    }

    .transcript-line-l2 {
      padding-left: 0;
    }
    .transcript-line-l2-rtl {
      padding-right: 0;
    }
  }

  :deep(.annotator-buttons) {
    position: absolute;
    right: -3rem;
    padding: 0;
  }

  .video-title {
    position: absolute;
    z-index: 1;
    width: calc(540px - 9rem);
    bottom: 50rem;
    margin-left: calc((100vw - 540px) / 2 + 2.5rem);
    text-align: center;
    background: #000000cc;
    color: white;
    padding: 0.5rem;
    font-size: 0.8rem;
    border-radius: 0.25rem;
    backdrop-filter: blur(10px);
  }

  .small-star {
    position: relative;
    bottom: -0.07em;
  }

  .num-saved {
    background: none;
    position: relative;
    bottom: -0.07em;
    opacity: 0.7;
  }
}
</style>
