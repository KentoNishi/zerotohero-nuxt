<!-- TokenizedText.vue -->
<template>
  <span :class="{ 'tokenized-text': true, 'show-pinyin': $l2Settings.showPinyin, 'use-zoom': useZoom, speaking }" :dir="$l2.direction">
    <template v-if="tokenized">
      <template v-for="(token, index) in tokens"><word-block
          v-if="typeof token !== 'string'"
          :key="index"
          :token="token"
          :context="context ? { ...context, text } : { text }"
          :mappedPronunciation="token.mappedPronunciation"
        /><template v-else>
          <br v-if="token === '\n' || token === '\r'" :key="index" />
          <template v-else-if="/^\s+$/.test(token)">{{ token }}</template>
          <word-block
            v-else
            :key="index"
            :token="{ text: token }"
            :context="context ? { ...context, text } : { text }"
          />
        </template>
      </template>
    </template>
    <template v-else
      ><span
        v-observe-visibility="{
          callback: visibilityChanged,
          once: true,
        }"
        >{{ sanitizedText }}</span
      ></template
    >
  </span>
</template>

<script>
import { timeout, stripTags, SpeechSingleton } from "../lib/utils";
import { sify } from "chinese-conv";
import Klingon from "../lib/klingon";

export default {
  name: "TokenizedText",
  // Provide/Inject: Vue provides a provide and inject mechanism which is
  // aimed at deep component nesting. A parent component can "provide" properties,
  // and any nested child component can "inject" those properties without them
  // being passed through each level of the component tree.
  inject: {
    context: {
      default: () => null,
    },
    animationSpeed: {
      default: () => 1,
    },
    animationDuration: {
      default: () => null,
    },
  },
  props: {
    text: {
      type: String,
      required: true,
    },
    useZoom: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      tokenized: false,
      translationData: this.translation, // So we don't mutate the prop when we translate our own text
      tokens: [],
      editMode: false,
      textData: this.text, // So we don't mutate the prop when we edit our own text
      speaking: false,
    };
  },
  computed: {
    sanitizedText() {
      let sanitizedText = stripTags(this.textData || this.text).trim();
      return sanitizedText
    },
    phraseSaved() {
      return this.$refs["savePhrase"] && this.$refs["savePhrase"].saved;
    },
  },
  methods: {
    async speak() {
      this.speaking = true;
      await SpeechSingleton.instance.speak({
        l2: this.$l2,
        text: this.sanitizedText,
      });
      this.speaking = false;
      return true;
    },
    visibilityChanged(visible) {
      if (visible && !this.tokenized) {
        this.tokenize();
      }
    },
    async tokenize() {
      let dictionary = await this.$getDictionary();
      let text = this.sanitizedText;
      // If the language is Han, it uses the Jieba tokenizer, which works best with simplified Chinese characters. Therefore, we convert the text to simplified Chinese characters.
      if (this.$l2.han) {
        text = sify(text);
      }
      if (this.$l2.code === "tlh") {
        text = Klingon.normalizeLatin(text);
      }
      this.tokens = await dictionary.tokenizeWithCache(text);
      // Sometimes SpaCy returns line breaks as { text: '\n', type: 'SPACE' }, we convert that to a string
      this.tokens = this.tokens.map((token) =>
        token.text?.trim() === "" ? token.text : token
      );
      this.tokenized = true;
      this.$emit("annotated", true);
    },
    async checkSavedWords() {
      // Give a brief delay to allow the WordBlocks components to render fully.
      await timeout(300);

      // If there are children present
      if (this.$children?.length > 0) {
        // Initialize an empty array to store saved words from all WordBlocks components
        let savedWords = [];

        // Loop through each WordBlocks component (direct child)
        for (let wordBlockComponent of this.$children) {
          // Check if the component has a savedWord property and add it to the savedWords array
          if (wordBlockComponent.savedWord) {
            savedWords.push(wordBlockComponent.savedWord);
          }
        }

        // If there are any saved words found, emit an event with the saved words
        if (savedWords.length > 0) {
          this.$emit("savedWordsFound", savedWords);
        }
      }
    },

    /**
     * @param {Number} startFrom Starting time in seconds
     */
    async playAnimation(startFrom = 0) {

      await timeout(50); // Give a brief delay to allow the WordBlocks components to render fully.
      this.animate = true;

      if (this.animationDuration) {
        let wordBlockComponents = this.$children; // directly get the word block components

        if (wordBlockComponents?.length > 0) {
          let durationAlreadyPlayed = 0;
          for (const wb of wordBlockComponents) {
            let blockLength = wb.token?.text?.length || 0;
            let blockDuration =
              (blockLength / this.sanitizedText.length) *
              this.animationDuration;

            if (blockDuration === 0) continue;

            durationAlreadyPlayed = durationAlreadyPlayed + blockDuration;

            // Which ones should skip
            if (durationAlreadyPlayed > startFrom) {
              if (!this.animate) return;
              const blockAnimationDuration =
                blockDuration / this.animationSpeed;
              wb.playAnimation(blockAnimationDuration);
              await timeout(blockAnimationDuration * 1000);
            }
          }
        }
      }
    },
    async pauseAnimation() {
      this.animate = false;
    },
  },
};
</script>
<style>
.tokenized-text.show-pinyin {
  line-height: 2;
}
.annotate-input {
  width: 100%;
  resize: none; /* to prevent manual resizing */
  overflow: hidden;
}

.speaking {
  background-color: #ffdd5733;
  transition: background-color 0.5s ease;
}
</style>
