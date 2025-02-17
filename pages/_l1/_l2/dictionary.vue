<template>
  <container-query :query="query" v-model="params">
    <div
      :class="{
        'dictionary focus': true,
        'dictionary-wide': wide,
      }"
      :key="`entry-${entryKey}`"
    >
      <SocialHead :title="title" :description="description" :image="image" />
      <client-only>
        <div :class="{ 'dictionary-search-bar': args }">
          <div :class="{ 'container pt-2': !wide }">
            <div :class="{ row: !wide }">
              <div :class="{ 'col-sm-12': !wide }">
                <div
                  style="font-size: 1.5rem; color: white; text-align: center"
                  v-if="!args"
                >
                  <img
                    src="/img/logo-play-circle-light.png"
                    style="height: 4rem; margin-bottom: 1rem; margin-top: 3rem"
                    data-not-lazy
                  />
                </div>
                <h5 class="text-center pb-4" v-if="!args">
                  {{
                    $t("Language Player {l2} Dictionary", { l2: $t($l2.name) })
                  }}
                </h5>
                <SearchCompare
                  :searchEntry="entry"
                  :random="`/${$l1.code}/${$l2.code}/dictionary/${$store.state.settings.dictionaryName}/random`"
                  ref="searchCompare"
                  :key="`search-${args}`"
                  id="search-compare-bar"
                />
              </div>
            </div>
          </div>
        </div>
        <div>
          <div class="container" v-if="!entry">
            <div class="row">
              <div class="col-sm-12">
                <div style="max-width: 50rem; margin: 0 auto" class="mt-5">
                  <ul class="list-unstyled">
                    <li class="mt-2">
                      🔍
                      <span
                        v-html="
                          $t(
                            'You can do power search for patterns with <b>wild cards</b>'
                          )
                        "
                      />
                      🃏
                    </li>
                    <li class="mt-2">
                      ☝️
                      <span
                        v-html="
                          $t(
                            'Use <code>_</code> underscore to match one character'
                          )
                        "
                      />
                    </li>
                    <li class="mt-2">
                      ☝️
                      <span
                        v-html="
                          $t(
                            'Use <code>*</code> asterisk to match one or more characters'
                          )
                        "
                      />
                    </li>
                    <li class="mt-2" v-if="dictionarySize">
                      📖
                      <span
                        v-html="
                          $t('This {l2} dictionary has <b>{num} words</b>', {
                            l2: $t($l2.name),
                            num: dictionarySize,
                          })
                        "
                      />
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </client-only>
      <div :class="{ 'focus-exclude dictionary-main': true, container: !wide }">
        <div :class="{ row: !wide, 'content-panes': wide }" v-if="entry">
          <div :class="{ 'content-pane-left': wide, 'col-sm-12 mt-3': !wide }">
            <client-only>
              <div class="text-center mb-3">
                <Star :word="entry" class="ml-1 mr-1" />
                <Paginator
                  class="d-inline-block ml-1 mr-1"
                  v-if="saved() && sW.length > 0"
                  :items="sW"
                  :home="{ name: 'l1-l2-saved-words' }"
                  :findCurrent="(item) => item.id === entry.id"
                  :url="
                    (item) =>
                      `/${$l1.code}/${$l2.code}/dictionary/${$dictionaryName}/${item.id}`
                  "
                />
              </div>
            </client-only>
            <div v-if="entry" class="text-center">
              <div class="text-center mb-4" v-if="words && words.length > 1">
                <b-dropdown
                  size="sm"
                  variant="primary"
                  :items="words"
                  :text="$t('Disambiguation')"
                  menu-class="disambiguation-dropdown"
                >
                  <b-dropdown-item
                    v-for="(w, index) in words"
                    :key="`phrase-word-disambiguation-${w.id}-${index}`"
                    @click="
                      $router.push(
                        `/${$l1.code}/${$l2.code}/dictionary/${$dictionaryName}/${w.id}`
                      )
                    "
                  >
                    <b class="text-success">{{ w.head }}</b>
                    <span v-if="w.pronunciation || w.kana">({{ w.pronunciation || w.kana }})</span>
                    <em>{{ w.definitions[0] }}</em>
                  </b-dropdown-item>
                </b-dropdown>
              </div>
              <Flashcard :active="entry.saved">
                <template v-slot:front>
                  <div>
                    <LazyEntryHeader :entry="entry" :hidePhonetics="true" />
                    <DefinitionsList
                      v-if="entry.definitions"
                      :entry="entry"
                      :key="`def-list-${entry.id}`"
                      :definitions="entry.definitions"
                      :translated="$store.state.settings.useMachineTranslatedDictionary"
                      :class="{
                        'pl-3 pr-3 mt-3': true,
                        transparent: true,
                      }"
                    ></DefinitionsList>
                    <Frequency 
                      v-if="entry.frequency"
                      :entry="entry" 
                      :showText="true"
                      class="mt-2 transparent"
                    />
                    <WordContext
                      v-if="entry?.saved?.context"
                      :word="entry"
                      :key="`word-context-${entry.id}`"
                      class="mb-2 transparent"
                    />
                  </div>
                </template>
                <template v-slot:back>
                  <div>
                    <LazyEntryHeader :entry="entry" />
                    <DefinitionsList
                      v-if="entry.definitions"
                      :entry="entry"
                      :key="`def-list-${entry.id}`"
                      :definitions="entry.definitions"
                      :translated="$store.state.settings.useMachineTranslatedDictionary"
                      :class="{
                        'pl-3 pr-3 mt-3': true,
                      }"
                    ></DefinitionsList>
                    <Frequency 
                      v-if="entry.frequency"
                      :entry="entry"
                      :showText="true"
                      class="mt-2"
                    />
                    <WordContext
                      v-if="entry?.saved?.context"
                      :word="entry"
                      :key="`word-context-${entry.id}`"
                      class="mb-2"
                    />
                  </div>
                </template>
              </Flashcard>
              <EntryCourseAd
                v-if="$l2.code === 'zh' && wide"
                variant="compact"
                class="focus-exclude mt-4 mb-5"
                :entry="entry"
              ></EntryCourseAd>
            </div>
          </div>

          <div
            :class="{
              'col-sm-12': !wide,
              'content-pane-right pl-3 pr-3': wide,
            }"
            style="position: relative; overflow: hidden"
          >
            <LazyDictionaryEntry
              v-if="entry"
              :entry="entry"
              :images="images"
              ref="dictionaryEntry"
              :key="`dictionary-entry-${entry.id}`"
            />
            <LookUpIn
              :term="entry.head"
              :traditional="entry.traditional"
              :level="entry.level"
              :sticky="false"
              class="mb-4 text-center"
              style="margin-bottom: 0"
            />
            <!-- <Sale class="mb-5" style="border-radius: 1rem !important" v-if="$l2.code === 'zh'" /> -->
            <EntryCourseAd
              v-if="$l2.code === 'zh'"
              :entry="entry"
              class="focus-exclude mb-2"
              style="margin-top: 10rem"
              :key="`${entry.id}-course-ad`"
            />
          </div>
        </div>
      </div>
    </div>
  </container-query>
