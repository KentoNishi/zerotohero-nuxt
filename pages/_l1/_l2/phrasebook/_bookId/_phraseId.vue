<template>
  <container-query :query="query" v-model="params">
    <div>
      <SocialHead :title="title" :description="description" />
      <div :class="{ container: !wide }">
        <div :class="{ row: !wide, 'content-panes': wide }">
          <div
            :class="{
              'p-4 content-pane-left': wide,
              'col-sm-12': !wide,
            }"
            v-if="phrasebook && phrasebook.phrases && phraseId && phraseObj"
          >
            <div class="text-center mb-3">
              <router-link class="link-unstyled mb-4 d-block" :to="homeRoute">
                <h5 class="phrasebook-title">
                  <i class="fa fa-chevron-left mr-2"></i>
                  {{ $t(phrasebook.title, { l2: $t(this.$l2.name) }) }}
                </h5>
              </router-link>
              <Star v-if="word" :word="word" class="ml-1 mr-1" />
              <Saved
                v-else
                :item="phraseItem"
                :saveText="$t('Save Phrase')"
                :removeText="$t('Saved')"
                store="savedPhrases"
                icon="bookmark"
                class="mr-2"
              />
              <Paginator
                class="d-inline-block"
                ref="paginator"
                :items="phrasebook.phrases"
                :findCurrent="findCurrent"
                :url="url"
                :home="homeRoute"
              />
            </div>
            <div>
              <div v-if="!word">
                <Flashcard>
                  <template v-slot:front>
                    <div>
                      <div class="text-center phrase-pronunciation transparent">
                        <span class="mr-1">
                          {{ phraseObj.pronunciation }}
                        </span>
                        <Speak :text="phraseObj.phrase" />
                      </div>
                      <TokenizedText
                        :phonetics="!phraseObj.pronunciation"
                        tag="h1"
                        :class="{
                          'text-center mb-0 hide-phonetics text-success': true,
                        }"
                        :text="phraseObj.phrase"
                      />

                      <div
                        :class="{
                          'text-center mt-1': true,
                          transparent: true,
                        }"
                      >
                        {{ phraseObj[$l1.code] || phraseObj.en }}
                      </div>
                    </div>
                  </template>
                  <template v-slot:back>
                    <div>
                      <div class="text-center phrase-pronunciation">
                        <span class="mr-1">
                          {{ phraseObj.pronunciation }}
                        </span>
                        <Speak
                          :text="phraseObj.phrase"
                          class="phrase-pronunciation"
                        />
                      </div>
                      <h6>
                        <TokenizedText
                          @textChanged="textChanged"
                          :phonetics="!phraseObj.pronunciation"
                          :text="phraseObj.phrase"
                          :class="{
                            'text-center mb-0 hide-phonetics text-success': true,
                          }"
                        />
                      </h6>
                      <div
                        :class="{
                          'text-center mt-1': true,
                        }"
                        :contenteditable="$adminMode"
                        @blur="saveTranslation"
                      >
                        {{ phraseObj[$l1.code] || phraseObj.en }}
                      </div>
                      <div class="text-center mb-3" v-if="$adminMode">
                        <b-button
                          variant="unstyled"
                          size="md"
                          class="remove-btn"
                          @click="remove"
                        >
                          <i class="fa fa-trash ml-1"></i>
                        </b-button>
                      </div>
                    </div>
                  </template>
                </Flashcard>
              </div>
              <div class="text-center mb-3" v-if="words && words.length > 1">
                <b-dropdown
                  size="sm"
                  :items="words"
                  :text="$t('Disambiguation')"
                  menu-class="disambiguation-dropdown"
                  variant="primary"
                >
                  <b-dropdown-item
                    v-for="w in words"
                    :key="`phrase-word-disambiguation-${w.id}`"
                    @click="changeWordTo(w)"
                  >
                    <b>{{ w.head }}</b>
                    <b v-if="w.pronunciation || w.kana">
                      ({{ w.pronunciation || w.kana }})
                    </b>
                    <em>{{ w.definitions[0] }}</em>
                  </b-dropdown-item>
                </b-dropdown>
              </div>
              <div class="text-center">
                <Loader class="pt-5 pb-5" />
              </div>
              <div
                v-if="word"
                class="text-center"
                :key="`word-heading-${word.id}`"
              >
                <Flashcard>
                  <template v-slot:front>
                    <div>
                      <LazyEntryHeader
                        :entry="word"
                        :hidePhonetics="true"
                        :disabled="true"
                      />
                      <DefinitionsList
                        v-if="word.definitions"
                        :class="{ 'mt-3': true, transparent: true }"
                        :definitions="word.definitions"
                        :translated="
                          $store.state.settings.useMachineTranslatedDictionary
                        "
                      ></DefinitionsList>
                    </div>
                  </template>
                  <template v-slot:back>
                    <div>
                      <LazyEntryHeader
                        :entry="word"
                        :hidePhonetics="false"
                        :disabled="true"
                      />
                      <DefinitionsList
                        v-if="word.definitions"
                        :class="{ 'mt-3': true, transparent: false }"
                        :definitions="word.definitions"
                        :translated="
                          $store.state.settings.useMachineTranslatedDictionary
                        "
                      ></DefinitionsList>
                    </div>
                  </template>
                </Flashcard>
              </div>
            </div>
          </div>
          <div
            :class="{
              'content-pane-right pl-3 pr-3': wide,
              'col-sm-12': !wide,
            }"
          >
            <div class="text-center">
              <Loader class="pt-5 pb-5" />
            </div>
            <div v-if="dictionaryMatchCompleted">
              <LazyDictionaryEntry
                v-if="word && phrasebook"
                :entry="word"
                :tvShow="getTVShow(phrasebook.tv_show)"
                :exact="phraseObj.exact || phrasebook.exact"
                :exactPhrase="phraseObj.phrase"
                :key="`dictionary-entry-${word.id}`"
                :showImages="false"
                ref="dictionaryEntry"
              />
              <LazyPhraseComp
                v-else-if="phraseObj && phraseObj.phrase && phrasebook"
                :term="phraseObj.phrase.toLowerCase()"
                :tvShow="getTVShow(phrasebook.tv_show)"
                :exact="phraseObj.exact || phrasebook.exact"
                :showExternal="false"
                :showImages="false"
                :showCollocations="false"
                :showExamples="false"
                ref="phrase"
              />
              <template v-if="word">
                <EntryCourseAd
                  v-if="$l2.code === 'zh'"
                  variant="compact"
                  class="focus-exclude"
                  :entry="word"
                ></EntryCourseAd>
              </template>
              <SimilarPhrases
                v-if="phraseObj && phraseObj.en"
                :phrase="phraseObj.phrase"
                :translation="phraseObj.en"
                :wiktionary="false"
                class="text-center mb-5"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </container-query>
