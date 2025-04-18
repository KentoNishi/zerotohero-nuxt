<template>
  <div>
    <div class="container pb-5 lesson-videos">
      <SocialHead
        v-if="lessonVideos[0]"
        :title="`HSK Lesson Expansion Videos | Language Player`"
        :description="`After finishing Lesson ${lesson} of the Chinse Zero to Hero HSK ${level} Course, reinforce the vocabulary you have learned in the lesson by watching these ${lessonVideos.length} videos:`"
        :image="`https://img.youtube.com/vi/${lessonVideos[0].youtube_id}/hqdefault.jpg`"
      />
      <client-only>
        <div class="row">
          <div class="col-md-12 text-center">
            <h3 class="mt-5">Expansion Videos</h3>
            <div class="mt-3" v-if="levels[level]">
              <b-dropdown
                id="dropdown-1"
                :text="levels[level].exam.name + ' ' + levels[level].level"
                class="ml-1"
              >
                <b-dropdown-item
                  v-for="(level, slug) in levels"
                  :key="`level-item-${slug}`"
                  @click="changeLevel(slug)"
                >
                  {{ level.exam.name }} {{ level.level }}
                </b-dropdown-item>
              </b-dropdown>
              <b-dropdown
                id="dropdown-1"
                :text="`Lesson ${lesson}`"
                class="ml-1"
              >
                <b-dropdown-item
                  v-for="(lesson, index) in levelLessons[level]"
                  @click="changeLesson(lesson)"
                  :key="`lesson-item-${index}`"
                >
                  Lesson {{ lesson }}
                </b-dropdown-item>
              </b-dropdown>
            </div>
            <p class="mt-3 mb-5" style="max-width: 35rem; margin: 0 auto">
              After finishing Lesson {{ lesson }} of the
              <a
                :href="`https://courses.chinesezerotohero.com/p/hsk-${level}-course`"
                class="link-unstyled text-primary"
                target="_blank"
              >
                <b>Chinese Zero to Hero HSK {{ level }} Course</b>
              </a>
              , reinforce the vocabulary you have learned in the lesson by
              watching these
              {{ lessonVideos.length }} videos:
            </p>
          </div>
        </div>
        <div v-if="loading" class="text-center">
          <Loader :sticky="true" />
        </div>
        <div
          class="row mb-4"
          v-for="(video, videoIndex) in lessonVideos"
          :key="`lesson-video-${videoIndex}`"
        >
          <div class="col-md-6">
            <LazyYouTubeVideoList
              :checkSubs="false"
              :lesson="true"
              :updateVideos="updateLessonVideos"
              :videos="[video]"
              :singleColumn="true"
              :showProgress="true"
            />
          </div>
          <div class="col-md-6">
            <h5>Vocabulary covered</h5>
            <Loader
              message="Loading words...<br/>Don't wait. View the video now."
            />

            <WordList
              :words="video.matches"
              :key="`matched-words-${videoIndex}-${matchedWordsKey}`"
              ref="wordList"
            ></WordList>
            <button
              v-if="video.matches && video.matches.length > 0"
              class="btn btn-sm mr-1 bg-warning text-white mt-2"
              @click="saveAllWordsInList(videoIndex)"
            >
              <i class="far fa-star mr-1"></i>
              {{ $t("Save All") }}
            </button>
            <div style="color: #666" class="mt-2" >{{ $t('Save all the above words so they will be highlighted in the video.') }}</div>
          </div>
        </div>

        <div class="row mt-5 mb-5">
          <div class="col-lg-2"></div>
          <div class="col-md-12 col-lg-8">
            <div class="pt-4 pb-4" v-if="unmatchedWords.length > 0">
              <h4 class="mt-3 mb-4 text-center text-danger">
                Lesson words
                <em>not</em>
                covered in the videos
              </h4>
              <Loader message="Loading words..." />

              <WordList
                :words="unmatchedWords"
                :key="`unmatched-words-${matchedWordsKey}`"
              ></WordList>
            </div>
            <div class="col-sm-12 text-center">
              <router-link
                v-if="lesson > 1"
                :class="`btn btn-${
                  skin === 'light' ? 'gray' : 'ghost-dark'
                } mr-2`"
                :to="`/${$l1.code}/${$l2.code}/lesson-videos/${level}/${
                  Number(lesson) - 1
                }`"
              >
                Previous Lesson
              </router-link>
              <router-link
                v-if="lesson < levelLessons[level]"
                :class="`btn btn-${skin === 'light' ? 'gray' : 'ghost-dark'}`"
                :to="`/${$l1.code}/${$l2.code}/lesson-videos/${level}/${
                  Number(lesson) + 1
                }`"
              >
                Next Lesson
              </router-link>
            </div>
          </div>
        </div>
      </client-only>
    </div>
    <EntryCourseAd
      v-if="words[0]"
      :entry="words[0]"
      class="focus-exclude"
      :key="`${words[0].id}-course-ad`"
      style="margin-top: 10rem"
    ></EntryCourseAd>
  </div>
</template>

<script>
import { languageLevels, uniqueByValue } from "../../../../lib/utils";

export default {
  data() {
    return {
      loading: true,
      words: [],
      matchedWords: [],
      lessonVideos: [],
      videos: [],
      levelLessons: {
        1: 15,
        2: 15,
        3: 20,
        4: 20,
        5: 36,
        6: 40,
      },
      updateLessonVideos: 0,
      updateVideos: 0,
      matchedWordsKey: 0,
      skin: "dark",
    };
  },
  computed: {
    level() {
      return this.$route.params.level || 1;
    },
    lesson() {
      return this.$route.params.lesson || 1;
    },
    levels() {
      return languageLevels(this.$l2);
    },
    unmatchedWords() {
      return this.words.filter((word) => {
        let noMatch = true;
        for (let video of this.lessonVideos) {
          if (video.matches && video.matches.includes(word)) noMatch = false;
        }
        return noMatch;
      });
    },
  },
  async created() {
    this.lessonVideos = [];
    let response = await this.$directus.get(
      `${this.$directus.youtubeVideosTableName(this.$l2.id)}?filter[l2][eq]=${
        this.$l2.id
      }&filter[level][eq]=${this.level}&filter[lesson][eq]=${this.lesson}`
    );
    let videos = response.data.data || [];
    if (videos.length > 0) {
      videos = videos.map((video) => {
        video.subs_l2 = this.$subs.parseSavedSubs(video.subs_l2);
        return video;
      });
    }
    this.loading = false;
    this.lessonVideos = uniqueByValue(videos, "youtube_id");
    let dictionary = await this.$getDictionary();
    if (dictionary) {
      let words = await dictionary.lookupByLesson(this.level, this.lesson);
      words = words.filter((word) => !word.oofc || !word.oofc === "");
      if (this.$l2.han && this.$l2.code !== "ja") {
        this.words = uniqueByValue(words, "simplified");
      } else {
        this.words = uniqueByValue(words, "head");
      }
      this.updateMatches();
    }
  },
  methods: {
    saveAllWordsInList(videoIndex) {
      let wordList = this.$refs.wordList[videoIndex];
      if (wordList) {
        let buttons = wordList.$el.querySelectorAll(".not-saved");
        buttons.forEach((b) => b.click());
      }
    },
    changeLevel(level) {
      this.$router.push({
        path: `/${this.$l1.code}/${this.$l2.code}/lesson-videos/${level}/1`,
      });
    },
    changeLesson(lesson) {
      this.$router.push({
        path: `/${this.$l1.code}/${this.$l2.code}/lesson-videos/${
          this.level || 1
        }/${lesson}`,
      });
    },
    updateMatches() {
      for (let video of this.lessonVideos) {
        video.matches = this.matchWords(video);
      }
      this.lessonVideos = this.lessonVideos.sort(
        (a, b) => a.text.length - b.text.length
      );
      this.matchedWordsKey++;
    },
    matchWords(video) {
      let matches = [];
      if (video.subs_l2) {
        video.text = video.subs_l2.map((line) => line.line).join("\n");
        if (this.words && this.words.length > 0) {
          for (let word of this.words) {
            if (
              video.text.includes(word.simplified) ||
              video.text.includes(word.traditional) ||
              video.text.includes(word.head)
            ) {
              matches.push(word);
            }
          }
        }
      }
      return matches;
    },
  },
};
</script>

<style lang="scss" scoped>
.youtube-video {
  max-width: 100%;
}
.zerotohero-wide {
  .lesson-videos {
    padding-left: 2rem;
    padding-right: 2rem;
  }
}
@media (max-width: 576px) {
  .lesson-videos {
    max-width: 423px;
    margin: 0 auto;
  }
}
</style>../../../../lib/utils