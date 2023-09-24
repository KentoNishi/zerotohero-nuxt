importScripts('../js/tokenizers/base-tokenizer.js')

class OpenKoreanTextTokenizer extends BaseTokenizer {
  async tokenize(text) {
    let url = `http://py.zerotohero.ca:4567/tokenize?text=${encodeURIComponent(text)}`;
    let res = await proxy(url, { timeout: 2000 }); // dictionary-utils.js
    let tokenized = res?.tokens;
    // Check if the tokenized is an array and not a string
    if (!tokenized || typeof tokenized === 'string') {
      // Try again without caching
      tokenized = await proxy(url, {cacheLife: 0, timeout: 5000});
      if (!tokenized || typeof tokenized === 'string') {
        return this.tokenizeContinua(text);
      }
    }

    let tokens = [];
    let currentPosition = 0;
    for (let token of tokenized) {
      if (!token) {
        tokens.push(" ");
      } else {
        // Check if there's a gap between the current position and the token's offset.
        if (token.offset > currentPosition) {
          tokens.push(" ");
        }

        if (token.pos === 'Punctuation' && !isHangul(token.text)) {
          tokens.push(token.text);
        } else {
          token.lemmas = [];
          if (token.stem) token.lemmas = [ { lemma: token.stem, pos: token.pos } ];
          tokens.push(this.normalizeToken(token));
        }

        // Update currentPosition to the position right after the current token.
        currentPosition = token.offset + token.text.length;
      }
    }

    // Check if there's any unprocessed text at the end.
    if (currentPosition < text.length) tokens.push(" ");

    return tokens;
  }
}