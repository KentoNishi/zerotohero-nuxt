importScripts("../vendor/localforage/localforage.js");
importScripts("../js/base-dictionary.js");

class HskCedictDictionary extends BaseDictionary {
  constructor({ l1 = undefined, l2 = undefined } = {}) {
    super({l1, l2});
    this.cedictFile = `${SERVER}/data/hsk-cedict/hsk_cedict.csv.txt`;
    this.characterFile = `${SERVER}/data/hsk-cedict/hsk_characters.csv.txt`;
    this.newHSKFile = `${SERVER}/data/hsk-cedict/new_hsk.csv.txt`;
    this.version = "1.1.11";
    this.hskStandardCourseWords = {}; // a tree structure by book, lesson, and dialog
    this.characters = [];
    this.newHSK = [];
    this.maxWeight = 0;
    this.traditionalIndex = {};
  }

  credit() {
    return 'The Chinese dictionary is provided by <a href="https://www.mdbg.net/chinese/dictionary?page=cedict">CC-CEDICT</a>, open-source and distribtued under a <a href="https://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>. We also added HSK information on top.';
  }

  async loadData() {
    // const server =  `${process.env.baseUrl}/`
    let [words, characters, newHSK] = await Promise.all([
      this.loadAndNormalizeDictionaryData({
        name: "hsk_cedict",
        file: this.cedictFile,
      }),
      this.loadDictionaryData({
        name: "hsk_characters",
        file: this.characterFile,
      }),
      this.loadDictionaryData({
        name: "new_hsk",
        file: this.newHSKFile,
      }),
    ]);
    for (let row of words) {
      row.rank = row.weight / this.maxWeight;
      this.compileHSKStandardCourseWords(row);
    }
    this.words = words;
    this.characters = characters;
    this.newHSK = newHSK;
    this.createIndices();
  }

  compileHSKStandardCourseWords(word) {
    let { book, lesson, dialog } = word;
    if (book && lesson && dialog) {
      this.hskStandardCourseWords[book] =
        this.hskStandardCourseWords[book] || {};
      this.hskStandardCourseWords[book][lesson] =
        this.hskStandardCourseWords[book][lesson] || {};
      this.hskStandardCourseWords[book][lesson][dialog] =
        this.hskStandardCourseWords[book][lesson][dialog] || [];
      this.hskStandardCourseWords[book][lesson][dialog].push(word);
    }
  }
  getHSKStandardCourseWords() {
    return this.hskStandardCourseWords;
  }

  createIndices() {
    super.createIndices();
    for (let word of this.words) {
      for (let indexType of ["traditional"]) {
        if (!Array.isArray(this[indexType + "Index"][word[indexType]]))
          this[indexType + "Index"][word[indexType]] = [];
        this[indexType + "Index"][word[indexType]] =
          this[indexType + "Index"][word[indexType]].concat(word);
      }
    }
  }

  getNewHSK() {
    if (this.newHSKCrunched) return this.newHSKCrunched;
    else {
      let newHSK = this.newHSK;
      let newHSKWordsFlattened = newHSK
        .map((row) => row.simplified)
        .reduce((a, b) => a + b, "");
      let subdict = this.subdictFromText(newHSKWordsFlattened);
      for (let newHSKWord of newHSK) {
        let matchedWords = subdict.lookupSimplified(
          newHSKWord.simplified,
          newHSKWord.pinyin
        );
        if (matchedWords && matchedWords[0]) {
          let { hsk, pinyin, id, definitions } = matchedWords[0];
          newHSKWord = Object.assign(newHSKWord, { hsk, id });
        }
      }
      this.newHSKCrunched = newHSK; // Cache this
      newHSKWordsFlattened = null;
      subdict = null;
      return this.newHSKCrunched;
    }
  }

  getByNewHSK(level, num) {
    let match = this.newHSK.find(
      (word) => word.level === level && Number(word.num) === num
    );
    let words = this.lookupSimplified(
      match.simplified,
      match.pinyin,
      match.definitions
    );
    if (words.length === 0)
      words = this.lookupSimplified(match.simplified, match.pinyin);
    if (words.length === 0) words = this.lookupSimplified(match.simplified);
    if (words && words.length > 0) {
      return words[0];
    }
  }

  getNewLevel(word) {
    return this.newHSK.filter(
      (row) =>
        row.simplified === word.simplified &&
        row.pinyin == word.pinyin &&
        row.definitions.includes(word.definitions[0])
    );
  }

  addNewHSK(word) {
    let newHSKMatches = this.getNewLevel(word) || [];
    let newHSK = this.unique(newHSKMatches.map((word) => word.level)).join("/");
    return Object.assign(word, {
      newHSKMatches,
      newHSK,
    });
  }

  getByHSKId(hskId) {
    let word = this.words.find((row) => row.hskId === hskId);
    return this.addNewHSK(word);
  }

