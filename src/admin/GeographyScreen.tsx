import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from './TopBar';
import {
  Button,
  Badge,
  Icon,
  Dialog,
  Field,
  Input,
  Select,
} from '../components';
import { GeographicLevel } from '../types';

export function GeographyScreen() {
  const { currentTenant, geoUnits, functionalGroups } = useApp();
  const [addUnitDialogOpen, setAddUnitDialogOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitType, setNewUnitType] = useState<GeographicLevel>('city');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <TopBar crumbs={['Structure', 'Geography & Sectors']} />

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
            Geography & {currentTenant.terminology.groupLabel}s
          </h1>
          <p style={{ margin: '4px 0 0', font: 'var(--text-body)', color: 'var(--text-secondary)' }}>
            Configured administrative units and trade sectors in {currentTenant.name}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon="plus" onClick={() => setAddUnitDialogOpen(true)}>
            Add unit
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: 20,
          padding: '0 28px 48px',
        }}
      >
        {/* Geographic Units Card */}
        <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              font: 'var(--text-title-m)',
            }}
          >
            Geographic Jurisdictions
          </div>
          <table className="cm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Unit Name</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Level</th>
                <th style={{ textAlign: 'right', padding: '10px 16px' }}>Members</th>
              </tr>
            </thead>
            <tbody>
              {geoUnits.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <Icon
                        name={u.type === 'country' ? 'globe' : u.type === 'state' ? 'map-pin' : 'building-2'}
                        size={16}
                        color="var(--ink-600)"
                      />
                      <span>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <Badge size="sm" tone={u.type === 'country' ? 'info' : 'neutral'}>
                      {u.kind}
                    </Badge>
                  </td>
                  <td className="cm-mono" style={{ textAlign: 'right', padding: '10px 16px' }}>
                    {u.memberCount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Functional Groups Card */}
        <div className="cm-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid var(--border-subtle)',
              font: 'var(--text-title-m)',
            }}
          >
            {currentTenant.terminology.groupLabel}s & Communities
          </div>
          <table className="cm-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Group Name</th>
                <th style={{ textAlign: 'left', padding: '10px 16px' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '10px 16px' }}>Enrolled</th>
              </tr>
            </thead>
            <tbody>
              {functionalGroups.map((g) => (
                <tr key={g.id}>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                      <Icon name={g.icon || 'briefcase'} size={16} color="var(--accent)" />
                      <span>{g.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {g.category}
                  </td>
                  <td className="cm-mono" style={{ textAlign: 'right', padding: '10px 16px' }}>
                    {g.memberCount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Unit Modal */}
      <Dialog
        open={addUnitDialogOpen}
        onClose={() => setAddUnitDialogOpen(false)}
        title="Add geographic unit"
        description={`Creates an administrative unit in ${currentTenant.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddUnitDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!newUnitName.trim()}
              onClick={() => {
                setAddUnitDialogOpen(false);
                setNewUnitName('');
              }}
            >
              Create unit
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Unit name" required>
            <Input
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="e.g. Nizamabad"
              autoFocus
            />
          </Field>
          <Field label="Geographic tier">
            <Select
              value={newUnitType}
              onChange={(e) => setNewUnitType(e.target.value as GeographicLevel)}
              options={['city', 'state', 'country', 'local']}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
