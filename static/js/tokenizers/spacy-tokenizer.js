importScripts('../js/tokenizers/base-tokenizer.js')

class SpacyTokenizer extends BaseTokenizer {
  
  async tokenize(text) {
    let tokens = [];
    
    let langCode = this.l2["iso639-3"] || this.l2["glottologId"];
    if (langCode === "nor") langCode = "nob"; // Use Bokmål for Norwegian

    let tokenized = this.loadFromServerCache(text); // L2 is taken care of in the base class
    if (!tokenized) { 
      let url = `${PYTHON_SERVER}lemmatize-spacy?lang=${langCode}&text=${encodeURIComponent(text)}`;
      try {
        const response = await axios.get(url, { timeout: 5000 });
        tokenized = response.data;
      } catch (error) {
        console.error('There was a problem with the axios operation: ', error);
      }
    }
    
    // Check if the tokenized is an array and not a string
    if (!tokenized || typeof tokenized === 'string') {
      return this.tokenizeLocally(text);
    }
    for (let token of tokenized) {
      if (!token) {
        // do nothing
      } else if (["PUNCT"].includes(token.pos)) {
        tokens.push(token.word);
      } else {
        tokens.push(this.normalizeToken(token));
      }
    }
    return this.recoverSpaces(tokens, text);
  }
}