import {
  proxy,
  unique,
  scrape,
  YOUTUBE_VIDEO_URL,
  LRC_SERVER,
  YOUTUBE_CHANNEL_PLAYLISTS_URL,
  YOUTUBE_PLAYLIST_URL,
  PYTHON_SERVER,
  IMAGE_PROXY,
} from "./utils";
import DateHelper from "./date-helper";
import axios from "axios";
import $ from "jquery";

export const CATEGORIES = {
  1: "Film & Animation",
  2: "Autos & Vehicles",
  10: "Music",
  15: "Pets & Animals",
  17: "Sports",
  18: "Short Movies",
  19: "Travel & Events",
  20: "Gaming",
  21: "Videoblogging",
  22: "People & Blogs",
  23: "Comedy",
  24: "Entertainment",
  25: "News & Politics",
  26: "How-to & Style",
  27: "Education",
  28: "Science & Technology",
  29: "Non-profits & Activism",
  30: "Movies",
  31: "Anime/Animation",
  32: "Action/Adventure",
  33: "Classics",
  34: "Comedy",
  35: "Documentary",
  36: "Drama",
  37: "Family",
  38: "Foreign",
  39: "Horror",
  40: "Sci-Fi/Fantasy",
  41: "Thriller",
  42: "Shorts",
  43: "Shows",
  44: "Trailers",
};

export const SLUG_TO_CATEGORY_ID = {
  'music': 10, // YouTube category ID, see lib/youtube.js
  'news': 25,
  'sports': 17,
  'gaming': 20,
  'how-to': 26,
  'learning': 27,
}

