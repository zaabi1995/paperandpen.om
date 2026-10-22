// The signup form's module prices come from the API; this is the mapping. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_ORDER, SIGNUP_MODULES, withLivePrices } from '../src/lib/signupModules.ts';
import { validList } from '../scripts/fetch_signup_modules.mjs';

const price = (list: { key: string; price: number }[], key: string) => list.find((m) => m.key === key)?.price;

test('the build-time list covers every module the form shows, in order', () => {
  assert.deepEqual(SIGNUP_MODULES.map((m) => m.key), MODULE_ORDER);
});

test('a live price replaces the build-time price', () => {
  const list = withLivePrices([{ code: 'hr', priceOMR: 9 }]);
  assert.equal(price(list, 'hr'), 9);
  assert.equal(price(list, 'inventory'), price(SIGNUP_MODULES, 'inventory'));
  assert.equal(list.length, MODULE_ORDER.length);
});

test('a code the site has no words for stays off the form', () => {
  const list = withLivePrices([{ code: 'car_care', priceOMR: 25 }]);
  assert.equal(price(list, 'car_care'), undefined);
  assert.equal(list.length, MODULE_ORDER.length);
});

test('the build-time fetch keeps only well-formed rows', () => {
  const rows = validList({ result: [{ code: 'hr', priceOMR: 8, label: 'x' }, { code: 'bad', priceOMR: '3' }, null] });
  assert.deepEqual(rows, [{ code: 'hr', priceOMR: 8 }]);
  assert.deepEqual(validList({}), []);
});
