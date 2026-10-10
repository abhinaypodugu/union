import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  Button,
  Field,
  Input,
  Notice,
} from '../components';
import { TerminologyConfig } from '../types';

export function TerminologyScreen() {
  const { currentTenant, updateTerminology } = useApp();
  const [cfg, setCfg] = useState<TerminologyConfig>({ ...currentTenant.terminology });
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = () => {
    updateTerminology(cfg);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  };

  const handleResetDefaults = () => {
    const defaults: TerminologyConfig = {
      orgLabel: 'Federation',
      level1Label: 'City',
      level2Label: 'State',
      level3Label: 'National',
      groupLabel: 'Functional Group',
      caseLabel: 'Issue',
    };
    setCfg(defaults);
    updateTerminology(defaults);
    setSavedNotice(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <TopBar crumbs={['Configure', 'Terminology & Governance']} />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
          padding: '24px 28px 16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 260 }}>
          <h1
            style={{
              margin: 0,
              font: 'var(--text-display-l)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            Terminology configuration
          </h1>
          <p style={{ margin: '4px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
            Domain-agnostic label mapping for {currentTenant.name} (PRD §17.20)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" onClick={handleResetDefaults}>
            Reset defaults
          </Button>
          <Button icon="circle-check" onClick={handleSave}>
            Save configuration
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 380px',
          gap: 24,
          padding: '0 28px 48px',
          alignItems: 'start',
        }}
      >
        {/* Configuration Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {savedNotice && (
            <Notice tone="info" title="Terminology updated successfully">
              Labels have updated across navigation, queue cards, and member mobile screens in real time.
              Recorded in the audit trail.
            </Notice>
          )}

          <div className="cm-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ font: 'var(--text-title-m)' }}>Administrative & Domain Nouns</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              Configure your organization’s preferred terms without requiring backend schema migrations or code changes.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="Organization noun" hint="e.g. Federation, Union, Alliance, Guild">
                <Input
                  value={cfg.orgLabel}
                  onChange={(e) => setCfg({ ...cfg, orgLabel: e.target.value })}
                />
              </Field>

              <Field label="Grievance / Issue noun" hint="e.g. Issue, Grievance, Case, Complaint">
                <Input
                  value={cfg.caseLabel}
                  onChange={(e) => setCfg({ ...cfg, caseLabel: e.target.value })}
                />
              </Field>

              <Field label="Functional trade group noun" hint="e.g. Functional Group, Sector, Trade, Division">
                <Input
                  value={cfg.groupLabel}
                  onChange={(e) => setCfg({ ...cfg, groupLabel: e.target.value })}
                />
              </Field>

              <Field label="Level 1 tier (Local)" hint="e.g. City, District, Branch, Chapter">
                <Input
                  value={cfg.level1Label}
                  onChange={(e) => setCfg({ ...cfg, level1Label: e.target.value })}
                />
              </Field>

              <Field label="Level 2 tier (Regional)" hint="e.g. State, Province, Region, Canton">
                <Input
                  value={cfg.level2Label}
                  onChange={(e) => setCfg({ ...cfg, level2Label: e.target.value })}
                />
              </Field>

              <Field label="Level 3 tier (National)" hint="e.g. National, Country, Federal Council">
                <Input
                  value={cfg.level3Label}
                  onChange={(e) => setCfg({ ...cfg, level3Label: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Live Preview Pane */}
        <div className="cm-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="cm-overline">Real-Time UI Preview</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>
            Rendered sample labels:
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: 14,
              background: 'var(--paper-100)',
              borderRadius: 'var(--radius-m)',
              fontSize: 13,
            }}
          >
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Top navigation: </span>
              <b>{cfg.orgLabel} Administration</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Work tab: </span>
              <b>{cfg.caseLabel} queue</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Intake action: </span>
              <b>Raise a {cfg.caseLabel.toLowerCase()}</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Governance tier: </span>
              <b>{cfg.level1Label} Committee → {cfg.level2Label} Committee → {cfg.level3Label} Committee</b>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Member grouping: </span>
              <b>IT Workers · {cfg.groupLabel}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
