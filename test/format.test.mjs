// Unit tests for the app's pure helpers. Imports the real TypeScript source
// (Node's --experimental-strip-types), unlike the previous tests which re-implemented
// app logic inline and asserted against the copy.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dueInfo, errorMessage, median, normalizePhoneNumber, notificationHref, relativeTime } from '../src/lib/format.ts';

describe('normalizePhoneNumber', () => {
  it('defaults 10-digit numbers to +91', () => {
    assert.deepEqual(normalizePhoneNumber('98765 43210'), { normalized: '+919876543210', digits: '919876543210' });
  });
  it('keeps explicit country codes', () => {
    assert.deepEqual(normalizePhoneNumber('+1 (415) 555-0100'), { normalized: '+14155550100', digits: '14155550100' });
  });
  it('handles empty input', () => {
    assert.deepEqual(normalizePhoneNumber('  '), { normalized: '', digits: '' });
  });
});

describe('dueInfo (deadline display from server due_at)', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  it('no deadline', () => assert.deepEqual(dueInfo(null, now), { due: '—', dueState: 'ok' }));
  it('overdue', () => assert.equal(dueInfo('2026-10-13T09:00:00Z', now).dueState, 'overdue'));
  it('due soon (<24h)', () => assert.deepEqual(dueInfo('2026-10-13T18:00:00Z', now), { due: 'Due in 6h', dueState: 'soon' }));
  it('due later', () => assert.deepEqual(dueInfo('2026-10-16T12:00:00Z', now), { due: 'Due in 3d', dueState: 'ok' }));
});

describe('relativeTime', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  it('formats recent times', () => {
    assert.equal(relativeTime('2026-10-13T11:59:40Z', now), 'Just now');
    assert.equal(relativeTime('2026-10-13T11:30:00Z', now), '30m');
    assert.equal(relativeTime('2026-10-13T07:00:00Z', now), '5h');
    assert.equal(relativeTime('2026-10-11T12:00:00Z', now), '2d');
  });
});

describe('median', () => {
  it('odd/even/empty', () => {
    assert.equal(median([3, 1, 2]), 2);
    assert.equal(median([1, 2, 3, 4]), 2.5);
    assert.equal(median([]), null);
    assert.equal(median([NaN, 4]), 4);
  });
});

describe('notificationHref (deep links)', () => {
  it('maps case ids and passes through routes', () => {
    assert.equal(notificationHref('ORGA-1001'), '/issue?id=ORGA-1001');
    assert.equal(notificationHref('/manage/case?id=ORGA-1'), '/manage/case?id=ORGA-1');
    assert.equal(notificationHref(null), undefined);
  });
});

describe('errorMessage', () => {
  it('strips Postgres prefixes', () => {
    assert.equal(errorMessage({ message: 'ERROR: Only verified members can raise issues' }), 'Only verified members can raise issues');
    assert.equal(errorMessage(null), 'Something went wrong');
  });
});
