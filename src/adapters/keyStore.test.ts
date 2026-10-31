import test from 'node:test';
import assert from 'node:assert/strict';
import { QuotaExceededError } from './keyStore';

test('QuotaExceededError correctly carries code, details, and message', () => {
  const err = new QuotaExceededError(
    'نفد رصيد حساب OpenRouter للوضع الحي.',
    'INSUFFICIENT_CREDITS',
    'User has insufficient credits or credit balance is too low'
  );

  assert.equal(err.name, 'QuotaExceededError');
  assert.equal(err.code, 'INSUFFICIENT_CREDITS');
  assert.equal(err.message, 'نفد رصيد حساب OpenRouter للوضع الحي.');
  assert.equal(err.details, 'User has insufficient credits or credit balance is too low');
});
