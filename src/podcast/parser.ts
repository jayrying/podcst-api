/**
 * Helpers
 */

'use strict';

import {
  Parser,
} from 'xml2js';

/**
 * Helper funciton to parse xml to json via promises
 */
export const xmlToJSON = (xml) => {
  return new Promise((resolve, reject) => {
    const { parseString } = new Parser();
    parseString(xml, (err, res) => {
      if (err) {
        return reject(err);
      }
      return resolve(res);
    });
  });
}

/**
 * Read itunes file prop
 */
const readFile = (file) => ({
  ...file,
  length: parseInt(file.length, 10),
});

/**
 * Read data from json
 */
const readDate = (ctx) => {
  const data = ctx.pubDate || ctx.lastBuildDate;
  return data ? +(new Date(data[0])) : null;
};

/**
 * Read summary from json
 */
const readSummary = (ctx) => {
  const data = ctx['itunes:summary'] || ctx['itunes:subtitle'];
  return Array.isArray(data) ? data[0] : null;
};

/**
 * Map of index position to number of miliseconds
 */
const indexToSecondsMap = {
  0: 1,
  1: 60,
  2: 60 * 60,
};

/**
 * Read duration from json
 */
const readDuration = (ctx) => {
  const _data = ctx['itunes:duration'];
  if (!_data) {
    return null;
  }
  const data = _data[0];
  if (data.indexOf(':') === -1) {
    return parseInt(data, 10);
  }
  const vals = data.split(':').map(e => parseInt(e, 10)).reverse();
  return vals.reduce((acc, val, i) => acc + (val * indexToSecondsMap[i]), 0);
};

/**
 * Read explicit status from json
 */
const readExplicit = (ctx) => {
  const data = ctx['itunes:explicit'];
  if (!Array.isArray(data)) {
    return false;
  }
  switch(data[0]) {
    case "no":
    case "clean":
      return false;
    case "yes":
      return true;
    default:
      return false;
  }
};

/**
 * Read episode artwork if present
 */
const readEpisodeArtwork = (ctx) => {
  try {
    return ctx['media:content'][0]['$'].url;
  } catch(err) {
    return null;
  }
}

/**
 * Read keywords from json
 */
const readKeywords = (ctx) => {
  const data = ctx['itunes:keywords'];
  if (!Array.isArray(data)) {
    return [];
  }
  return data[0].split(',').map(e => e.trim());
};

/**
 * Read show notes
 */
const readShowNotes = (ctx) => {
  try {
    const data = ctx['content:encoded'][0];
    return data;
  } catch (err) {
    return null;
  }
};

/**
 * Read cover
 */
const readCover = (ctx) => {
  try {
    const data = ctx['itunes:image'];
    return data[0]['$']['href'];
  } catch (err) {
    return null;
  }
};

/**
 * Adapt episode json to formatted one
 */
const adaptEpisode = (item) => ({
  title: item.title[0],
  summary: readSummary(item),
  published: readDate(item),
  cover: readCover(item),
  explicit: readExplicit(item),
  duration: readDuration(item),
  link: Array.isArray(item.link) ? item.link[0] : null,
  file: readFile(item['enclosure'][0]['$']),
  author: Array.isArray(item['itunes:author']) ? item['itunes:author'][0] : null,
  episodeArt: readEpisodeArtwork(item),
  showNotes: readShowNotes(item) || item.description[0],
});

/**
 * Adapt json to better format
 */
export const adaptJSON = (json) => {
  try {
    const channel = json.rss.channel[0];
    return Object.assign({}, {
      title: channel.title[0],
      link: channel.link[0],
      published: readDate(channel),
      description: channel.description[0],
      author: channel['itunes:author'][0],
      cover: channel['itunes:image'][0]['$']['href'],
      keywords: readKeywords(channel),
      explicit: readExplicit(channel),
      episodes: channel['item'].map(adaptEpisode),
    });
  } catch(err) {
    console.log(err);
    return {};
  }
}