  getByBookLessonDialog(book, lesson, dialog) {
    let words = this.words.filter(
      (row) =>
        parseInt(row.book) === parseInt(book) &&
        parseInt(row.lesson) === parseInt(lesson)
    );
    if (dialog)
      words = words.filter(
        (row) => row.dialog.toString() === dialog.toString()
      );
    return words;
  }

  lookupByLesson(level, lesson) {
    level = String(level);
    lesson = String(lesson);
    return this.words.filter(
      (row) => row.hsk === level && row.lesson === lesson
    );
  }

  lookupByCharacter(char) {
    return this.words.filter((row) => row.simplified.includes(char));
  }

  lookupByPronunciation(pinyin) {
    return this.words.filter(
      (row) =>
        removeTones(row.pinyin).replace(/ /g, "") ===
        removeTones(pinyin).replace(/ /g, "")
    );
  }

  lookupSimplified(simplified, pinyin = false, definitions = false) {
    const candidates = this.words
      .filter((row) => {
        let pinyinMatch = pinyin ? row.pinyin === pinyin : true;
        let defMatch = definitions
          ? definitions.includes(row.definitions[0])
          : true;
        return pinyinMatch && defMatch && row.simplified === simplified;
      })
      .sort((a, b) => {
        return b.weight - a.weight;
      });
    return candidates.map((candidate) => this.addNewHSK(candidate));
  }

  lookupTraditional(traditional, pinyin = false) {
    const candidates = this.words
      .filter((row) => {
        let pinyinMatch = true;
        if (pinyin.length > 0) {
          pinyinMatch = row.pinyin === pinyin;
        }
        return pinyinMatch && row.traditional === traditional;
      })
      .sort((a, b) => {
        return b.weight - a.weight;
      });
    return candidates.map((candidate) => this.addNewHSK(candidate));
  }

  lookupByPattern(pattern) {
    // pattern like '～体'
    var results = [];
    if (pattern.includes("～")) {
      const regexPattern = "^" + pattern.replace(/～/gi, ".+") + "$";
      const regex = new RegExp(regexPattern);
      results = this.words.filter(
        (word) =>
          regex.test(word.simplified) &&
          word.oofc === "" &&
          word.hsk != "outside"
      );
    } else {
      results = this.words.filter(
        (word) =>
          word.simplified.includes(pattern) &&
          word.oofc === "" &&
          word.hsk != "outside"
      );
    }
    return results;
  }

  processCounters(definitions) {
    let counters = [];
    definitions.forEach((definition, index) => {
      if (definition.startsWith("CL")) {
        definition
          .replace("CL:", "")
          .split(",")
          .forEach((counter) => {
            let c = {
              pinyin: counter.replace(/.*\[(.*)\]/, "$1"),
            };
            let t = counter.replace(/\[(.*)\]/, "").split("|");
            c.simplified = t[t.length - 1];
            c.traditional = t[0];
            counters.push(c);
          });
        definitions[index] = null;
      }
    });
    return [counters, definitions.filter((def) => def)];
  }

  determinePos(definition) {
    if (definition.startsWith("to ")) return "verb";
    if (definition.startsWith("a ") || definition.startsWith("the "))
      return "noun";
    if (definition.startsWith("surname ") || /^[A-Z].*/.test(definition))
      return "proper noun";
    return undefined;
  }

  normalizeWord(row) {
    if (
      row.definitions.includes("surname ") ||
      row.definitions.startsWith("variant") ||
      row.definitions.startsWith("old variant") ||
      row.traditional.startsWith("妳")
    ) {
      row.weight = -1;
    }

    let definitions = row.definitions.split("/");
    let pos = definitions[0] ? this.determinePos(definitions[0]) : undefined;

    Object.assign(row, {
      id: `${row.traditional},${row.pinyin.replace(/ /g, "_")},${row.index}`,
      bare: row.simplified,
      head: row.simplified,
      accented: row.simplified,
      weight: Number(row.weight),
      cjk: {
        canonical:
          row.traditional && row.traditional !== "NULL"
            ? row.traditional
            : undefined,
        phonetics: row.pinyin,
      },
      pronunciation: row.pinyin,
      definitions,
      search: removeTones(row.pinyin.replace(/ /g, "")),
      level: row.hsk,
      pos,
    });

    const [counters, remainingDefinitions] = this.processCounters(row.definitions);
    if (counters.length > 0) {
      row.counters = counters;
      if (!row.pos) row.pos = "noun";
    }

    row.definitions = remainingDefinitions;
    this.maxWeight = Math.max(row.weight, this.maxWeight);
  }

  lookupHSKChar(simplified) {
    return this.characters.find((row) => row.word === simplified);
  }

  listCharacters() {
    return this.characters;
  }
}