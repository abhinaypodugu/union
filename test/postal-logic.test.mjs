import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSecunderabadLocation } from '../src/lib/location.ts';
import { getDivisionsForCircle, getOfficesForDivision, POSTAL_CIRCLES } from '../src/lib/postalData.ts';
import { AFFILIATED_ASSOCIATIONS, DEFAULT_POSTAL_CADRES, UNION_DESIGNATIONS } from '../src/store/types.ts';
import { isLeadershipDesignation } from '../src/lib/format.ts';

describe('Postal Geolocation & Disambiguation Logic', () => {
  it('identifies Secunderabad from postal PIN codes', () => {
    // 500003: Secunderabad HPO, 500025: Sitaphalmandi, 500061: Sitaphalmandi/Malkajgiri
    assert.equal(isSecunderabadLocation({ postalCode: '500003' }), true);
    assert.equal(isSecunderabadLocation({ postalCode: '500025' }), true);
    assert.equal(isSecunderabadLocation({ postalCode: '500061' }), true);
    assert.equal(isSecunderabadLocation({ postalCode: '500010' }), true);
    assert.equal(isSecunderabadLocation({ postalCode: '500011' }), true);
  });

  it('identifies Hyderabad Central PIN codes as not Secunderabad', () => {
    // 500001: Hyderabad GPO, 500034: Banjara Hills, 500002: Hyderabad South
    assert.equal(isSecunderabadLocation({ postalCode: '500001' }), false);
    assert.equal(isSecunderabadLocation({ postalCode: '500034' }), false);
    assert.equal(isSecunderabadLocation({ postalCode: '500002' }), false);
  });

  it('identifies Secunderabad from GPS coordinates bounding box', () => {
    // 17.44°N, 78.50°E is Secunderabad center / Sitaphalmandi
    assert.equal(isSecunderabadLocation({ latitude: 17.4400, longitude: 78.5000 }), true);
    // 17.45°N, 78.49°E is Begumpet/Secunderabad
    assert.equal(isSecunderabadLocation({ latitude: 17.4500, longitude: 78.4900 }), true);
    // 17.38°N, 78.48°E is Hyderabad Central (GPO/Abids - outside Secunderabad bounding box)
    assert.equal(isSecunderabadLocation({ latitude: 17.3800, longitude: 78.4800 }), false);
    // Bangalore coords
    assert.equal(isSecunderabadLocation({ latitude: 12.9716, longitude: 77.5946 }), false);
  });

  it('identifies Secunderabad from textual address components', () => {
    assert.equal(isSecunderabadLocation({ subregion: 'Secunderabad' }), true);
    assert.equal(isSecunderabadLocation({ district: 'Secunderabad Cantonment' }), true);
    assert.equal(isSecunderabadLocation({ street: 'Secunderabad Station Road' }), true);
    assert.equal(isSecunderabadLocation({ name: 'Secunderabad Division Postal Office' }), true);
    assert.equal(isSecunderabadLocation({ city: 'Secunderabad' }), true);
    // Generic Hyderabad address without Secunderabad text
    assert.equal(isSecunderabadLocation({ city: 'Hyderabad', district: 'Charminar' }), false);
  });
});

