<template>
  <div :class="`${showScreen ? 'screen' : ''} skin-${$skin}`">
    <div class="text-center">
      <Logo v-if="showLogo" :forcePro="true" :skin="$skin" to="/go-pro" />
      <div class="mt-3" />
      <div>
        <p class="mb-1 strong" style="font-size: 1.2em">
          <template v-if="message">{{ message }}</template>
          <template v-else>{{
            $t("See complete subtitles with Pro.")
          }}</template>
        </p>
      </div>
      <div class="mt-4" v-if="!SALE">
        <router-link class="btn btn-success pl-3 pr-3" :to="{ name: 'go-pro' }"
          >🚀 {{ $t("Upgrade to Pro") }}</router-link
        >
      </div>
      <Sale class="mt-4 mx-2" />
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import { SALE } from "@/lib/utils";

export default {
  props: {
    showScreen: {
      type: Boolean,
      default: true,
    },
    showLogo: {
      type: Boolean,
      default: true,
    },
    message: {
      type: String,
    },
    skin: {
      type: String,
    }
  },
  data() {
    return {
      SALE
    };
  },
  computed: {
    ...mapState("stats", ["stats"]),
  },
};
</script>

<style lang="scss" scoped>
@import "../assets/scss/variables.scss";
.screen.skin-dark {
  background: linear-gradient(
    to bottom,
    rgba($bg-color-dark-1, 0) 0%,
    rgba($bg-color-dark-1, 1) 33%,
    rgba($bg-color-dark-1, 1) 100%
  );
  width: 100%;
}
.screen.skin-light {
  background: linear-gradient(
    to bottom,
    rgba($bg-color-light-1, 0) 0%,
    rgba($bg-color-light-1, 1) 33%,
    rgba($bg-color-light-1, 1) 100%
  );
  width: 100%;
}
</style>