</template>

<script>
import DateHelper from "@/lib/date-helper";
import { ContainerQuery } from "vue-container-query";
import { mapState } from "vuex";
import { dictionaryTooLargeAndWillCauseServerCrash, uniqueByValue } from "@/lib/utils";

export default {
  components: {
    ContainerQuery,
  },
  props: {
    bookId: {
      type: String,
    },
    phraseId: {
      type: String,
    },
    phrase: {
      type: String,
    },
  },
  data() {
    return {
      phrasebook: undefined,
      phraseObj: undefined,
      words: undefined,
      word: undefined,
      dictionaryMatchCompleted: false,
      images: [],
      params: {},
      query: {
        wide: {
          minWidth: 991,
        },
      },
    };
  },
  computed: {
    ...mapState("savedPhrases", ["savedPhrases"]),
    homeRoute() {
      let route;
      if (this.bookId === "saved")
        route = {
          name: "l1-l2-saved-phrases",
        };
      else {
        route = {
          name: "l1-l2-phrasebook-bookId",
          params: {
            bookId: String(this.phrasebook.id),
          },
          hash: `#${Number(this.phraseId) + 1}`,
        };
      }
      return route;
    },
    phraseItem() {
      if (typeof this.phraseObj !== "undefined") {
        let phraseItem = {
          l2: this.$l2.code,
          phrase: this.phraseObj.phrase,
          phrasebookId: this.phrasebook.phrasebookId,
          pronunciation: this.phraseObj.pronunciation,
          exact: this.phrasebook.exact,
          translations: {},
        };
        if (this.phraseObj[this.$l1.code])
          phraseItem.translations[this.$l1.code] =
            this.phraseObj[this.$l1.code];
        return phraseItem;
      }
    },
    title() {
      if (this.phrase) {
        return `Learn the ${this.$l2 ? this.$l2.name : ""} Phrase “${
          this.phrase
        }” | Language Player Dictionary`;
      }
      return `Lookup ${
        this.$l2 ? this.$l2.name : ""
      } Phrases | Language Player`;
    },
    description() {
      if (this.phrase) {
        return `See how “${this.phrase}” is used in TV shows, how it forms collocations, and other examples.`;
      }
      return `Look up ${this.$l2 ? this.$l2.name : ""} phrases. See how ${
        this.$l2 ? this.$l2.name : ""
      } words are used in TV shows, how they form collocations, and other examples.`;
    },
    wide() {
      return this.params.wide && ["lg", "xl", "xxl"].includes(this.$mq);
    },
  },
  mounted() {
    let phrasebook = this.getPhrasebookFromStore();
    if (phrasebook) {
      if (!phrasebook.phrases) {
        this.loadPhrases();
      } else {
        this.phrasebook = phrasebook;
        this.getPhrase();
      }
    }
    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      if (mutation.type === "savedPhrases/REMOVE_SAVED_PHRASE") {
        if (mutation.payload.phrase === this.phrase) {
          this.phraseUnsaved();
        }
      }
      if (mutation.type.startsWith("phrasebooks")) {
        if (mutation.type === "phrasebooks/LOAD_PHRASEBOOKS") {
          let phrasebook = this.getPhrasebookFromStore();
          if (phrasebook) {
            if (!phrasebook.phrases) {
              this.loadPhrases();
            } else {
              this.phrasebook = phrasebook;
              this.getPhrase();
            }
          }
        }
        if (mutation.type === "phrasebooks/LOAD_PHRASES") {
          let phrasebook = this.getPhrasebookFromStore();
          if (phrasebook && phrasebook.phrases) {
            this.phrasebook = phrasebook;
            this.getPhrase();
          }
          this.loading = false;
        }
        if (mutation.type === "phrasebooks/UPDATE_PHRASES") {
          this.getPhrase();
          this.refreshPhrase();
        }
      }
    });
  },
  created() {
    this.bindKeys();
  },
  destroyed() {
    this.unbindKeys();
  },
  beforeDestroy() {
    // you may call unsubscribe to stop the subscription
    this.unsubscribe();
  },
  beforeRouteUpdate(to, from, next) {
    // called when the route that renders this component is about to
    // be navigated away from.
    // has access to `this` component instance.
    this.savePhrasebookHistory(Number(to.params.phraseId));
    next();
  },
  methods: {
    getTVShow(id) {
      let tvSHow = this.$store.getters["shows/tvShow"]({l2: this.$l2, id})
      return tvSHow;
    },
    async saveTranslation(e) {
      let newText = e.target.innerText.trim();
      if (this.phraseObj[this.$l1.code] !== newText) {
        let phrase = Object.assign({}, this.phraseObj);
        phrase[this.$l1.code] = newText;
        this.updatePhrase(phrase);
      }
    },
    updatePhrase(phrase) {
      this.$store.dispatch("phrasebooks/updatePhrase", {
        phrasebook: this.phrasebook,
        phrase,
      });
    },
    remove() {
      this.$store.dispatch("phrasebooks/removePhrase", {
        phrasebook: this.phrasebook,
        phrase: this.phraseObj,
      });
    },
    loadPhrases() {
      if (this.bookId !== "saved") {
        this.loading = true;
        this.$store.dispatch("phrasebooks/loadPhrases", {
          l2: this.$l2,
          bookId: Number(this.bookId),
          adminMode: this.$adminMode,
        });
      }
    },
    changeWordTo(w) {
      this.word = w;
    },
    phraseUnsaved() {
      if (this.bookId !== "saved") return;
      let savedPhrases = this.savedPhrases[this.$l2.code];
      let nextSavedPhrase = savedPhrases[Number(this.phraseId)];
      let phraseId = this.phraseId; // If the phrase was removed, the next phrase will have the same id
      if (nextSavedPhrase) {
        const phraseObj = {
          phrase: nextSavedPhrase.phrase,
          id: phraseId,
        };
        this.$router.push(this.url(phraseObj));
      } else if (savedPhrases.length > 0) {
        const phraseObj = {
          phrase: savedPhrases[0].phrase,
          id: "0",
        };
        this.$router.push(this.url(phraseObj));
      } else {
        this.$router.push({
          name: "l1-l2-saved-phrases",
        });
      }
    },
    refreshPhrase() {
      let nextPhraseId = Math.min(
        this.phrasebook.phrases.length - 1,
        Number(this.phraseId)
      );
      let nextPhrase = this.phrasebook.phrases[nextPhraseId];
      let route = {
        name: "l1-l2-phrasebook-phrase",
        params: {
          bookId: this.bookId,
          phraseId: String(nextPhrase.id),
          phrase: nextPhrase.phrase,
        },
      };
      this.$router.push(route);
    },
    savePhrasebookHistory(index) {
      if (!this.phrasebook) return;
      let data = {
        type: "phrasebook",
        id: `${this.$l2.code}-phrasebook-${this.phrasebook.id}`,
        date: DateHelper.unparseDate(new Date()),
        l1: this.$l1.code,
        l2: this.$l2.code,
        phrasebook: {
          id: this.phrasebook.id,
          title: this.phrasebook.title,
          index,
          length: this.phrasebook.phrases.length,
        },
      };
      data.phrasebook.progress = data.phrasebook.index / data.phrasebook.length;
      // this.$store.dispatch("history/add", data);
    },
    getPhrasebookFromStore() {
      let phrasebooks, phrasebook;
      if (this.bookId === "saved") {
        phrasebook = {
          title: "Saved {l2} Phrases",
          phrases: this.savedPhrases[this.$l2.code] || [],
          l2: this.$l2,
          id: "saved",
        };
      } else {
        phrasebooks = this.$store.state.phrasebooks.phrasebooks[this.$l2.code];
        if (!phrasebooks) return;
        phrasebook = phrasebooks.find((pb) => pb.id === Number(this.bookId));
        if (!phrasebook) return;
      }
      return phrasebook;
    },
    async getPhrase() {
      let phrase = this.phrasebook.phrases.find((p, index) => {
        if (p.id === Number(this.phraseId + 1)) return true;
        if (index === Number(this.phraseId)) return true;
      });
      if (typeof phrase !== "undefined") {
        phrase.phrase = this.stripPunctuations(phrase.phrase);
        this.phraseObj = phrase;
        if (
          process.server &&
          dictionaryTooLargeAndWillCauseServerCrash(this.$l2["iso639-3"])
        )
          return;
        else await this.matchPhraseToDictionaryEntries();
      } else {
        this.$router.push({
          name: "l1-l2-phrase-search-term",
          params: {
            term: this.phrase,
          },
        });
      }
    },
    async matchPhraseToDictionaryEntries() {
      let dictionary = await this.$getDictionary();
      if (dictionary) {
        let words = await dictionary.lookupMultiple(
          this.phraseObj.phrase,
          true
        );
        this.words = uniqueByValue(words, "id");
        if (this.words && this.words.length > 0) {
          for (let word of this.words) {
            if (!word.pronunciation)
              word.pronunciation = this.phraseObj.pronunciation;
          }
          this.word = this.words[0];
        }
      }
      this.dictionaryMatchCompleted = true;
    },
    stripPunctuations(text) {
      text = text.replace(/[.!?。！？…؟♪\*]/g, "").trim();
      text = text.replace(/\/[^\s]+/, "").trim();
      text = text.replace(/[（(].*[)）]/g, "").trim();
      return text;
    },
    findCurrent(phraseObj) {
      if (this.bookId === "saved") {
        return phraseObj.phrase === this.phraseObj.phrase;
      } else {
        return phraseObj.id === Number(this.phraseId);
      }
    },
    url(phraseObj) {
      return `/${this.$l1.code}/${this.$l2.code}/phrasebook/${
        this.phrasebook.id
      }/${
        phraseObj.id ||
        this.phrasebook.phrases.findIndex((p) => p.phrase === phraseObj.phrase)
      }/${encodeURIComponent(phraseObj.phrase)}`;
    },
    textChanged(newText) {
      this.phraseObj.phrase = newText;
    },
    bindKeys() {
      if (typeof window !== "undefined" && !this.keysBound) {
        this.keysBound = true; // bind only once!
        window.addEventListener("keydown", this.keydown);
      }
    },
    unbindKeys() {
      if (typeof window !== "undefined")
        window.removeEventListener("keydown", this.keydown);
    },
    keydown(e) {
      if (
        !["INPUT", "TEXTAREA"].includes(e.target.tagName.toUpperCase()) &&
        !e.metaKey &&
        !e.repeat &&
        !e.target.getAttribute("contenteditable")
      ) {
        if (e.code == "KeyN") {
          if (this.$refs.paginator.nextPath) {
            this.$router.push(this.$refs.paginator.nextPath);
          }
          e.preventDefault();
          return false;
        }
        if (e.code == "KeyP") {
          if (this.$refs.paginator.previousPath) {
            this.$router.push(this.$refs.paginator.previousPath);
          }
          e.preventDefault();
          return false;
        }
        if (e.code == "KeyS") {
          let hit = this.$refs.dictionaryEntry.$refs.searchSubs.currentHit;
          if (hit.saved) {
            console.log(
              "Phrasebook Phrase: Key S - removing hit",
              this.$refs.dictionaryEntry.$refs.searchSubs.terms,
              hit
            );
            this.$refs.dictionaryEntry.$refs.searchSubs.removeSavedHit(hit);
          } else {
            console.log(
              "Phrasebook Phrase: Key S - saving hit",
              this.$refs.dictionaryEntry.$refs.searchSubs.terms,
              hit
            );
            this.$refs.dictionaryEntry.$refs.searchSubs.saveHit(hit);
          }
          e.preventDefault();
          return false;
        }
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../../../../assets/scss/variables.scss";
.zerotohero-wide {
  .content-pane-left {
    overflow-y: auto;

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
}

:deep(.disambiguation-dropdown) {
  margin-left: -3.5rem;
  width: 15rem;

  .dropdown-item {
    white-space: normal;
    padding: 0.2rem 1rem;
  }
}

.phrasebook-title {
  &:hover {
    color: $primary-color;
  }
}

.remove-btn {
  color: #999;
}

:deep(.hide-phonetics .word-block-pinyin) {
  opacity: 0;
}

:deep(.hide-word .word-block-text) {
  opacity: 0;
}

.phrase-pronunciation {
  color: #779bb5;
}
</style>
