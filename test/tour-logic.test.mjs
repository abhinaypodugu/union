// Pure tour helpers: setup eligibility, division-channel selection, and the
// editable introduction template. No React Native imports, so these run fast.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_SETUP_PROGRESS,
  buildIntroMessage,
  isSetupEligible,
  pendingSetupKey,
  pickIntroGroup,
  setupProgressKey,
} from '../src/tour/logic.ts';

const member = {
  status: 'verified',
  setupVersion: 0,
  name: 'Asha Rao',
  designation: 'Postal Assistant',
  officeEmployed: 'Sitaphalmandi SO',
  division: 'Hyderabad',
  unit: 'Hyderabad',
};

describe('setup story helpers', () => {
  it('only auto-starts for verified members on setup version 0', () => {
    assert.equal(isSetupEligible(member), true);
    assert.equal(isSetupEligible({ ...member, setupVersion: 1 }), false);
    assert.equal(isSetupEligible({ ...member, setupVersion: undefined }), false, 'an unmigrated backend must not onboard existing users');
    assert.equal(isSetupEligible({ ...member, status: 'pending' }), false);
    assert.equal(isSetupEligible(null), false);
  });

  it('prefers the division channel and falls back to any writable channel', () => {
    const groups = [{
      section: 'Union Channels',
      items: [
        { id: 'org', name: 'BPEF', kind: 'Union', icon: 'globe', tone: 'geo', scope: 'org', value: null },
        { id: 'div', name: 'Hyderabad Division', kind: 'Division', icon: 'briefcase', tone: 'group', scope: 'local', value: 'Hyderabad' },
        { id: 'circle', name: 'Telangana Circle', kind: 'Circle', icon: 'map-pin', tone: 'geo', scope: 'region', value: 'Telangana' },
      ],
    }];
    const division = pickIntroGroup(groups, (scope) => scope !== 'region');
    assert.equal(division?.id, 'div');
    assert.equal(pickIntroGroup(groups, () => false), null);
    assert.equal(pickIntroGroup(groups, (scope) => scope === 'org')?.id, 'org');
  });

  it('builds a short editable introduction with safe fallbacks', () => {
    assert.equal(
      buildIntroMessage(member),
      "Namaste everyone, I'm Asha — Postal Assistant at Sitaphalmandi SO. Glad to connect with you all here."
    );
    assert.equal(
      buildIntroMessage({ ...member, designation: '', officeEmployed: '' }),
      "Namaste everyone, I'm Asha — a member at Hyderabad. Glad to connect with you all here."
    );
    assert.equal(
      buildIntroMessage({ ...member, designation: 'Member' }),
      "Namaste everyone, I'm Asha — a member at Sitaphalmandi SO. Glad to connect with you all here."
    );
  });

  it('scopes progress keys per member and step', () => {
    assert.equal(setupProgressKey('profile-1', 'avatar'), 'app-tour:profile-1:setup-progress:avatar');
    assert.equal(pendingSetupKey('profile-1'), 'app-tour:profile-1:pending-setup');
    assert.deepEqual(EMPTY_SETUP_PROGRESS, { avatar: false, details: false, intro: false });
  });
});
