import { LANGS_WITH_AZURE_TRANSLATE } from '../lib/utils'

export default async function ({ error, route, app, store, params, i18n }) {
  if (params.l1 && params.l2) {
    if (store.state.settings.l1 && store.state.settings.l1.code === params.l1 && store.state.settings.l2 && store.state.settings.l2.code === params.l2) {
      return
    } else {
      console.log('Language Switch: Setting languages...')
      let l1 = app.$languages.getSmart(params.l1)
      let l2 = app.$languages.getSmart(params.l2)
      if (!l1 || !l2) {
        // If common languages do not include the code requested, load the whole language list
        await app.$languages.loadFull()
        l1 = app.$languages.getSmart(params.l1)
        l2 = app.$languages.getSmart(params.l2)
        if (!l1 || !l2) {
          error({
            statusCode: 404,
            message: `Invalid route: ${route.path}`,
          })
          return
        }
      }
      store.dispatch('settings/setUseMachineTranslatedDictionary', false)
      store.dispatch('settings/setL1L2', { l1, l2 })
      if (l1) {
        i18n.locale = l1.code;
        if (l1.translations) {
          i18n.setLocaleMessage(
            l1.code,
            l1.translations
          )
        }

        let dictionaries = l1.dictionaries // ['freedict']
          ? l1.dictionaries[l2["iso639-3"] || l2["glottologId"]]
          : undefined;
        
        if (dictionaries) {
          console.log('Setting dictionary name to', dictionaries[0])
          store.dispatch('settings/setDictionaryName', dictionaries[0])
        }

        // For all the languages that can be learned from English, also add the languages that Azure translate supports
        if (!dictionaries) {
          if (LANGS_WITH_AZURE_TRANSLATE.includes(l1.code)) {
            let englishLanguage = app.$languages.getSmart('en')
            const code = l2["iso639-3"] || l2["glottologId"]
            dictionaries = englishLanguage.dictionaries?.[code]
            if (dictionaries) {
              console.log('Setting dictionary name to', dictionaries[0], ' (Azure translated)')
              store.dispatch('settings/setDictionaryName', dictionaries[0])
              // Use machine translated definitions, unless the L2 is the same as the L1 (e.g. learning Japanese from Japanese)
              if (params.l1 !== params.l2) store.dispatch('settings/setUseMachineTranslatedDictionary', true)
            }
          }
        }
      }
    }
  }
}