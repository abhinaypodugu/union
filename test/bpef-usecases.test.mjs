import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeSafePostalProfile, normalizeDobToIso } from '../src/lib/format.ts';
import { DEFAULT_TERMINOLOGY } from '../src/store/types.ts';

describe('BPEF Profile Safe Updates & Field Locking Use Cases', () => {
  const existingMember = {
    id: 'm-101',
    name: 'B Narasing Rao',
    employeeId: '1011124',
    designation: 'Member',
    category: 'Supervisors',
    dob: '1972-04-06',
    officeEmployed: 'Sitaphalmandi SO',
    division: 'Secunderabad',
    circle: 'Telangana',
    unit: 'Secunderabad',
    region: 'Telangana',
    avatarUrl: 'https://example.com/avatar.jpg',
  };

  it('regular member cannot overwrite employeeId, designation, or category', () => {
    // Member attempts to tamper with their designation and staff ID during workplace update
    const untrustedPayload = {
      employeeId: '9999999',
      designation: 'General Secretary',
      category: 'GDS',
      division: 'Warangal',
      circle: 'Telangana',
      officeEmployed: 'Warangal HPO',
    };

    const safeResult = computeSafePostalProfile(untrustedPayload, existingMember, false);

    // Locked governance fields must NOT change
    assert.equal(safeResult.employeeId, '1011124');
    assert.equal(safeResult.designation, 'Member');
    assert.equal(safeResult.category, 'Supervisors');

    // Workplace fields ARE updated
    assert.equal(safeResult.division, 'Warangal');
    assert.equal(safeResult.unit, 'Warangal');
    assert.equal(safeResult.circle, 'Telangana');
    assert.equal(safeResult.region, 'Telangana');
    assert.equal(safeResult.officeEmployed, 'Warangal HPO');
  });

  it('admin is authorized to update designation, employeeId, and category', () => {
    const adminPayload = {
      employeeId: '1011124',
      designation: 'Division Secretary',
      category: 'Supervisors',
      division: 'Secunderabad',
      circle: 'Telangana',
      officeEmployed: 'Sitaphalmandi SO',
    };

    const safeResult = computeSafePostalProfile(adminPayload, existingMember, true);

    // Admin updates permitted
    assert.equal(safeResult.designation, 'Division Secretary');
    assert.equal(safeResult.employeeId, '1011124');
    assert.equal(safeResult.category, 'Supervisors');
  });

  it('updating division and circle synchronizes unit and region', () => {
    const update = {
      division: 'Hyderabad City',
      circle: 'Telangana',
      officeEmployed: 'Hyderabad GPO',
    };
    const result = computeSafePostalProfile(update, existingMember, false);
    assert.equal(result.division, 'Hyderabad City');
    assert.equal(result.unit, 'Hyderabad City');
    assert.equal(result.circle, 'Telangana');
    assert.equal(result.region, 'Telangana');
  });

  it('updating avatarUrl preserves all other fields', () => {
    const update = {
      avatarUrl: 'https://example.com/new_avatar.jpg#crop=1.20,-10,15',
    };
    const result = computeSafePostalProfile(update, existingMember, false);
    assert.equal(result.avatarUrl, 'https://example.com/new_avatar.jpg#crop=1.20,-10,15');
    assert.equal(result.employeeId, existingMember.employeeId);
    assert.equal(result.division, existingMember.division);
    assert.equal(result.officeEmployed, existingMember.officeEmployed);
  });
});

describe('DOB ISO Conversion for PostgreSQL DATE Column', () => {
  it('converts DD-MM-YYYY to YYYY-MM-DD', () => {
    assert.equal(normalizeDobToIso('06-04-1972'), '1972-04-06');
    assert.equal(normalizeDobToIso('31-12-1985'), '1985-12-31');
    assert.equal(normalizeDobToIso('01-01-2000'), '2000-01-01');
  });

  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    assert.equal(normalizeDobToIso('15/08/1947'), '1947-08-15');
    assert.equal(normalizeDobToIso('26/01/1950'), '1950-01-26');
  });

  it('keeps valid ISO YYYY-MM-DD intact', () => {
    assert.equal(normalizeDobToIso('1972-04-06'), '1972-04-06');
    assert.equal(normalizeDobToIso('1990-11-20'), '1990-11-20');
  });

  it('returns null for malformed or empty dates', () => {
    assert.equal(normalizeDobToIso(''), null);
    assert.equal(normalizeDobToIso('   '), null);
    assert.equal(normalizeDobToIso(null), null);
    assert.equal(normalizeDobToIso(undefined), null);
    assert.equal(normalizeDobToIso('invalid-date'), null);
    assert.equal(normalizeDobToIso('12345'), null);
  });
});

describe('Single-Organization BPEF Platform Configuration', () => {
  it('BPEF terminology is correctly configured', () => {
    assert.equal(DEFAULT_TERMINOLOGY.orgLabel, 'Union');
    assert.equal(DEFAULT_TERMINOLOGY.groupLabel, 'Affiliated Association');
    assert.equal(DEFAULT_TERMINOLOGY.level1Label, 'Division');
    assert.equal(DEFAULT_TERMINOLOGY.level2Label, 'Circle');
    assert.equal(DEFAULT_TERMINOLOGY.level3Label, 'All India');
    assert.equal(DEFAULT_TERMINOLOGY.caseLabel, 'Grievance');
  });

  it('levels are structured as Division L1, Circle L2, All India L3', () => {
    const levels = DEFAULT_TERMINOLOGY.levels || [];
    assert.equal(levels.length, 3);
    assert.equal(levels[0].level, 1);
    assert.equal(levels[0].label, 'Division');
    assert.equal(levels[1].level, 2);
    assert.equal(levels[1].label, 'Circle');
    assert.equal(levels[2].level, 3);
    assert.equal(levels[2].label, 'All India');
  });
});
