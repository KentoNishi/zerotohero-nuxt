<template>
  <div class="main">
    <div class="container pt-4" id="main">
      <SocialHead
        v-if="grammar && images && images[0]"
        :title="`${$t('Grammar {level} {code}', {
          level: $t(l2LevelName),
          code: grammar.code,
        })} | Language Player`"
        :description="`Example: ${grammar.example} ${grammar.exampleTranslation}`"
        :image="images[0].src"
      />
      <div class="row">
        <div class="col-sm-12" v-if="grammar">
          <h6 class="mb-2 text-center">
            <button :class="`btn btn-sm btn-${$skin} mr-1`" v-if="id > 1" @click="prevClick">
              <i class="fa fa-caret-left" />
            </button>
            <router-link :to="{ name: 'l1-l2-grammar' }">
              {{
                $t("Grammar {level} {code}", {
                  level: $t(l2LevelName),
                  code: grammar.code,
                })
              }}
            </router-link>
            <button :class="`btn btn-sm btn-${$skin}`" @click="nextClick">
              <i class="fa fa-caret-right" />
            </button>
          </h6>

          <LazyGrammarPoint :grammar="grammar" :key="id" class="mb-5" />

          <LazyPhraseComp
            v-if="
              grammar.pattern &&
              (!entry || grammar.pattern !== entry.simplified)
            "
            :term="grammar.pattern"
          />

          <div class="text-left mt-5" v-if="drills && drills.length > 0">
            <hr />
            <h4 class="text-center">{{ $t("Practice Drills") }}</h4>
            <LazyDrill
              v-for="drill in drills"
              :drill="drill"
              :key="`drill-${grammar.id}-${drill.id}`"
            />
          </div>
          <div v-if="entry">
            <hr />
            <div class="text-center">
              <EntryHeader
                class="p-4"
                :entry="entry"
                :key="`header-${entry.id}`"
                ref="entryHeader"
              ></EntryHeader>
              <DefinitionsList
                :key="`def-list-${entry.id}`"
                v-if="entry.definitions"
                class="mt-3"
                :definitions="entry.definitions"
                :translated="$store.state.settings.useMachineTranslatedDictionary"
              ></DefinitionsList>
              <EntryExample
                :entry="entry"
                class
                :key="`${entry.id}-example`"
              ></EntryExample>
            </div>
            <LazyDictionaryEntry
              :entry="entry"
              :showSearchSubs="
                !(
                  grammar.pattern &&
                  (!entry || grammar.pattern !== entry.simplified)
                )
              "
              :showImages="false"
              ref="dictionaryEntry"
              :key="`dictionary-entry-${entry.id}`"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Grammar from "../../../../../lib/grammar";
import { l2LevelName } from "../../../../../lib/utils";
import WordPhotos from "../../../../../lib/word-photos";

export default {
  props: {
    id: {
      type: String,
    },
  },
  data() {
    return {
      grammar: undefined,
      drills: [],
      entry: false,
      images: [],
      renderSearchSubs: true,
    };
  },
  computed: {
    l2LevelName() {
      return l2LevelName(this.$l2.code);
    },
    term() {
      return this.grammar
        ? this.grammar.structure.replace(/…….*/, "")
        : false;
    },
  },
  async mounted() {
    this.bindKeys();
    this.grammar = await this.loadGrammar();
    this.drills = await this.getDrill(this.grammar.id);
    this.images = await WordPhotos.getGoogleImages({
      term: this.term,
      lang: this.$l2.code,
    });
    this.entry = await this.loadEntry();
  },
  unmounted() {
    this.unbindKeys();
  },
  activated() {
    this.bindKeys();
  },
  deactivated() {
    this.unbindKeys();
  },
  watch: {
    id() {
      this.loadGrammar();
    },
  },
  methods: {
    reloadSearchSubs() {
      this.renderSearchSubs = false;
      this.$nextTick(() => {
        this.renderSearchSubs = true;
      });
    },
    async getDrill(grammarID) {
      try {
        let response = await this.$directus.get(
          `items/drills?filter[grammar_id][eq]=${grammarID}&filter[l2][eq]=${this.$l2.id}&fields=*,file.*`
        );
        response = response.data;
        if (response && response.data && response.data[0]) {
          return response.data;
        }
      } catch (err) {}
    },
    async loadGrammar() {
      this.drills = [];
      let grammar = await this.$getGrammar();
      let row = grammar._grammarData.find((row) => row.id === this.id);
      return row;
    },
    async loadEntry() {
      let dictionary = await this.$getDictionary();
      let entry;
      if (dictionary) {
        if (this.term) {
          entry = await dictionary.lookup(this.term);
        }
        if (typeof entry === "undefined") {
          entry = await dictionary.lookup(
            this.grammar.pattern.replace(/\*.*/, "")
          );
        }
        return entry;
      }
    },
    prevClick() {
      this.$router.push({
        path:
          `/${this.$l1.code}/${this.$l2.code}/grammar/view/` +
          Math.max(0, parseInt(this.id) - 1),
      });
    },
    nextClick() {
      this.$router.push({
        path:
          `/${this.$l1.code}/${this.$l2.code}/grammar/view/` +
          Math.min(Grammar._grammarData.length - 1, parseInt(this.id) + 1),
      });
    },
    keydown(e) {
      if (
        !["INPUT", "TEXTAREA"].includes(e.target.tagName.toUpperCase()) &&
        !e.metaKey
      ) {
        // home
        if (e.keyCode == 36) {
          document
            .getElementById("main")
            .scrollIntoView({ behavior: "smooth" });
          e.preventDefault();
          return false;
        }
        // end
        if (e.keyCode == 35) {
          document
            .getElementById("search-subs")
            .scrollIntoView({ behavior: "smooth" });
          e.preventDefault();
          return false;
        }
        // n = 78
        if (e.keyCode == 78) {
          this.nextClick();
          document
            .getElementById("main")
            .scrollIntoView({ behavior: "smooth" });
          e.preventDefault();
          return false;
        }
        // p = 80
        if (e.keyCode == 80) {
          this.prevClick();
          document
            .getElementById("main")
            .scrollIntoView({ behavior: "smooth" });
          e.preventDefault();
          return false;
        }
      }
    },
    bindKeys() {
      document.addEventListener("keydown", this.keydown);
    },
    unbindKeys() {
      document.removeEventListener("keydown", this.keydown);
    },
  },
};
</script>

<style></style>
