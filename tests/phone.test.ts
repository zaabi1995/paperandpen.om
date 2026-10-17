// The signup form's WhatsApp number rule. Run: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, phoneProblem, PHONE_PREFIX } from '../src/lib/phone.ts';

test('an Oman number is stored with +968', () => {
  for (const raw of ['91234567', '9123 4567', '+968 9123 4567', '00968 91234567', '091234567']) {
    assert.equal(normalizePhone(raw), '+96891234567', raw);
  }
});

test('a number in another country keeps its own code', () => {
  assert.equal(normalizePhone('+44 7700 900123'), '+447700900123');
  assert.equal(normalizePhone('+971 50 123 4567'), '+971501234567');
});

test('the untouched prefix or an empty field asks for the number', () => {
  assert.equal(phoneProblem(PHONE_PREFIX), 'phoneRequired');
  assert.equal(phoneProblem(''), 'phoneRequired');
  assert.equal(phoneProblem('+968'), 'phoneRequired');
});

test('fewer than 8 digits, or more than 15, is not a number', () => {
  assert.equal(phoneProblem('1234567'), 'phoneInvalid');
  assert.equal(phoneProblem('+968 9123'), 'phoneInvalid');
  assert.equal(phoneProblem('1234567890123456'), 'phoneInvalid');
});

test('a good number has no problem', () => {
  assert.equal(phoneProblem('+968 9123 4567'), null);
  assert.equal(phoneProblem('+44 7700 900123'), null);
});
