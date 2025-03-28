<template>
  <div
    class="definitions-list"
    style="max-width: 50rem; margin: 0 auto"
    v-observe-visibility="{
      callback: visibilityChanged,
      once: true,
    }"
  >
    <template v-if="augmentedDefinitions && augmentedDefinitions.length > 0">
      <ol
        :class="{
          'definitions mb-2': true,
          single: singleColumn,
          'definitions-many':
            alwaysShowAsList || (augmentedDefinitions.length > 3 && !neverShowAsList),
          'show-as-numbered-list': showAsNumberedList,
        }"
      >
        <li
          v-for="(definition, index) in augmentedDefinitions"
          :key="`definition-${index}`"
          class="definition-list-item"
        >
          <span
            class="word-type mt-3"
            v-if="showPOS && index === 0 && entry && entry.pos"
          >
            {{
              entry.gender
                ? { m: "masculine", f: "feminine", n: "neuter" }[entry.gender]
                : ""
            }}
            {{ entry.pos }}
            {{
              entry.heads && entry.heads[0] && entry.heads[0][1]
                ? entry.heads[0][1]
                : ""
            }}:
          </span>
          <span v-html="definition.html" /><template v-if="index < augmentedDefinitions.length - 1">;</template>
        </li>
      </ol>
    </template>
    <template v-else>
      <div class="l1">{{ nodef }}</div>
    </template>
  </div>
</template>

<script>
import VRuntimeTemplate from "v-runtime-template";
import { unique, LANGS_WITH_AZURE_TRANSLATE } from "../lib/utils";
import translators from "../lib/translators";

export default {
  components: {
    VRuntimeTemplate,
  },
  props: {
    entry: Object,
    definitions: Array,
    singleColumn: {
      type: Boolean,
      default: false,
    },
    showPOS: {
      type: Boolean,
      default: true,
    },
    alwaysShowAsList: {
      type: Boolean,
      default: false,
    },
    neverShowAsList: {
      type: Boolean,
      default: false,
    },
    showAsNumberedList: {
      type: Boolean,
      default: true,
    },
    nodef: {
      type: String,
      default: "",
    },
    translated: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      augmentedDefinitions: [],
    };
  },
  async mounted() {
    this.augmentedDefinitions = this.definitions;
    await this.loadAugmentedDefinitions();
  },
  methods: {
    visibilityChanged(visible) {
      if (visible) {
        if (this.translated) this.loadAugmentedDefinitions({ translate: true })
      }
    },
    async translateStrings(strings) {
      if (!this.$store.state.settings.useMachineTranslatedDictionary) return strings
      if (!LANGS_WITH_AZURE_TRANSLATE.includes(this.$l1.code)) return strings
      const l1Code = this.$l1.code // The destination language
      const l2Code = 'en'          // The source language is English
      let translatedStrings = strings
      if (l1Code !== l2Code) {
        translatedStrings = await translators.translateArrayWithBing({
          textArray: strings,
          l1Code,
          l2Code,
        });
      }
      return translatedStrings || strings
    },
    async loadAugmentedDefinitions({ translate = false } = {}) {
      let augmentedDefinitions = this.definitions;
      if (translate) {
        augmentedDefinitions = await this.translateStrings(augmentedDefinitions)
      }
      // augmentedDefinitions = this.parseCircleNumbersInDefinitions(augmentedDefinitions)
      augmentedDefinitions = unique(augmentedDefinitions || [])
      const promises = augmentedDefinitions.map(async (definition) => {
        if (typeof definition === "string") definition = { text: definition };
        definition.html = await this.definitionHtml(definition.text);
        return definition;
      })
      augmentedDefinitions = await Promise.all(promises);
      this.augmentedDefinitions = augmentedDefinitions;
    },
    async getWord(term) {
      const dictionary = await this.$getDictionary();
      let words = dictionary.lookupMultiple(term, true);
      if (words && words.length > 0) {
        return words[0];
      }
    },
    async definitionHtml(text) {
      let lemma, stringBefore, stringAfter;
      // sanitize text (remove html tags)
      text = text.replace(/<[^>]*>?/gm, "");
      if (this.$dictionaryName === "hsk-cedict") {
        let m = text.match(/(.*?)([^\s]+?)\|([^\s]+?)\[(.+?)\](.*?)/);
        if (!m) m = text.match(/(.*?)([^\s]+?)\[(.+?)\](.*?)/);
        if (m) {
          stringBefore = m[1];
          lemma = m[2].replace(/\u200e/g, ""); // Left-to-Right Mark
          stringAfter = m[m.length - 1];
        }
      } else {
        if (this.$l2?.code !== "en") {
          let m = text.match(/(.* of )([^\s]+)(.*)/);
          if (m) {
            stringBefore = m[1];
            lemma = m[2].replace(/\u200e/g, ""); // Left-to-Right Mark
            stringAfter = m[3];
          }
        }
      }
      if (lemma) {
        let lemmaWord = await this.getWord(lemma);
        if (lemmaWord) {
          return `${stringBefore}<router-link data-level="${
            lemmaWord.level || "outside"
          }" to="/${this.$l1.code}/${this.$l2.code}/dictionary/${
            this.$dictionaryName
          }/${lemmaWord.id}">${lemma}</router-link>${stringAfter}`;
        }
      }
      return text;
    },
  },
};
</script>

<style lang="scss">
.definitions {
  padding-left: 0;
  list-style: none;
  display: inline;

  .definition-list-item {
    display: inline;
  }
  &.definitions-many {
    display: block;
    .definition-list-item {
      display: list-item;
      .definition-list-item-separator {
        display: none;
      }
    }
    &.show-as-numbered-list {
      list-style: decimal;
      .definition-list-item {
        text-align: left;
      }
    }
  }
}
@media (min-width: 768px) {
  .definitions-many {
    display: inline-block;
    &:not(.single) {
      columns: 2;
      column-gap: 3rem;
    }
  }
}
</style>
