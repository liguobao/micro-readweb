'use strict';

const {send, json} = require('micro');
const phantom = require('phantom');
const cheerio = require('cheerio');
const htmlToText = require('html-to-text');
const httpError = require('http-errors');
const Timeout = require('await-timeout');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const defaultParetoRatio = 0.6;

const check = params => {
  const {url, timeout} = params;
  const keepHref = params.keepHref || false;
  if (!url) {
    throw httpError(400, 'url is a required parameter.');
  }
  const paretoRatio = parseFloat(params.paretoRatio) || defaultParetoRatio;
  if (paretoRatio >= 1.0 || paretoRatio <= 0.5) {
    throw httpError(400, 'paretoRatio should be a number between 0.5 and 1.0');
  }
  return {url, keepHref, paretoRatio, timeout};
};

const getContent = async (url, timeout) => {
  const instance = await phantom.create();
  const page = await instance.createPage();

  const timer = new Timeout();
  try {
    const status = await page.open(url);
    if (status !== 'success') {
      console.log(status);
      await instance.exit();
      throw httpError(500, 'Error occurred when reading the page.');
    }

    if (timeout) {
      await timer.set(timeout);
    }

    const content = await page.property('content');
    await instance.exit();
    return content;
  } finally {
    timer.clear();
  }
};

// Use Pareto's principle to determine the main element
const pareto = ($, el, p) => {
  const total = $(el).text().length;

  let candidate = el;
  $(el).children().each((i, child) => {
    if ($(child).text().length >= p * total) {
      candidate = pareto($, child, p);
    }
  });

  return candidate;
};

module.exports = async (req, res) => {
  try {
    const {url, keepHref, paretoRatio, timeout} = check(await json(req));

    const content = await getContent(url, timeout);
    const $ = cheerio.load(content);
    const html = $(pareto($, $('body'), paretoRatio)).html();
    const text = htmlToText.fromString(html, {
      ignoreHref: !keepHref,
      singleNewLineParagraphs: true
    }).replace(/\n\s*\n/g, '\n').replace(/\n/g, '\n\n');

    return send(res, 200, text);
  } catch (error) {
    return send(res, error.statusCode || 500, error.message || 'Something wrong with the service.');
  }
};

