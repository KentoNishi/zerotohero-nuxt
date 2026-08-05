// export default = 'http://hsk-server.local:8888/'
export const SERVER = 'https://server.chinesezerotohero.com/'

// export const LRC_SERVER = 'http://lyrics-search.local:8888/'
export const LRC_SERVER = 'https://lyrics-search.chinesezerotohero.com/'

/**
 * Python/Flask backend URL.
 *
 * Defaults to production. Override per-environment without committing:
 *   - Local dev: add `PYTHON_SERVER=http://127.0.0.1:5001/` to a `.env` file
 *     (gitignored) or prefix the dev command, e.g.
 *     PYTHON_SERVER=http://127.0.0.1:5001/ npm run dev
 *   - Production builds keep the fallback below.
 *
 * nuxt.config.js bakes the same resolved value into the client bundle via the
 * `env` block, so the nuxt-auth login/refresh/logout URLs stay in sync.
 */
export const PYTHON_SERVER =
  process.env.PYTHON_SERVER || 'https://python.zerotohero.ca/'
// export const PYTHON_SERVER = 'https://pythonvps.zerotohero.ca/' // Same server, different domain

export const CHINESE_ZERO_TO_HERO = 'https://www.chinesezerotohero.com/'
export const ENGLISH_ZERO_TO_HERO = 'https://m.cctalk.com/inst/stevmab3'

export const WEB_URL = 'https://languageplayer.io/'

export const server = SERVER
export const sketchEngineProxy = SERVER + 'sketch-engine-proxy.php'
export const PROXY_URL = SERVER + 'proxy.php'
export const jsonProxy = SERVER + 'json-proxy.php'
export const SCRAPE_URL = SERVER + 'scrape2.php'
export const IMAGE_PROXY = SERVER + 'image.php'
export const SAVE_PHOTO_URL = SERVER + 'save-photo.php'
export const YOUTUBE_VIDEO_URL = SERVER + 'youtube-video.php'
export const YOUTUBE_PLAYLIST_URL = SERVER + 'youtube-playlist.php'
export const YOUTUBE_CHANNEL_PLAYLISTS_URL = SERVER + 'youtube-channel-playlists.php'
export const IMAGE_URL = SERVER + 'data/word-images/'
export const ANIMATED_SVG_URL = SERVER + 'data/char-stroke-svgs/'
