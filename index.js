const url = require('url');
const {send, json} = require('micro');
const query = require('micro-query');
const request = require('request-promise');
const cheerio = require('cheerio');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const htmlToText = require('html-to-text');
const iconv = require('iconv-lite');

const adapter = new FileSync('sites.json');
const db = low(adapter);
const sites = db
  .defaults({sites: []})
  .get('sites');

const addOrReplaceSite = async site => {
  // Remove duplication if exists
  await sites.remove({host: site.host}).write();

  const newSite = {
    host: site.host,
    selector: site.selector,
    context: site.context
  };

  if (site.encoding) {
    newSite.encoding = site.encoding;
  }

  return sites.push(newSite).write();
};

const deleteSite = async site => {
  return sites.remove({host: site.host}).write();
};

const read = async (url, site) => {
  try {
    let body = await request({
      uri: url,
      method: 'GET',
      encoding: null
    });

    if (site.encoding && iconv.encodingExists(site.encoding)) {
      body = iconv.decode(Buffer.from(body), site.encoding);
    }

    const $ = cheerio.load(body);
    const elements = $(site.selector, site.context);

    const text = elements.map((i, el) => {
      return htmlToText.fromString($(el).html(), {
        ignoreHref: true
      });
    }).get().join('\n\n');

    return text;
  } catch (err) {
    console.log(err);
    return null;
  }
};

module.exports = async (req, res) => {
  const params = query(req);

  let site = (req.method === 'POST' || req.method === 'DELETE') ?
    await json(req) : null;
  let host = '';

  switch (req.method) {
    case 'GET':
      if (!params || !params.url) {
        return send(res, 400);
      }
      // Check if the site is supported
      host = url.parse(params.url).hostname;
      site = await sites.find({host}).value();
      if (!site) {
        return send(res, 204);
      }
      return send(res, 200, await read(params.url, site));
    case 'POST':
      if (!site || !site.host || !site.selector || !site.context) {
        return send(res, 400);
      }
      return send(res, 200, await addOrReplaceSite(site));
    case 'DELETE':
      if (!site || !site.host) {
        return send(res, 400);
      }
      return send(res, 200, await deleteSite(site));
    default:
      return send(res, 400);
  }
};
