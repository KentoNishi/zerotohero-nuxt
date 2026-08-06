import Vue from 'vue'
import VTooltip from 'v-tooltip'
import VueObserveVisibility from 'vue-observe-visibility'
import VueSimpleSVG from 'vue-simple-svg'
import VueGtag from 'vue-gtag'
import ModuleLoader from '~/lib/module-loader'
import WorkerModuleLoader from '~/lib/worker-module-loader'
import VueMq from 'vue-mq'
import VueSmoothScroll from 'vue2-smooth-scroll'
import Languages from '../lib/languages'
import AsyncComputed from 'vue-async-computed'
import { ModalPlugin } from 'bootstrap-vue'

Vue.use(ModalPlugin)
Vue.config.productionTip = false
Vue.use(VTooltip)
Vue.use(VueSimpleSVG)
Vue.use(VueObserveVisibility)
Vue.use(VueSmoothScroll)
Vue.use(VueMq, {
  breakpoints: { // default breakpoints - customize this
    xs: 576,
    sm: 768,
    md: 992,
    lg: 1200,
    xl: 1400,
    xxl: Infinity
  },
  defaultBreakpoint: 'sm', // customize this for SSR
  error(listender, Init) {
    console.log('error')
  }
})
Vue.use(AsyncComputed)


// https://stackoverflow.com/questions/44371639/how-to-remove-html-tags-from-rendered-text
Vue.filter('striphtml', function (value) {
  var div = document.createElement('div')
  div.innerHTML = value
  var text = div.textContent || div.innerText || ''
  return text
})

// https://stackoverflow.com/questions/35070271/vue-js-components-how-to-truncate-the-text-in-the-slot-element-in-a-component
Vue.filter('truncate', function (text, length, clamp) {
  clamp = clamp || '...'
  var node = document.createElement('div')
  node.innerHTML = text
  var content = node.textContent
  return content.length > length ? content.slice(0, length) + clamp : content
})

export default async ({ app, store, route }, inject) => {
  Vue.use(VueGtag, {
    config: {
      id: 'UA-1846573-21', // Move to 'G-CXDV1NLTC2' after UA shutoff
    } 
  }, app.router)
  // Supabase Auth email links (SPEC-039 5.7) redirect to this origin with the
  // session in a URL fragment: /#access_token=...&sb= (or #error=... when the
  // link is invalid/expired). The Classic app authenticates through Flask, so
  // there is nothing to do with those tokens here — clean the URL and send the
  // user to /login (verified=1 shows a success alert). Without this, the
  // tokens could end up as a path (/access_token=...), which Nuxt SSR turns
  // into a 500.
  if (process.client) {
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const hasAuthFragment = ['access_token', 'refresh_token', 'error', 'error_code', 'error_description'].some((key) => hashParams.has(key))
    if (hasAuthFragment) {
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')
      // A password-recovery link (type=recovery) must land on the
      // password-reset page with the recovery JWT, not the "email verified"
      // login path — otherwise the user can never set a new password.
      if (type === 'recovery' && accessToken) {
        window.history.replaceState({}, '', window.location.pathname + window.location.search)
        window.location.replace('/password-reset?token=' + encodeURIComponent(accessToken))
      } else {
        const verified = accessToken ? '1' : '0'
        window.history.replaceState({}, '', window.location.pathname + window.location.search)
        // Let the plugin finish injecting before navigating away.
        window.location.replace('/login?verified=' + verified)
      }
    }
    // Some clients/webviews mangle the fragment into the path instead of the
    // hash (e.g. /access_token=...). Repair that too, so it never 500s.
    if (/^\/(access_token|error|error_code)=/.test(window.location.pathname)) {
      const isRecovery = window.location.pathname.includes('type=recovery')
      const accessToken = window.location.pathname.startsWith('/access_token=')
        ? window.location.pathname.split('access_token=')[1].split('&')[0]
        : null
      window.history.replaceState({}, '', '/')
      if (isRecovery && accessToken) {
        window.location.replace('/password-reset?token=' + encodeURIComponent(accessToken))
      } else {
        const verified = accessToken ? '1' : '0'
        window.location.replace('/login?verified=' + verified)
      }
    }
  }
  // Make legacy hash URLs work
  // https://qvault.io/javascript/vue-history-mode-support-legacy-hash-urls/
  app.router.beforeEach((to, from, next) => {
    // Redirect only legacy hash-ROUTE URLs (/ # /path) — vue-router includes
    // the hash in fullPath, so Supabase auth fragments arrive as
    // /#access_token=... and must NOT be rewritten into a path (that produced
    // /access_token=... → SSR 500). Those are handled above instead.
    if (to && to.fullPath.substr(0, 3) === '/#/') {
      const path = to.fullPath.substr(2);
      // next(path);
      window.location.href = path
      return;
    }
    next();
  })
  if (!app.$languages) {
    if (process.server) {
      let l1Code = route.params.l1
      let l2Code = route.params.l2
      if (l1Code && l2Code) {
        let languagesPromise = Languages.load([l1Code, l2Code])
        inject('languagesPromise', languagesPromise)
        inject('languages', await languagesPromise)
      }
    } else {
      let languagesPromise = Languages.load()
      inject('languagesPromise', languagesPromise)
      inject('languages', await languagesPromise)
    }
  }

  inject('hasFeature', (feature) => {
    return app.$languages
      .getFeatures({
        l1: store.state.settings.l1,
        l2: store.state.settings.l2,
      }, process.browser)
      .includes(feature);
  });
  inject('getDictionary', async () => {
    const dictionaryName = store.state.settings.dictionaryName
    if (store.state.settings.l1 && store.state.settings.l2 && dictionaryName) {
      
      if (process.client) {
        let l1 = store.state.settings.l1
        if (store.state.settings.useMachineTranslatedDictionary === true) l1 = app.$languages.getSmart('en')
        let dictionary = WorkerModuleLoader.load(dictionaryName + '-dictionary', { l1, l2: store.state.settings.l2 })
        return dictionary
      }
      /* We disable this for now to save bandwidth on Vercel
      else if (process.server) {
        let dictionary = ModuleLoader.load('dictionaries/' + store.state.settings.dictionaryName + '-server', { l1: store.state.settings.l1["iso639-3"], l2: store.state.settings.l2["iso639-3"] || store.state.settings.l2["glottologId"] })
        return dictionary
      }
      */
    }
  })
  
  inject('getGrammar', async () => {
    if (store.state.settings.l1 && store.state.settings.l2 && store.state.settings.dictionaryName) {
      let grammar = ModuleLoader.load('grammar', { l1: store.state.settings.l1["iso639-3"], l2: store.state.settings.l2["iso639-3"] || store.state.settings.l2["glottologId"] })
      return grammar
    }
  })
  inject('getHanzi', async () => {
    let hanzi = ModuleLoader.load('hanzi')
    return hanzi
  })
  inject('getUnihan', async () => {
    let unihan = ModuleLoader.load('unihan')
    return unihan
  })
}