</template>

<script>
import WordPhotos from "../../../lib/word-photos";
import { ContainerQuery } from "vue-container-query";

export default {
  components: {
    ContainerQuery,
  },
  props: {
    method: {
      type: String,
    },
    args: {
      type: String,
    },
  },
  data() {
    return {
      entry: undefined,
      words: undefined,
      hideDefinitions: false,
      hidePhonetics: false,
      hideWord: false,
      images: [],
      entryKey: 0,
      paginatorKey: 0,
      sW: [],
      dictionarySize: undefined,
      keysBound: false,
      params: {},
      query: {
        wide: {
          minWidth: 768,
        },
      },
    };
  },
  computed: {
    showAsFlashCard() {
      return this.saved();
    },
    title() {
      if (this.entry) {
        return `${this.entry.head} ${
          this.entry.pronunciation ? "(" + this.entry.pronunciation + ")" : ""
        } ${
          this.entry.definitions
            ? this.entry.definitions.slice(0, 2).join("; ")
            : ""
        } | Language Player ${this.$l2 ? this.$l2.name : ""} Dictionary`;
      }
      return `${this.$l2 ? this.$l2.name : ""} Dictionary | Language Player`;
    },
    description() {
      if (this.entry) {
        return `"${this.entry.head}" means ${
          this.entry.definitions ? this.entry.definitions.join("; ") : "..."
        } Watch examples of this from TV shows.`;
      }
      return `Look up ${this.$l2 ? this.$l2.name : ""} words. See how ${
        this.$l2 ? this.$l2.name : ""
      } words are used in TV shows, how they form collocations, and avoid common mistakes.`;
    },
    image() {
      if (this.images.length > 0) {
        return this.images[0].src;
      } else {
        return "/img/zth-share-image.jpg";
      }
    },
    wide() {
      return this.params.wide && ["lg", "xl", "xxl"].includes(this.$mq);
    },
  },
  watch: {
    "$route.params.args"() {
      if (
        this.$route.name === "dictionary" &&
        this.$route.params.args === "random"
      ) {
        this.random();
      }
    },
  },
  async mounted() {
    // Begin tasks previously run on server
    this.loadEntry();
    this.dictionarySize = await this.getDictionarySize();
    // End tasks previously run on server
    if (
      this.$route.name === "l1-l2-dictionary" &&
      this.$route.params.args === "random"
    ) {
      this.random();
    }
    if (this.sW.length === 0) this.updateWords();
    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      if (mutation.type === "savedWords/REMOVE_SAVED_WORD") {
        if (mutation.payload.word.id === this.entry.id) {
          let currentIndex = this.sW.findIndex(
            (item) => item.id === this.entry.id
          );
          let nextSavedWord =
            this.sW[currentIndex + 1] || this.sW[currentIndex - 1];
          if (nextSavedWord) {
            this.$router.push({
              name: `l1-l2-dictionary`,
              params: { method: this.method, args: nextSavedWord.id },
            });
          } else if (this.sW.length > 0) {
            this.$router.push({
              name: `l1-l2-dictionary`,
              params: { method: this.method, args: this.sW[0].id },
            });
          }
        }
      } else if (mutation.type.startsWith("savedWords")) {
        this.updateWords();
      }
    });
  },
  beforeDestroy() {
    if (this.unsubscribe) this.unsubscribe();
  },
  methods: {
    async getDictionarySize() {
      let dictionary = await this.$getDictionary();
      if (dictionary) {
        let size = await dictionary.getSize();
        return size;
      }
    },
    async loadEntry() {
      let method = this.$route.params.method;
      let args = this.$route.params.args;
      const dictionary = await this.$getDictionary();
      if (method && args) {
        if (method === this.$store.state.settings.dictionaryName) {
          if (args !== "random") {
            const id = args
            if (dictionary) {
              const entry = await dictionary.get(id);
              this.entry = entry;
              if (process.server) {
                this.images = await WordPhotos.getGoogleImages({
                  term: this.entry.head,
                  lang: this.$l2.code,
                });
              }
            }
          }
        } else if (method === "hsk") {
          this.entry = await dictionary.getByHSKId(args);
        }
      }
      if (this.entry) {
        this.words = await dictionary.lookupMultiple(this.entry.head, true);
      }
    },
    async updateWords() {
      let sW = [];
      if (
        this.entry &&
        this.$store.state.savedWords.savedWords &&
        this.$store.state.savedWords.savedWords[this.$l2.code]
      ) {
        let savedWords = this.$store.state.savedWords.savedWords[this.$l2.code];
        let currentSavedWord = savedWords.find((w) => w.id === this.entry.id);
        if (currentSavedWord) {
          const dictionary = await this.$getDictionary();
          for (let savedWord of savedWords) {
            let word = await dictionary.get(savedWord.id);
            if (word) {
              sW.push(word);
            }
          }
        }
      }
      this.sW = sW;
    },
    dateStr(date) {
      return date ? new Date(Number(date)).toISOString().replace(/T.*/, "") : 0;
    },
    saved() {
      return (
        this.entry &&
        this.entry.head &&
        this.$store.getters["savedWords/has"]({
          id: this.entry.id,
          l2: this.$l2.code,
        })
      );
    },
    async random() {
      const dictionary = await this.$getDictionary();
      let randomEntry = await dictionary.random();
      if (randomEntry) {
        let randomId = randomEntry.id;
        this.$router.replace({
          path: `/${this.$l1.code}/${this.$l2.code}/dictionary/${this.$store.state.settings.dictionaryName}/${randomId}`,
        });
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.dictionary {
  min-height: 100vh;
}

.zerotohero-wide-collapsed .dictionary-wide .dictionary-search-bar {
  left: 9rem;
  width: calc(100vw - 9rem);
}

.dictionary-main {
  min-height: calc(100vh - 40rem);
}

.dictionary-wide {
  .dictionary-search-bar {
    padding: 1rem;
    top: 0;
    left: 13rem;
    width: calc(100vw - 13rem);
    z-index: 9;
  }

  .content-pane-left {
    overflow-y: auto;
    padding: 1rem;
    padding-top: 3rem;

    :deep(.entry-word) {
      font-size: 2rem;
    }

    :deep(.entry-cjk) {
      font-size: 1.2rem;
    }

    :deep(.definitions-many) {
      columns: 1;
      margin-top: 1rem;
    }

    :deep(.disambiguation-dropdown) {
      overflow: hidden;
    }
  }

  .content-pane-right {
    padding: 1rem;
  }
}

:deep(.disambiguation-dropdown) {
  margin-left: -3.5rem;
  width: 15rem;

  .dropdown-item {
    white-space: normal;
    padding: 0.2rem 1rem;
  }
}
</style>
