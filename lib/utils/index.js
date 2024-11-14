export { default as SPECIAL_LANGUAGES } from './special-languages'
export { default as SAMPLE_TEXT } from './sample-text'
export { default as SpeechSingleton } from './speech-singleton'
export * from './background'
export * from './timeout'
export * from './array'
export * from './countries'
export * from './device'
export * from './error'
export * from './exams'
export * from './language-levels'
export * from './proxy'
export * from './random'
export * from './regex'
export * from './string'
export * from './japanese'
export * from './unique-id'
export * from './url'
export * from './viewport'
export * from './servers'
export * from './variables'

export const unlessUndefined = (obj, func) => {
  if (typeof obj !== 'undefined' && obj !== null) {
    return func(obj)
  } else {
    return undefined
  }
}

export const parseTime = (str) => {
  var timeArray = str.split(':').reverse()
  var timeSeconds = 0
  for (var i in timeArray) {
    timeSeconds = timeSeconds + Number(timeArray[i]) * Math.pow(60, i)
  }
  return timeSeconds
}

export const getYearTitle = (yyyy) => {
  if (yyyy > 0) {
    return Math.abs(yyyy) + ' C.E.'
  } else if (yyyy < 0) {
    return Math.abs(yyyy) + ' B.C.E.'
  }
}