export default {
  videoUnavailable(youtube_id) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Handle CORS
      img.src = `${IMAGE_PROXY}?https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`;

      img.onload = function () {
        resolve(false);
      };

      img.onerror = function () {
        resolve(true)
      };
    });
  },
  // https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
  videoIdFromURL(url) {
    var regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    var match = url.match(regExp);
    return match && match[7].length == 11 ? match[7] : undefined;
  },
  playlistIdFromURL(url) {
    var reg = new RegExp("[&?]list=([a-z0-9_-]+)", "i");
    var match = reg.exec(url);
    if (match && match[1].length > 0) {
      return match[1];
    }
  },
  thumbnail(id) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  },
  async fetchTranscript(url) {
    let res = await axios.get(
      url
    );
    let lines = res.data;
    if (lines) {
      // change this: {'text': '一。', 'start': 1.603, 'duration': 1.0},
      // to this {'line': '一。', 'starttime': 1.603, 'duration': 1.0},
      lines = lines.map(line => {
        return {
          line: line.text,
          starttime: line.start,
          duration: line.duration
        }
      })
      lines = lines.sort((a, b) => a.starttime - b.starttime);
      return lines
    }
  },
  async getTranscript(
    youtube_id,
    locale,
    name,
    generated
  ) {
    let nameQuery = name ? `&name=${encodeURIComponent(name)}` : "";
    let generatedQuery = generated ? `&generated=true` : ""; // Whether or not to use auto-generated captions
    
    let url = `${PYTHON_SERVER}timedtext?v=${youtube_id}&lang=${locale}${nameQuery}&fmt=srv3${generatedQuery}`
    
    return await this.fetchTranscript(url);
  },

  async getTranslatedTranscript({
    youtube_id,
    locale,
    name,
    tlangs,
    generated
  }) {
    let nameQuery = name ? `&name=${encodeURIComponent(name)}` : "";
    let generatedQuery = generated ? `&generated=true` : ""; // Whether or not to use auto-generated captions
    if (tlangs) tlangs = tlangs.join(',');
    let url = `${PYTHON_SERVER}timedtext?v=${youtube_id}&lang=${locale}${nameQuery}&tlangs=${tlangs}&fmt=srv3${generatedQuery}`
    return await this.fetchTranscript(url);
  },

  async getTranscriptLocales(youtube_id, $l1, $l2) {
    let l2Locale = null;
    let l2Name = null;
    let l1Locale = null;

    let tracks = await this.getSubsList(youtube_id);
    if (!tracks) return { l1Locale, l2Locale, l2Name };

    let l2Locales = unique([
      $l2.code,
      ...$l2.locales,
      ...$l2.hostCountryLocales,
    ]);
    let l1Locales = unique([$l1.code, ...$l1.locales]);


    for (let track of tracks) {
      let locale = track.locale;
      let name = track.name;
      if (l2Locales.includes(locale)) {
        l2Locale = locale;
        if (name) l2Name = name;
        break;
      }
    }

    let availableLocales = tracks.map((t) => t.locale);
    let matchedL1Locales = l1Locales.filter((l) => availableLocales.includes(l));
    if (matchedL1Locales.length > 0) l1Locale = matchedL1Locales[0];

    return { l1Locale, l2Locale, l2Name };
  },

  async addTranscriptLocalesToVideo(video, $l1, $l2, cacheLife = -1) {
    const data = await this.getTranscriptLocales(
      video.youtube_id,
      $l1,
      $l2,
      cacheLife
    );
    if (!data) return;
    let { l1Locale, l2Locale, l2Name } = data;
    if (l2Locale) {
      video.hasSubs = true;
      video.l2Locale = l2Locale;
      if (l2Name) video.l2Name = l2Name;
    }
    if (l1Locale) {
      video.l1Locale = l1Locale;
    }
  },

  async getSubsList(youtube_id) {
    let res = await axios.get(
      `${PYTHON_SERVER}timedtext?v=${youtube_id}&type=list`,
    );
    let transcripts = res.data
    // transcripts is keyed by language code
    // iterate over each language code and return an array of tracks
    // We have this from the server {'video_id': 'Twfrk3kQGmQ', 'language': 'Danish',' language_code': 'da', 'is_generated': False, 'is_translatable': True}
    // We need this {'locale': 'da', 'name': 'Danish', id: 'Twfrk3kQGmQ'}

    let tracks = []
    for (let track of transcripts) {
      if (track.language) {
        tracks.push({
          locale: track.language_code,
          name: track.language,
          id: track.video_id,
          generated: track.is_generated,
          translateable: track.is_translatable
        })
      }
    }
    return tracks
  },
  searchYouTubeByProxy(searchTerm, callback) {
    $.ajax(
      LRC_SERVER +
        "proxy.php?" +
        "https://www.youtube.com/results?search_query=" +
        searchTerm.replace(/ /g, "+")
    ).done(function (response) {
      var videoIds = [];
      // We use 'ownerDocument' so we don't load the images and scripts!
      // https://stackoverflow.com/questions/15113910/jquery-parse-html-without-loading-images
      var ownerDocument = document.implementation.createHTMLDocument("virtual");
      let $html = $(response, ownerDocument);
      $html.find(".item-section li .yt-uix-tile-link").each(function () {
        if (
          !$(this).attr("href").includes("/channel/") &&
          !$(this).attr("href").includes("/user/")
        ) {
          videoIds.push(
            $(this)
              .attr("href")
              .replace("/watch?v=", "")
              .replace(/&list=.*/, "")
          );
        }
      });
      callback(videoIds);
    });
  },
  search(text, callback, options) {
    options = Object.assign({ l2: "en", subs: false, cacheLife: -1 }, options);
    let subsQueryVar = options.subs ? "&sp=EgIoAQ%253D%253D" : "";
    scrape(
      `https://www.youtube.com/results?search_query=${text.replace(
        / /g,
        "+"
      )}+lang%3A${options.l2}${subsQueryVar}`,
      options.cacheLife
    ).then(($html) => {
      if (typeof $html === "undefined") return [];
      let videos = [];
      if ($html.find(".yt-lockup-content").length > 0) {
        for (let item of $html.find(".yt-lockup-content")) {
          if (
            !$(item)
              .find(".yt-uix-sessionlink")
              .attr("href")
              .includes("/channel/") &&
            !$(item).find(".yt-uix-sessionlink").attr("href").includes("/user/")
          ) {
            let badge = $(item).find(".yt-badge")[0];
            let id = $(item)
              .find(".yt-uix-sessionlink")
              .attr("href")
              .replace("/watch?v=", "");
            let youtube = {
              id: id,
              cc: false,
              title: $(item).find(".yt-uix-sessionlink").attr("title"),
              thumbnail: this.thumbnail(id),
              url: "https://www.youtube.com/watch?v=" + id,
            };
            if (badge && ["CC", "Untertitel"].includes(badge.innerText)) {
              youtube.cc = true;
            }
            videos.push(youtube);
          }
        }
      }
      callback(videos);
    });
  },
  async searchByGoogle(options) {
    options = Object.assign(
      {
        lang: "en",
        captions: true,
        start: 0,
        forceRefresh: false,
        long: false,
      },
      options
    );
    let long = options.long ? ",dur:l" : "";
    let term = options.term ? options.term.replace(/ /g, "+") : "";
    let cc = options.captions ? ",cc:1" : "";
    let url = `https://www.google.com/search?q=${term}&start=${options.start}&lr=lang_${options.lang}&safe=active&tbs=srcf:H4sIAAAAAAAAANOuzC8tKU1K1UvOz1VLS0xOTcrPz4ZwMnNyy1OT9Apy1ErKM0tKUovAwpl5QFZmIki4ID-nOLEkL7W8GMQDAIqXaqNKAAAA${cc}${long}&tbm=vid`;
    url = url + "&gl=us"; // Make sure the results are returned in English (sometimes the scraping server is in other countries and the date is represented in a foreign language)
    let $html = await scrape(url, options.forceRefresh ? 0 : -1);
    if (typeof $html === "undefined") return [];
    let videos = [];
    let main = $html.toArray().find((element) => element.id === "main");
    for (let a of $(main).find(
      'a[href^="/url?q=https://www.youtube.com/watch"]'
    )) {
      let url = $(a)
        .attr("href")
        .replace(/\/url\?q=([^&]+).*/, "$1");
      let title = $(a)
        .find("div:first-child")
        .text()
        .replace(/ - YouTube.*/, "");
      let id = url.replace("https://www.youtube.com/watch%3Fv%3D", "");

      if (url && title && title !== "") {
        let date;
        let span = $(a).parent().parent().find("span").get(0);
        let dir = span.getAttribute("dir");
        if (dir && dir === "rtl")
          span = $(a).parent().parent().find("span").get(1);
        if (span && span.innerText) {
          let dateStr = span.innerText.trim();
          if (dateStr) {
            date = DateHelper.parseDate(dateStr);
          }
        }
        let duration;
        span = $(a).parent().parent().find("span").get(2);
        if (span && span.innerText) {
          duration = span.innerText.trim();
        }
        videos.push({
          youtube_id: id,
          cc: options.captions ? true : undefined,
          title: title,
          date,
          duration,
          thumbnail: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
        });
      }
    }
    return videos;
  },
  async videoByApi(id, cacheLife = -1) {
    let response = await axios.get(
      `${YOUTUBE_VIDEO_URL}?id=${id}&cache_life=${cacheLife}`
    );
    response = response.data;
    if (response.data.items && response.data.items.length > 0) {
      let video = response.data.items.map((item) => {
        let date = DateHelper.parseDate(item.snippet.publishedAt);
        let locale = item.snippet.defaultAudioLanguage; // e.g. zh-TW
        let views = item.statistics.viewCount || 0; // e.g. 1234
        let tags = (item.snippet.tags || []).slice(0, 10).join(","); // e.g. nhạt phan mạnh quỳnh,nhạt mv,nhạt official music video
        let made_for_kids = item.status.madeForKids ? 1 : 0; // e.g. 0
        let category = item.snippet.categoryId; // e.g. 1
        let likes = item.statistics.likeCount || 0; // e.g. 2879
        let comments = item.statistics.commentCount || 0; // e.g. 146
        let duration = item.contentDetails.duration; // e.g. PT12M28S
        let mapped = {
          data: item,
          youtube_id: id,
          title: item.snippet.title,
          channel: {
            title: item.snippet.channelTitle,
            id: item.snippet.channelId,
          },
          date,
          views,
          tags,
          made_for_kids,
          category,
          likes,
          comments,
          locale,
          duration,
        };
        return mapped;
      })[0];
      return video;
    }
  },
  async videosByApi(ids, cacheLife = -1) {
    const url = `${PYTHON_SERVER}check-youtube?youtube_ids=${ids.join(",")}`;
    let data = await proxy(url, { cacheLife });
    return data;
  },
  mapChannelPlaylistsData(item) {
    return {
      id: item.id,
      title: item.snippet ? item.snippet.title : false,
      thumbnail:
        item.snippet?.thumbnails?.default?.url || item.snippet?.thumbnails?.standard?.url,
      count: item.contentDetails ? item.contentDetails.itemCount : false,
      description: item.snippet.description,
      date: item.snippet.publishedAt,
      data: item,
    };
  },
  async channelPlayListsByAPI(
    channelID,
    cacheLife = -1,
    nextPageToken = false
  ) {
    let nextPageTokenVar = nextPageToken ? `&page_token=${nextPageToken}` : "";
    let response = await $.getJSON(
      `${YOUTUBE_CHANNEL_PLAYLISTS_URL}?channel=${channelID}${nextPageTokenVar}&cache_life=${cacheLife}`
    );
    let playlists = [];
    if (response.data && response.data.items) {
      playlists = response.data.items.map(this.mapChannelPlaylistsData);
    }
    nextPageToken = response.data.nextPageToken;
    if (nextPageToken) {
      playlists = playlists.concat(
        await this.channelPlayListsByAPI(channelID, cacheLife, nextPageToken)
      );
    }
    return playlists;
  },
  escapeZeroEx(id) {
    return id.replace(/0x/g, "ZEROEX");
  },
  async playlistByApi(id, pageToken = false, cacheLife = -1) {
    let res = await this.playlistPageByApi(id, pageToken, cacheLife);
    if (res) {
      let { playlistItems, nextPageToken, totalResults } = res;
      if (nextPageToken) {
        let data = await this.playlistByApi(id, nextPageToken);
        if (data) {
          playlistItems = playlistItems.concat(data.playlistItems);
          return { playlistItems, totalResults };
        }
      }
      return { playlistItems, totalResults };
    }
  },
  async playlistPageByApi(id, pageToken = false, cacheLife = -1) {
    let pageTokenQS = pageToken ? `&page_token=${pageToken}` : "";
    let url = `${YOUTUBE_PLAYLIST_URL}?playlist_id=${this.escapeZeroEx(
      id
    )}${pageTokenQS}&cache_life=${cacheLife}`;
    let response = await $.getJSON(url);
    let playlistItems = [];
    if (response.data) {
      if (response.data.items) {
        playlistItems = response.data.items.map((item) => {
          return {
            youtube_id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            channel_id: item.snippet.channelId,
            date: DateHelper.parseDate(item.contentDetails.videoPublishedAt),
            data: item,
          };
        });
      }
      let nextPageToken = response.data.nextPageToken;
      let totalResults = response.data.pageInfo.totalResults;
      return {
        playlistItems,
        nextPageToken,
        totalResults,
      };
    }
  },
  playlist(playlistID, callback, cacheLife = -1) {
    scrape(
      `https://www.youtube.com/playlist?list=${playlistID}`,
      cacheLife
    ).then(($html) => {
      if (typeof $html === "undefined") return;
      let playlist = {
        id: playlistID,
        title: $html.find(".pl-header-title").text().trim(),
        videos: [],
      };
      for (let item of $html.find(".pl-video.yt-uix-tile")) {
        let id = $(item).attr("data-video-id");
        let video = {
          title: $(item).attr("data-title"),
          id: id,
          thumbnail: this.thumbnail(id),
        };
        playlist.videos.push(video);
      }
      callback(playlist);
    });
  },
  channel(channelID, callback, cacheLife = -1) {
    // channelURL: https://www.youtube.com/user/TEDxTaipei https://www.youtube.com/channel/UCKFB_rVEFEF3l-onQGvGx1A
    scrape(
      `https://www.youtube.com/channel/${channelID}/videos`,
      cacheLife
    ).then(($html) => {
      if (typeof $html === "undefined") return;
      let channel = {
        id: channelID,
        title: $html.find(".branded-page-header-title-link").attr("title"),
        videos: [],
        avatar: $html.find(".channel-header-profile-image").eq(0).attr("src"),
      };
      for (let item of $html.find(".yt-lockup-content")) {
        let badge = $(item).find(".yt-badge")[0];
        let id = $(item)
          .find(".yt-uix-sessionlink")
          .attr("href")
          .replace("/watch?v=", "");
        let youtube = {
          id: id,
          cc: false,
          title: $(item).find(".yt-uix-sessionlink").attr("title"),
          thumbnail: this.thumbnail(id),
          url: "https://www.youtube.com/watch?v=" + id,
        };
        if (badge && badge.innerText === "CC") {
          youtube.cc = true;
        }
        channel.videos.push(youtube);
      }
      callback(channel);
    });
  },
  channelPlaylists(channelID, callback, cacheLife = -1) {
    // channelURL: https://www.youtube.com/user/TEDxTaipei https://www.youtube.com/channel/UCKFB_rVEFEF3l-onQGvGx1A
    scrape(
      `https://www.youtube.com/channel/${channelID}/playlists`,
      cacheLife
    ).then(($html) => {
      if (typeof $html === "undefined") return;
      let playlists = [];
      for (let item of $html.find(".yt-shelf-grid-item")) {
        if (item && $(item).find(".yt-uix-tile-link").attr("href")) {
          let playlist = {
            id: $(item)
              .find(".yt-uix-tile-link")
              .attr("href")
              .replace(/.*list=(.*)/, "$1"),
            title: $(item).find(".yt-uix-tile-link").text().trim(),
            thumbnail:
              $(item).find("[data-ytimg]").attr("data-thumb") ||
              $(item).find("[data-ytimg]").attr("src"),
            count: $(item).find(".formatted-video-count-label b").text(),
          };
          playlists.push(playlist);
        }
      }
      callback(playlists);
    });
  },
  detectYouTubeEntity(str) {
    // Regular expressions to detect YouTube video ID and playlist ID in URL
    const videoURLRegex =
      /^.*(youtu.be\/|v\/|e\/|u\/\w+\/|embed\/|v=)([^#&?]*).*/;
    const playlistURLRegex = /^.*(list=)([^#&?]*).*/;
    const youtubeIdRegex = /^[A-Za-z0-9_-]{11}$/;
    const playlistIdRegex = /^PL[A-Za-z0-9_-]{32}$/;

    let youtube_id, playlist_id;

    // Check if str is a video or playlist ID (11 characters long for videos)
    if (youtubeIdRegex.test(str)) {
      youtube_id = str;
    } else if (playlistIdRegex.test(str)) {
      playlist_id = str;
    }

    // Check if str is a valid video or playlist URL and if it is, extract the video or playlist ID
    const videoMatch = str.match(videoURLRegex);
    if (videoMatch && videoMatch[2].length === 11) {
      youtube_id = videoMatch[2];
    }
    const playlistMatch = str.match(playlistURLRegex);
    if (playlistMatch && playlistMatch[2]) {
      playlist_id = playlistMatch[2];
    }

    // Finally, make sure both youtube_id and playlist_id contains all of uppcase letters, lowercase letters, and numbers 
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (youtube_id && !regex.test(youtube_id)) {
      youtube_id = null;
    }
    if (playlist_id && !regex.test(playlist_id)) {
      playlist_id = null;
    }

    // Return an object with properties for youtube_id and playlist_id
    return { youtube_id, playlist_id };
  },
};
