'use strict';

const micro = require('micro');
const test = require('ava');
const listen = require('test-listen');
const request = require('request-promise');

const service = require('.');

let s = null;
let u = null;

const testRead = async (t, url, contains = null, timeout = null) => {
  try {
    const content = await request.post(u).json({url, timeout});
    if (contains) {
      t.true(content.indexOf(contains) >= 0);
      return;
    }
    t.pass();
  } catch (error) {
    t.fail();
  }
};

test.before(async t => {
  s = micro(service);
  u = await listen(s);
  t.pass();
});

test.after('close service', t => {
  s.close();
  t.pass();
});

test('gbk', async t => {
  const url = 'http://www.biquge.com.tw/3_3410/1939763.html';
  await testRead(t, url);
});

test('utf8, compressed', async t => {
  const url = 'https://www.80txt.com/txtml_40079.html';
  await testRead(t, url);
});

test('gb2312, compressed', async t => {
  const url = 'http://www.jjwxc.net/onebook.php?novelid=1469663';
  await testRead(t, url);
});

test('ajax loaded content', async t => {
  const url = 'https://book.qidian.com/info/2083259#Catalog';
  await testRead(t, url, '第一章', 5000);
});
