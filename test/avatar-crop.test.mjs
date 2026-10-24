import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCropParams } from '../src/lib/format.ts';
import { CUTE_AVATARS } from '../src/lib/avatarPresets.ts';

describe('Avatar Crop Coordinate Parsing & Proportional Scaling', () => {
  it('parses valid crop hash and scales to 240px editor canvas base', () => {
    const uri = 'https://example.com/storage/v1/object/public/avatars/user123.jpg#crop=1.40,-15,20';
    // Size 240 is 1:1 editor viewport
    const res240 = parseCropParams(uri, 240);
    assert.equal(res240.actualUri, 'https://example.com/storage/v1/object/public/avatars/user123.jpg');
    assert.equal(res240.scale, 1.4);
    assert.equal(res240.translateX, -15);
    assert.equal(res240.translateY, 20);
    assert.equal(res240.hasCrop, true);
  });

  it('proportionally scales offsets to profile header size (88px)', () => {
    const uri = 'https://example.com/avatar.jpg#crop=2.00,-30,60';
    const res88 = parseCropParams(uri, 88);
    assert.equal(res88.scale, 2.0);
    // ratio = 88 / 240 = 0.366666...
    assert.equal(res88.translateX, -30 * (88 / 240));
    assert.equal(res88.translateY, 60 * (88 / 240));
    assert.equal(res88.hasCrop, true);
  });

  it('proportionally scales offsets to directory list card size (40px)', () => {
    const uri = 'https://example.com/avatar.jpg#crop=1.50,12,-24';
    const res40 = parseCropParams(uri, 40);
    assert.equal(res40.scale, 1.5);
    // ratio = 40 / 240 = 1 / 6
    assert.equal(res40.translateX, 12 * (40 / 240));
    assert.equal(res40.translateY, -24 * (40 / 240));
    assert.equal(res40.hasCrop, true);
  });

  it('proportionally scales offsets to top bar and comment size (28px)', () => {
    const uri = 'https://example.com/avatar.jpg#crop=1.80,-12,18';
    const res28 = parseCropParams(uri, 28);
    assert.equal(res28.scale, 1.8);
    assert.equal(res28.translateX, -12 * (28 / 240));
    assert.equal(res28.translateY, 18 * (28 / 240));
  });

  it('handles uncropped image URLs cleanly without distortion', () => {
    const uri = 'https://example.com/uncropped.png';
    const res = parseCropParams(uri, 40);
    assert.equal(res.actualUri, 'https://example.com/uncropped.png');
    assert.equal(res.scale, 1);
    assert.equal(res.translateX, 0);
    assert.equal(res.translateY, 0);
    assert.equal(res.hasCrop, false);
  });

  it('handles null, undefined, or empty URLs safely', () => {
    assert.deepEqual(parseCropParams(null, 40), {
      actualUri: '',
      scale: 1,
      translateX: 0,
      translateY: 0,
      hasCrop: false,
    });
    assert.deepEqual(parseCropParams(undefined, 40), {
      actualUri: '',
      scale: 1,
      translateX: 0,
      translateY: 0,
      hasCrop: false,
    });
    assert.deepEqual(parseCropParams('', 40), {
      actualUri: '',
      scale: 1,
      translateX: 0,
      translateY: 0,
      hasCrop: false,
    });
  });

  it('safely handles malformed crop parameters without throwing NaN', () => {
    const malformed = 'https://example.com/avatar.jpg#crop=abc,def,xyz';
    const res = parseCropParams(malformed, 40);
    assert.equal(res.actualUri, 'https://example.com/avatar.jpg');
    assert.equal(res.scale, 1);
    assert.equal(res.translateX, 0);
    assert.equal(res.translateY, 0);
  });

  it('supports default avatar identifiers with crop framing', () => {
    const defaultUri = 'https://api.dicebear.com/7.x/bottts/png?seed=Felix#crop=1.25,10,-10';
    const res = parseCropParams(defaultUri, 88);
    assert.equal(res.actualUri, 'https://api.dicebear.com/7.x/bottts/png?seed=Felix');
    assert.equal(res.scale, 1.25);
    assert.equal(res.translateX, 10 * (88 / 240));
    assert.equal(res.translateY, -10 * (88 / 240));
  });
});

describe('Sculpted Avatar Presets', () => {
  it('contains exactly 16 sculpted avatars', () => {
    assert.equal(CUTE_AVATARS.length, 16);
  });

  it('each avatar has a unique sculpted id and a display name', () => {
    const ids = new Set();
    for (const a of CUTE_AVATARS) {
      assert.match(a.id, /^sculpted_(0[1-9]|1[0-6])$/);
      assert.ok(a.name && a.name.length > 0);
      assert.equal(ids.has(a.id), false, `duplicate preset id ${a.id}`);
      ids.add(a.id);
    }
  });
});
