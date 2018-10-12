'use strict';

const {send, json} = require('micro');
const request = require('request-promise');
const cheerio = require('cheerio');
const htmlToText = require('html-to-text');
const detect = require('chardet');
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

    const encoding = detect.detectAll(body);
    if (encoding[0].confidence < 50 || !iconv.encodingExists(encoding[0].name)) {
      return send(res, 400, 'an encoding issue is encountered.\n');
    }
    const $ = cheerio.load(iconv.decode(body, encoding[0].name));
    const html = $(pareto($, $('body'))).html();
    const ignoreHref = !params.keepHref;
    const text = htmlToText.fromString(html, {
      ignoreHref,
      singleNewLineParagraphs: true
    }).replace(/\n\s*\n/g, '\n').replace(/\n/g, '\n\n');

    return send(res, 200, text);
  } catch (error) {
    return send(res, 400, error.message + '\n');
  }
};
