<template>
  <!-- In-app image search removed (2026-08-30): the image gallery is gone and
       only a "search image" link (Google Images) is shown. The component keeps
       its name/props so consumers don't break; it no longer fetches the Flask
       /images endpoint (which is disabled). -->
  <a
    v-if="text"
    :href="googleImagesUrl"
    target="_blank"
    rel="noopener noreferrer"
    class="search-image-link"
    v-cloak
  >
    {{ searchLabel }}
  </a>
</template>

<script>
export default {
  props: {
    text: {
      type: String,
    },
    limit: {
      type: String,
      default: "20",
    },
    entry: {
      default: undefined,
    },
    preloaded: {
      type: Array,
    },
    link: {
      type: Boolean,
      default: true,
    },
    hover: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      searchLabel: "Search image",
    };
  },
  computed: {
    googleImagesUrl() {
      return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(this.text)}`;
    },
  },
  created() {
    // Emit an empty result for consumers that observe the wall's loaded event.
    this.$emit("loaded", []);
  },
};
</script>

<style lang="scss" scoped>
.search-image-link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #94a3b8;
  text-decoration: underline;
}
</style>
