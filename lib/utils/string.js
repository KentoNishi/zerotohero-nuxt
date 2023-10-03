import decode from 'unescape'
import { parse } from 'node-html-parser'
import { unique } from './array'
import { escapeRegExp } from './regex'

export const STYLIZED_NUMBERS = [
  '⓪①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿',
  '🄋➀➁➂➃➄➅➆➇➈➉',
  '⓿❶❷❸❹❺❻❼❽❾❿⓫⓬⓭⓮⓯⓰⓱⓲⓳⓴',
  '🄌➊➋➌➍➎➏➐➑➒➓',
  '⓪⓵⓶⓷⓸⓹⓺⓻⓼⓽⓾',
  '🄀⒈⒉⒊⒋⒌⒍⒎⒏⒐⒑⒒⒓⒔⒕⒖⒗⒘⒙⒚⒛',
  '⓪⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽⑾⑿⒀⒁⒂⒃⒄⒅⒆⒇',
  '⓪㊀㊁㊂㊃㊄㊅㊆㊇㊈㊉',
  '０１２３４５６７８９'
]

export const roundTo = (n, dec = 2) => {
  return Math.round(n * Math.pow(10, dec)) / Math.pow(10, dec)
}
export const normalizeStylizedNumber = (circleNumber) => {
  for (let stylizedNumbers of STYLIZED_NUMBERS) {
    let number = stylizedNumbers.indexOf(circleNumber)
    if (number !== -1) return number
  }
}
export const normalizeStylizedNumbersInText = (text) => {
  let normalized = text
  for (let stylizedNumbers of STYLIZED_NUMBERS) {
    let regex = new RegExp(`[${stylizedNumbers}]`, 'g')
    let matches = normalized.match(
      regex
    );
    if (matches) {
      for (let m of matches) {
        normalized = normalized.replace(m, `[${normalizeStylizedNumber(m)}]`)
      }
    }
  }
  return normalized;
}
export const unescape = (escapedHTML) => {
  return decode(escapedHTML)
}
export const splitByReg = (text, reg) => {
  let words = text.replace(reg, '!!!BREAKWORKD!!!$1!!!BREAKWORKD!!!').replace(/^!!!BREAKWORKD!!!/, '').replace(/!!!BREAKWORKD!!!$/, '')
  return words.split('!!!BREAKWORKD!!!')
}

export const highlight = (text, word, level = false) => {
  let levelAttr = level ? ` data-level="${level}"` : ''
  if (text && word && word.trim() !== '') {
    return text
      .replace(
        new RegExp('(' + escapeRegExp(word).replace(/\*/g, '[^，。！？,!.?]+?') + ')', 'gi'),
        `<span ${levelAttr} class="highlight">$1</span>`
      )
  } else {
    return text
  }
}
export const highlightMultiple = (text, words, level) => {
  if (!words) return text
  let sortedWords = unique(words)
  sortedWords = sortedWords.sort((a, b) => b.length - a.length)
  if (text && sortedWords && sortedWords.length > 0) {
    for (let word of sortedWords) {
      text = highlight(text, word, level)
    }
    return text
  } else {
    return text
  }
}

// https://stackoverflow.com/questions/48731396/javascript-unique-string-array-case-insensitive-but-keep-one-case-sensitive-resu
export const uniqueIgnoreCase = (names) => {
  let uNames = new Map(names.map(s => [s.toLowerCase(), s]));
  return [...uNames.values()]
}

export const stripTags = (html) => {
  let root = parse(html)
  return root.textContent || root.innerHTML || ''
}

