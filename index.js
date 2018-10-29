'use strict';

const {send, json} = require('micro');
const request = require('request-promise');
const cheerio = require('cheerio');
const htmlToText = require('html-to-text');
const detect = require('chardet');
const iconv = require('iconv-lite');
const httpError = require('http-errors');
const logzio = require('logzio-nodejs');
const microLogzio = require('micro-logzio');

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').load();
}

const defaultParetoRatio = 0.6;
const headerNameForRequest = 'x-request-id';
const headerNameForCorrelation = 'x-correlation-id';
const logger = logzio.createLogger({
  token: process.env.LOGZIO_TOKEN,
  host: 'listener.logz.io'
});
const reqLogger = microLogzio({
  logger,
  headerNameForRequest,
  headerNameForCorrelation
});

const createContext = (req, res) => {
  const correlationId = res.getHeader(headerNameForCorrelation);
  return {correlationId};
};

const check = params => {
  const {url} = params;
  const keepHref = params.keepHref || false;
  if (!url) {
    throw httpError(400, 'url is a required parameter.');
  }
  const paretoRatio = parseFloat(params.paretoRatio) || defaultParetoRatio;
  if (paretoRatio >= 1.0 || paretoRatio <= 0.5) {
    throw httpError(400, 'paretoRatio should be a number between 0.5 and 1.0');
  }
  return {url, keepHref, paretoRatio};
};

const getContent = async (cxt, url) => {
  const headers = {};
  headers[headerNameForCorrelation] = cxt.correlationId;
  const options = {
    uri: url,
    method: 'GET',
    headers,
    encoding: null // Must set to null, otherwise request will use its default encoding
  };
  const content = await request(options);
  return content;
};

const getEncoding = content => {
  const encoding = detect.detectAll(content);
  if (encoding[0].confidence < 50 || !iconv.encodingExists(encoding[0].name)) {
    throw httpError(501, 'Can\'t recognize encoding of the web page.');
  }
  return encoding[0].name;
};

// Use Pareto's principle to determine the main element
const pareto = ($, el, p) => {
  const total = $(el).text().length;

  let candidate = el;
  $(el).children().each((i, child) => {
    if ($(child).text().length >= p * total) {
      candidate = pareto($, child);
    }
  });

  return candidate;
};

module.exports = reqLogger(async (req, res) => {
  try {
    const cxt = createContext(req, res);
    const {url, keepHref, paretoRatio} = check(await json(req));

    const content = await getContent(cxt, url);
    const encoding = getEncoding(content);

    const $ = cheerio.load(iconv.decode(content, encoding));
    const html = $(pareto($, $('body'), paretoRatio)).html();
    const text = htmlToText.fromString(html, {
      ignoreHref: !keepHref,
      singleNewLineParagraphs: true
    }).replace(/\n\s*\n/g, '\n').replace(/\n/g, '\n\n');

    return send(res, 200, text);
  } catch (error) {
    return send(res, error.statusCode || 500, error.message || 'Something wrong with the service.');
  }
});

