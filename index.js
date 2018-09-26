'use strict';

const {send, json} = require('micro');
const request = require('request-promise');
const cheerio = require('cheerio');
const htmlToText = require('html-to-text');
const detect = require('detect-character-encoding');
const iconv = require('iconv-lite');

// Use Pareto's principle to determine the main element
const pareto = ($, el) => {
  const total = $(el).text().length;

  let candidate = el;
  $(el).children().each((i, child) => {
    if ($(child).text().length >= 0.8 * total) {
      candidate = pareto($, child);
    }
  });

  return candidate;
};

module.exports = async (req, res) => {
  try {
    const params = await json(req);
    if (!params.url) {
      return send(res, 400, 'url is expected.\n');
    }

    const body = await request({
      uri: params.url,
      method: 'GET',
      encoding: null // Must set to null, otherwise request will use its default encoding
    });

    const {encoding, confidence} = detect(body);
    const $ = iconv.encodingExists(encoding) && confidence > 50 ?
      cheerio.load(iconv.decode(body, encoding)) :
      cheerio.load(await request(params.url));
    const text = htmlToText.fromString($(pareto($, $('body'))).html(), {
      ignoreHref: true,
      singleNewLineParagraphs: true
    }).replace(/\n\s*\n/g, '\n').replace(/\n/g, '\n\n');

    return send(res, 200, text);
  } catch (error) {
    return send(res, 400, error.message + '\n');
  }
};