describe('Postal Hierarchy Directory Cascades', () => {
  it('returns valid divisions for circle and strips Circle suffix', () => {
    const divs = getDivisionsForCircle('Telangana');
    assert.ok(divs.includes('Secunderabad'));
    assert.ok(divs.includes('Hyderabad City'));
    assert.ok(divs.includes('Warangal'));

    const divsWithSuffix = getDivisionsForCircle('Telangana Circle');
    assert.deepEqual(divsWithSuffix, divs);
  });

  it('returns valid offices for division and circle', () => {
    const offices = getOfficesForDivision('Telangana', 'Secunderabad');
    assert.ok(offices.includes('Sitaphalmandi SO'));
    assert.ok(offices.includes('Secunderabad HPO'));
    assert.ok(offices.includes('Begumpet SO'));
    assert.ok(offices.includes('Trimulgherry SO'));
  });

  it('falls back safely for unknown circles or divisions without throwing', () => {
    const fallbackDivs = getDivisionsForCircle('Unknown Circle XYZ');
    assert.ok(Array.isArray(fallbackDivs));
    assert.ok(fallbackDivs.length > 0);

    const fallbackOffices = getOfficesForDivision('Unknown Circle', 'Unknown Division');
    assert.ok(Array.isArray(fallbackOffices));
    assert.ok(fallbackOffices.length > 0);
  });

  it('includes Telangana and all major postal circles', () => {
    assert.ok(POSTAL_CIRCLES.includes('Telangana'));
    assert.ok(POSTAL_CIRCLES.includes('Andhra Pradesh'));
    assert.ok(POSTAL_CIRCLES.includes('Maharashtra'));
    assert.ok(POSTAL_CIRCLES.includes('Tamil Nadu'));
  });
});

describe('BPEF 12 Affiliated Associations Governance', () => {
  it('contains exactly the 12 constitutional postal associations', () => {
    assert.equal(AFFILIATED_ASSOCIATIONS.length, 12);
    assert.equal(DEFAULT_POSTAL_CADRES.length, 12);

    const categories = AFFILIATED_ASSOCIATIONS.map((a) => a.category);
    assert.ok(categories.includes('Supervisors'));
    assert.ok(categories.includes('Postman & MTS'));
    assert.ok(categories.includes('Group ‘C’'));
    assert.ok(categories.includes('GDS'));
    assert.ok(categories.includes('RMS & MMS'));
    assert.ok(categories.includes('Mailguard & MTS'));
    assert.ok(categories.includes('Civil Wing'));
    assert.ok(categories.includes('Postal Accounts'));
    assert.ok(categories.includes('Administrative Offices'));
    assert.ok(categories.includes('SBCO'));
    assert.ok(categories.includes('Postal Officers'));
    assert.ok(categories.includes('IP & ASP'));

    // Verify "Administration" is NOT present as an association category
    assert.equal(categories.includes('Administration'), false);
  });

  it('every association has complete metadata', () => {
    for (const assoc of AFFILIATED_ASSOCIATIONS) {
      assert.ok(assoc.name && assoc.name.length > 5);
      assert.ok(assoc.category && assoc.category.length > 2);
      assert.ok(assoc.shortLabel && assoc.shortLabel.length > 2);
    }
  });
});

describe('Union Designation Hierarchy & Verification Governance', () => {
  it('ranks designations from Member L0 up to Executive Officers', () => {
    assert.ok(UNION_DESIGNATIONS.length >= 8);
    const member = UNION_DESIGNATIONS[0];
    assert.equal(member.title, 'Member');
    assert.equal(member.level, 0);

    // Verify ascending order
    for (let i = 1; i < UNION_DESIGNATIONS.length; i++) {
      assert.ok(UNION_DESIGNATIONS[i].level >= UNION_DESIGNATIONS[i - 1].level);
    }
  });

  it('isLeadershipDesignation enforces executive verification gate', () => {
    // Ordinary member signups do not require leadership holds
    assert.equal(isLeadershipDesignation('Member'), false);
    assert.equal(isLeadershipDesignation('member'), false);
    assert.equal(isLeadershipDesignation('  Member  '), false);
    assert.equal(isLeadershipDesignation(''), false);
    assert.equal(isLeadershipDesignation(null), false);

    // Any claimed post L1+ must route to leadership review
    assert.equal(isLeadershipDesignation('Branch Secretary'), true);
    assert.equal(isLeadershipDesignation('Division President'), true);
    assert.equal(isLeadershipDesignation('Circle Secretary'), true);
    assert.equal(isLeadershipDesignation('General Secretary'), true);
    assert.equal(isLeadershipDesignation('Founding President'), true);
    assert.equal(isLeadershipDesignation('Chair'), true);
  });
});
