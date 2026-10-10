import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  IconButton,
  Button,
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Tag,
  Notice,
} from '../components';
import { IssuePriority } from '../types';

interface RaiseSheetProps {
  onClose: () => void;
  onSuccess: (issueId: string) => void;
}

export function RaiseSheet({ onClose, onSuccess }: RaiseSheetProps) {
  const { currentMember, currentTenant, raiseIssue } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [affectsOthers, setAffectsOthers] = useState(false);
  const [priority, setPriority] = useState<IssuePriority>('normal');
  const [hasEvidence, setHasEvidence] = useState(false);
  const [submittedAttempt, setSubmittedAttempt] = useState(false);

  const categories = [
    'Wages',
    'Working hours',
    'Health & safety',
    'Facilities',
    'Harassment (confidential)',
    'Retaliation',
  ];

  const isValid = title.trim().length > 0 && category.length > 0;

  const handleSubmit = () => {
    setSubmittedAttempt(true);
    if (!isValid) return;

    const newId = raiseIssue({
      title: title.trim(),
      category,
      description: description.trim(),
      affectsOthers,
      location: currentMember.unit || 'Hyderabad',
      group: currentMember.groups[0] || 'General',
      priority: category.includes('confidential') || category === 'Retaliation' ? 'urgent' : priority,
    });

    onSuccess(newId);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'oklch(0.2 0.01 80 / 0.45)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Sheet Content */}
      <div
        style={{
          position: 'relative',
          maxHeight: '92%',
          overflowY: 'auto',
          background: 'var(--paper-50)',
          borderRadius: '24px 24px 0 0',
          boxShadow: 'var(--shadow-sheet)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 51,
        }}
      >
        <div
          style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            background: 'var(--paper-300)',
            margin: '10px auto 4px',
            flex: 'none',
          }}
        />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '10px 12px 6px 18px',
          }}
        >
          <h2
            style={{
              margin: 0,
              flex: 1,
              font: 'var(--text-display-s)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            Raise a {currentTenant.terminology.caseLabel.toLowerCase()}
          </h2>
          <IconButton icon="x" label="Close" size="lg" onClick={onClose} />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '8px 18px 36px',
          }}
        >
          <Notice tone="info" title="You don’t need to know who handles it">
            The platform routes your grievance to the accountable committee based on your location (
            {currentMember.unit}), functional sector ({currentMember.groups[0] || 'General'}), and category.
          </Notice>

          <Field
            label="Category"
            required
            error={submittedAttempt && !category ? 'Please select an issue category' : null}
          >
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Select category…"
              invalid={submittedAttempt && !category}
              options={categories}
            />
          </Field>

          <Field
            label="Title"
            required
            hint="A clear summary, e.g. “Night-shift allowance missing from September pay”"
            error={submittedAttempt && !title.trim() ? 'Please provide a short summary title' : null}
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              invalid={submittedAttempt && !title.trim()}
              placeholder="What is the grievance?"
            />
          </Field>

          <Field label="What happened?" hint="Provide relevant dates, shift hours, and locations">
            <Textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the situation and what resolution you are seeking…"
            />
          </Field>
          <Field label="Priority / Urgency">
            <Select
              value={priority}
              onChange={(e) => setPriority(e.target.value as IssuePriority)}
              options={['normal', 'high', 'urgent']}
            />
          </Field>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Tag icon="briefcase">{currentMember.groups[0] || 'IT Workers'}</Tag>
            <button
              type="button"
              className={'cm-tag' + (hasEvidence ? ' cm-tag--selected' : '')}
              onClick={() => setHasEvidence(!hasEvidence)}
            >
              <Tag icon="paperclip">{hasEvidence ? '2 Payslips attached' : 'Attach payslips/photos'}</Tag>
            </button>
          </div>

          <Checkbox
            checked={affectsOthers}
            onChange={(e) => setAffectsOthers(e.target.checked)}
            label="This affects other members in my workplace"
            description="Your name remains strictly private — related complaints can be correlated for collective bargaining."
          />

          <Button size="lg" block icon="send" onClick={handleSubmit}>
            Submit {currentTenant.terminology.caseLabel.toLowerCase()}
          </Button>
        </div>
      </div>
    </div>
  );
}
