<template>
  <span>
    <router-link
      :class="{
        'btn btn-small ml-0': true,
        'text-white bg-secondary': showSaved,
        'text-contrast bg-none border-dashed border-secondary': !showSaved,
      }"
      v-if="$adminMode && tvShow"
      :to="{
        name: 'l1-l2-show-type-id',
        params: { type: 'tv-show', id: String(tvShow.id) },
      }"
    >
      <i class="fa fa-tv mr-1" />
      {{ tvShow.title }}
      <i
        :class="{
          'fas fa-times-circle ml-1': true,
          'd-none': !$adminMode,
        }"
        @click.stop.prevent="unassignShow('tv_show')"
      />
    </router-link>
    <router-link
      :class="{
        'btn btn-small ml-0': true,
        'text-white bg-secondary border-0': showSaved,
        'text-contrast bg-none border-dashed border-secondary': !showSaved,
      }"
      v-if="$adminMode && talk"
      :to="{
        name: 'l1-l2-show-type-id',
        params: { type: 'talk', id: String(talk.id) },
      }"
    >
      <i class="fas fa-graduation-cap mr-2"></i>
      {{ talk.title }}
      <i
        :class="{
          'fas fa-times-circle ml-1': true,
          'd-none': !$adminMode,
        }"
        @click.stop.prevent="unassignShow('talk')"
      />
    </router-link>
  </span>
</template>
<script>
import Vue from "vue";
export default {
  props: {
    video: {
      type: Object,
      required: true,
    },
    showSaved: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    tvShow() {
      if (this.video.tv_show)
        return this.$store.getters["shows/tvShow"]({
          l2: this.$l2,
          id: this.video.tv_show.id || this.video.tv_show,
        });
    },
    talk() {
      if (this.video.talk)
        return this.$store.getters["shows/talk"]({
          l2: this.$l2,
          id: this.video.talk.id || this.video.talk,
        });
    },
  },
  methods: {
    async unassignShow(type) {
      let payload = {};
      payload[type] = null;
      let l2Id = this.video.l2 ? this.video.l2.id || this.video.l2 : this.$l2.id;
      let data = await this.$directus.patchVideo({
        l2Id,
        id: this.video.id,
        payload,
      });
      if (data) {
        Vue.delete(this.video, type);
      }
    },
  },
};
</script>
