<template>
  <div class="main pb-5">
    <SocialHead :title="`My ${$l2.name} Text | Language Player`"
      :description="`Read ${$l2.name} text with phonetic annotation dictionary lookup. Save new words for review.`" />
    <div class="container">
      <div class="row">
        <div class="col-sm-12">
          <div v-if="loaded">
            <div>
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="mt-4">{{ $t('My Texts') }}</h5>
                <b-button v-if="$auth.loggedIn" class="new-button" variant="success" @click="newText" :disabled="creating">
                  <span v-if="!creating">
                    <i class="fas fa-edit mr-1"></i>
                    {{ $t("New Text") }}
                  </span>
                  <span v-else>
                    <b-spinner small v-if="creating" />
                  </span>
                </b-button>
              </div>
              <hr class="mt-2 mb-4" />
              <template v-if="savedtexts.length > 0">
                <div v-for="savedText in savedTextSortedByLastOpened" :key="savedText.id" class="mb-4">
                  <TextCard :text="savedText" />
                </div>
              </template>
            </div>
            <div class="my-text-message mt-5">
              <div v-if="!$auth.loggedIn" class="text-center alert-success p-3 pb-4 rounded mt-4 w-100">
                <p>{{ $t("To create new texts, please login.") }}</p>
                <router-link :to="{ name: 'login' }" class="btn btn-success">
                  {{ $t("Login") }}
                  <i class="fas fa-chevron-right"></i>
                </router-link>
              </div>
              <div>
                <p>
                  <i18n path="This tool will annotate {l2} text with {transliteration} and a popup dictionary."
                    class="text-center mb-4">
                    <template #l2>{{ $t($l2.name) }}</template>
                    <template #transliteration>
                      <span v-if="$hasFeature('transliteration')">
                        {{
                          {
                            zh: $t("pinyin annotation"),
                            ja: $t("furigana (Japanese syllabary) annotation"),
                            ko: $t(
                              "Hanja byeonggi (Chinese character annotation)"
                            ),
                            vi: $t("Hán tự (Chinese character) annotation"),
                          }[$l2.code] || $t("phonetic transcription")
                        }}
                      </span>
                    </template>
                  </i18n>
                </p>
                <p>
                  {{
                    $t(
                      'To get started, create a new Text.'
                    )
                  }}
                </p>
              </div>
            </div>
          </div>
          <div class="text-center mt-5 mb-5" v-else>
            <Loader :sticky="true" :message="$t('Loading your text...')" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
export default {
  data() {
    return {
      loaded: false,
      creating: false,
    };
  },
  mounted() {
    this.updateLoaded();
    this.unsubscribe = this.$store.subscribe((mutation, state) => {
      if (mutation.type === "savedText/LOAD") {
        this.updateLoaded();
      }
    });
    if (!this.loadedByL2?.[this.$l2.code]) {
      this.$store.dispatch("savedText/load", {
        l2: this.$l2,
        adminMode: this.$adminMode,
      });
    }
  },
  beforeDestroy() {
    this.unsubscribe();
  },
  computed: {
    ...mapState("savedText", ["loadedByL2"]),
    ...mapState("savedText", ["itemsByL2"]),
    savedTextSortedByLastOpened() {
      if (!this.fullHistory) return this.savedtexts;
      // Clone and reverse fullHistory to get the most recently opened items first
      const fullHistory = [...this.fullHistory].reverse();
      return [...this.savedtexts].sort((a, b) => {
        const aIndex = fullHistory.findIndex(
          (item) => item.path.includes(`/${this.$l1.code}/${this.$l2.code}/reader/shared/${a.id}`)
        );
        const bIndex = fullHistory.findIndex(
          (item) => item.path.includes(`/${this.$l1.code}/${this.$l2.code}/reader/shared/${b.id}`)
        );
        // Make sure negative numbers are at the end of the list
        if (aIndex < 0) return 1;
        if (bIndex < 0) return -1;
        return aIndex - bIndex;
      });
    },
    $adminMode() {
      if (typeof this.$store.state.settings.adminMode !== "undefined")
        return this.$store.state.settings.adminMode;
    },
    savedtexts() {
      return this.itemsByL2[this.$l2.code] || [];
    },
    hasLocalText() {
      if (typeof localStorage !== "undefined") {
        let localText = localStorage.getItem("zthReaderText");
        return localText;
      }
    },
  },
  methods: {
    updateLoaded() {
      this.loaded = this.loadedByL2?.[this.$l2.code];
    },
    async newText() {
      this.creating = true;
      let item = await this.$store.dispatch("savedText/add", { l2: this.$l2 });
      if (item) {
        this.$router.push({
          name: "l1-l2-reader",
          params: { method: "shared", arg: item.id },
        });
      }
      this.creating = false;
    },
  },
};
</script>

<style lang="scss" scoped>
.new-button {}

.zerotohero-with-mini-player {
  .new-button {
    bottom: 6rem;
  }
}

.zerotohero-not-wide {
  .new-button {
    bottom: 6rem;
  }
}

.zerotohero-not-wide.zerotohero-with-mini-player {
  .new-button {
    bottom: 11rem;
  }
}

.my-text-message {
  font-size: 1.2em;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
