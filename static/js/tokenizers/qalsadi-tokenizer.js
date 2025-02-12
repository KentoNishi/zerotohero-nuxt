importScripts('../js/tokenizers/base-tokenizer.js')

// arabic-tokenizer.js
class QalsadiTokenizer extends BaseTokenizer {

  async tokenize(text) {
    let tokenized = this.loadFromServerCache(text);
    if (!tokenized) {
      let url = `${PYTHON_SERVER}lemmatize-arabic`;  // クエリパラメータは不要
      try {
        const response = await axios.post(url, 
          { text: text },  // POSTのペイロードとして`text`を送信
          { timeout: 5000 }
        );
        tokenized = response.data;  // 結果を `tokenized` に格納
      } catch (error) {
        console.error('QalsadiTokenizer: There was a problem with the axios operation: ', error);
      }
    }
    // Check if the tokenized is an array and not a string
    if (!tokenized || typeof tokenized === 'string') {
      return this.tokenizeLocally(text);
    }
    if (!tokenized) return this.tokenizeIntegral(text);
    let tokens = [];
    for (let lemmas of tokenized) {
      if (!lemmas[0]) {
        tokens.push(" ");
      } else if (["punc"].includes(lemmas[0].pos)) {
        tokens.push(lemmas[0].word);
        tokens.push(" ");
      } else if (
        ["all"].includes(lemmas[0].pos) &&
        isNumeric(lemmas[0].word)
      ) {
        tokens.push(lemmas[0].word);
        tokens.push(" ");
      } else {
        let token = {
          text: lemmas[0].word,
          lemmas,
          pos: lemmas[0].pos,
          pronunciation: lemmas[0].pronunciation,
        }
        tokens.push(this.normalizeToken(token));
        tokens.push(" ");
      }
    }
    return tokens;
  }
}