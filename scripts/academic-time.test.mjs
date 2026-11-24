import test from 'node:test';
import assert from 'node:assert/strict';
import { brasiliaInput, brasiliaInstant } from '../src/lib/academic.ts';

test('Brasília calendar stays on the local date after UTC midnight', () => {
  assert.equal(brasiliaInput('2026-11-12T02:59:00.000Z'), '2026-11-11T23:59');
  assert.equal(brasiliaInput('2026-11-12T03:00:00.000Z'), '2026-11-12T00:00');
});

test('teacher deadlines preserve the selected day and minute', () => {
  assert.equal(brasiliaInstant('2026-11-11T23:45'), '2026-11-12T02:45:00.000Z');
  assert.equal(brasiliaInstant('2026-02-30T18:00'), null);
  assert.equal(brasiliaInstant('2026-11-11T24:00'), null);
  assert.equal(brasiliaInstant('2026-11-11T18:00Z'), null);
});
