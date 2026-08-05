<template>
  <article :class="`updown article media skin-${$skin}`">
    <img
      v-if="article.thumbnail && article.thumbnail.startsWith('http')"
      :src="article.thumbnail"
      class="mr-2"
    />
    <div class="media-body">
      <client-only>
        <h5 class="article-title">
          <TokenizedText :text="article.title" />
        </h5>
        <div class="article-body">
          <TokenizedRichText :showMenu="true"><div v-html="article.body" /></TokenizedRichText>
        </div>
      </client-only>
    </div>
  </article>
</template>

<script>
import { unescape, stripTags } from "../lib/utils";

export default {
  props: ["article", "edit", "social"],
  methods: {
    unescape(escapedHTML) {
      return unescape(escapedHTML);
    },
    stripTags(html) {
      return stripTags(html);
    },
  },
};
</script>

<style>
</style>