export const ucFirst = (string) => {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export const makeTextFile = (text) => {
  if (typeof window !== 'undefined') {
    var data = new Blob([text], { type: "text/plain" });
    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (textFile !== null) {
      window.URL.revokeObjectURL(textFile);
    }

    var textFile = window.URL.createObjectURL(data);
    // returns a URL you can use as a href
    return textFile;
  }
}

export const formatK = (n, dec = 2, lang = "en") => {
  if (['ko'].includes(lang)) {
    if (n >= Math.pow(10, 12)) {
      return roundTo(n / Math.pow(10, 12), dec) + "조"
    }
    if (n >= Math.pow(10, 8)) {
      return roundTo(n / Math.pow(10, 8), dec) + "억"
    }
    if (n >= Math.pow(10, 4)) {
      return roundTo(n / Math.pow(10, 4), dec) + "만"
    }
  } else if (['ja', 'zh'].includes(lang)) {
    if (n >= Math.pow(10, 12)) {
      return roundTo(n / Math.pow(10, 12), dec) + "兆"
    }
    if (n >= Math.pow(10, 8)) {
      return roundTo(n / Math.pow(10, 8), dec) + "亿"
    }
    if (n >= Math.pow(10, 4)) {
      return roundTo(n / Math.pow(10, 4), dec) + "万"
    }
  } else {
    if (n >= Math.pow(10, 12)) {
      return roundTo(n / Math.pow(10, 12), dec) + "T"
    }
    if (n >= Math.pow(10, 9)) {
      return roundTo(n / Math.pow(10, 9), dec) + "B"
    }
    if (n >= Math.pow(10, 6)) {
      return roundTo(n / Math.pow(10, 6), dec) + "M"
    }
    if (n >= Math.pow(10, 3)) {
      return roundTo(n / Math.pow(10, 3), dec) + "K"
    }
  }
  return n
}

export const removeInlineStylesFromString = (htmlString) => {
  if (typeof DOMParser === "undefined") {
    console.warn("DOMParser is not defined. Cannot remove inline styles.");
    return htmlString;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, "text/html");
  const elementsWithStyle = doc.querySelectorAll("[style]");

  elementsWithStyle.forEach((element) => {
    element.removeAttribute("style");
  });

  const serializer = new XMLSerializer();
  const updatedHtmlString = serializer.serializeToString(doc.body);
  return updatedHtmlString;
}

/*
* https://gist.github.com/yakovsh/345a71d841871cc3d375
/* @shimondoodkin suggested even a much shorter way to do this */
export const stripHebrewVowels = (rawString) => {
  return rawString.replace(/[\u0591-\u05C7]/g, "");
}

export const breakSentences = (text) => {
  text = text.replace(/([!?:。！？：;；])/g, "$1SENTENCEENDING!!!");
  text = text.replace(/(\. )/g, "$1SENTENCEENDING!!!");
  let sentences = text.split("SENTENCEENDING!!!");
  return sentences.filter((sentence) => sentence.trim() !== "");
}

// Convert ISO 8601 duration string to total seconds
export const convertDurationToSeconds = (durationStr) => {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(durationStr);

  if (!match) {
    return 0; // or you might throw an error or handle it differently
  }

  const hours = match[1] ? parseInt(match[1], 10) : 0;
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const seconds = match[3] ? parseInt(match[3], 10) : 0;

  return (hours * 3600) + (minutes * 60) + seconds;
}

// Format total seconds as a duration string
export const formatSecondsToDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  totalSeconds %= 3600;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const formattedMinutes = minutes.toString().padStart(hours ? 2 : 1, "0");
  const formattedSeconds = seconds.toString().padStart(2, "0");

  return hours ? `${hours}:${formattedMinutes}:${formattedSeconds}` : `${formattedMinutes}:${formattedSeconds}`;
}

// Convert ISO 8601 duration string to a formatted duration string
export const parseDuration = (durationStr) => {
  return formatSecondsToDuration(convertDurationToSeconds(durationStr));
}

export const timeStringToSeconds = (timeString) => {
  const timeParts = timeString.split(':').reverse();
  let totalSeconds = 0;

  if (timeParts[0]) {
    totalSeconds += parseInt(timeParts[0], 10); // seconds
  }
  if (timeParts[1]) {
    totalSeconds += parseInt(timeParts[1], 10) * 60; // minutes
  }
  if (timeParts[2]) {
    totalSeconds += parseInt(timeParts[2], 10) * 3600; // hours
  }

  return totalSeconds;
}


// Called from <EntryForms> and <WordBlock> components for Russian words

export const accent = (text) => {
  return text.replace(/'/g, "́");
}

// https://stackoverflow.com/questions/175739/how-can-i-check-if-a-string-is-a-valid-number
export const isNumeric = (str) => {
  if (typeof str != "string") return false; // we only process strings!
  return (
    !isNaN(str) && // use type coercion to parse the _entirety_ of the string (`parseFloat` alone does not do this)...
    !isNaN(parseFloat(str))
  ); // ...and ensure strings of whitespace fail
}

export const isThai = (text) => {
  let match = text.match(/[\u0E00-\u0E7F]+/g);
  return match;
}

export const isChinese = (text) => {
  return text.match(
    // eslint-disable-next-line no-irregular-whitespace
    /[\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u3005\u3007\u3021-\u3029\u3038-\u303B‌​\u3400-\u4DB5\u4E00-\u9FCC\uF900-\uFA6D\uFA70-\uFAD9]+/g
  )
}

export const hasKanji = (str) => {
  // Match Kanji characters (U+4E00 - U+9FFF)
  const kanjiRegex = /[\u4E00-\u9FFF]/;
  return kanjiRegex.test(str);
}

export const isHangul = (text) => {
  let isHangul = text.match(/[\u1100-\u11FF\u302E\u302F\u3131-\u318E\u3200-\u321E\u3260-\u327E\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uFFA0-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]+/g)
  return isHangul
}

export const containsCJKCharacters = (name) => {
  const cjkPattern = /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
  return cjkPattern.test(name);
}

export const formatName = (firstName, lastName, firstNameOnly = false) => {
  if (containsCJKCharacters(firstName) || containsCJKCharacters(lastName)) {
    return `${lastName}${firstName}`;
  } else {
    return firstNameOnly ? firstName : `${firstName} ${lastName}`;
  }
}

export const toCamelCase = (str) => {
  return str.replace(/_([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
}

export const sanitizeFilename = (filename) => {
  // remove invalid characters
  filename = filename.replace(/[\/:*?"<>|]/g, '-');

  // truncate if necessary (example: 200 characters)
  if (filename.length > 200) {
    filename = filename.slice(0, 197) + '...';
  }

  return filename;
}
