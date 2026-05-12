'use client';

// Avanti — Add Staff Page

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiClient } from '../../../../lib/api';

interface FormState {
  employeeId:  string;
  firstName:   string;
  lastName:    string;
  designation: string;
  department:  string;
  email:       string;
  phone:       string;
  joiningDate: string;
  basicSalary: string;
}

const EMPTY: FormState = {
  employeeId:  '',
  firstName:   '',
  lastName:    '',
  designation: '',
  department:  '',
  email:       '',
  phone:       '',
  joiningDate: '',
  basicSalary: '',
};

function Field({
  label, required, children,
}: {
  label: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}{required && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const INPUT_STYLE: React.CSSProperties = {
  width:        '100%',
  padding:      'var(--space-2) var(--space-3)',
  border:       '1px solid var(--color-gray-200)',
  borderRadius: 'var(--radius-md)',
  fontSize:     'var(--text-sm)',
  background:   '#fff',
  color:        'var(--text-primary)',
  outline:      'none',
  height:       38,
  boxShadow:    '0 1px 2px rgba(0,0,0,0.04)',
  boxSizing:    'border-box',
};

export default function NewStaffPage() {
  const router = useRouter();
  const [form,    setForm]    = useState<FormState>(EMPTY);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  function update(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employeeId || !form.firstName || !form.lastName || !form.designation) {
      setError('Employee ID, first name, last name, and designation are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const api = getApiClient();
      await api.createStaffMember({
        employeeId:  form.employeeId,
        firstName:   form.firstName,
        lastName:    form.lastName,
        designation: form.designation,
        ...(form.department  ? { department:  form.department }                   : {}),
        ...(form.email       ? { email:       form.email }                        : {}),
        ...(form.phone       ? { phone:       form.phone }                        : {}),
        ...(form.joiningDate ? { joiningDate: form.joiningDate }                  : {}),
        ...(form.basicSalary ? { basicSalary: parseInt(form.basicSalary, 10) }    : {}),
      });
      router.push('/staff');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create staff member.');
    } finally {
      setSaving(false);
    }
  }

  const canSave = form.employeeId && form.firstName && form.lastName && form.designation;

  return (
    <div className="avanti-page" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 640 }}>

      {/* Header */}
      <div>
        <Link
          href="/staff"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: 'var(--space-3)' }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Staff
        </Link>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Add Staff Member
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 'var(--space-1) 0 0' }}>
          Fill in the details below to register a new staff member.
        </p>
      </div>

      {error && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 'var(--text-sm)', color: '#B91C1C' }}>
          {error}
        </div>
      )}

      <form onSubmit={e => { void handleSubmit(e); }}>
        <div
          style={{
            background:   '#fff',
            borderRadius: 'var(--radius-xl)',
            boxShadow:    '0 1px 4px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
            overflow:     'hidden',
          }}
        >
          {/* Section: Identity */}
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>
              Identity
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field label="First Name" required>
                <input style={INPUT_STYLE} className="avanti-input" placeholder="e.g. Priya" value={form.firstName} onChange={update('firstName')} />
              </Field>
              <Field label="Last Name" required>
                <input style={INPUT_STYLE} className="avanti-input" placeholder="e.g. Sharma" value={form.lastName} onChange={update('lastName')} />
              </Field>
              <Field label="Employee ID" required>
                <input style={INPUT_STYLE} className="avanti-input" placeholder="e.g. EMP-001" value={form.employeeId} onChange={update('employeeId')} />
              </Field>
              <Field label="Joining Date">
                <input type="date" style={INPUT_STYLE} className="avanti-input" value={form.joiningDate} onChange={update('joiningDate')} />
              </Field>
            </div>
          </div>

          {/* Section: Role */}
          <div style={{ padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--color-gray-100)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>
              Role & Department
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field label="Designation" required>
                <input style={INPUT_STYLE} className="avanti-input" placeholder="e.g. Class Teacher" value={form.designation} onChange={update('designation')} />
              </Field>
              <Field label="Department">
                <input style={INPUT_STYLE} className="avanti-input" placeholder="e.g. Science" value={form.department} onChange={update('department')} />
              </Field>
            </div>
          </div>

          {/* Section: Contact & Salary */}
          <div style={{ padding: 'var(--space-5) var(--space-6)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-4)' }}>
              Contact & Salary
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <Field label="Email">
                <input type="email" style={INPUT_STYLE} className="avanti-input" placeholder="priya@school.edu" value={form.email} onChange={update('email')} />
              </Field>
              <Field label="Phone">
                <input type="tel" style={INPUT_STYLE} className="avanti-input" placeholder="+91 98765 43210" value={form.phone} onChange={update('phone')} />
              </Field>
              <Field label="Basic Salary (₹)">
                <input type="number" min="0" style={INPUT_STYLE} className="avanti-input" placeholder="e.g. 35000" value={form.basicSalary} onChange={update('basicSalary')} />
              </Field>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <Link
            href="/staff"
            style={{ display: 'inline-flex', alignItems: 'center', padding: 'var(--space-2) var(--space-4)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none', height: 38, background: '#fff' }}
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={!canSave || saving}
            className="btn-brand"
            style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          'var(--space-2)',
              padding:      'var(--space-2) var(--space-5)',
              background:   canSave && !saving ? 'var(--color-brand-500)' : 'var(--color-gray-300)',
              color:        canSave && !saving ? '#fff' : 'var(--text-muted)',
              borderRadius: 'var(--radius-md)',
              fontSize:     'var(--text-sm)',
              fontWeight:   600,
              border:       'none',
              cursor:       canSave && !saving ? 'pointer' : 'not-allowed',
              height:       38,
            }}
          >
            {saving ? 'Saving…' : 'Add Staff Member'}
          </button>
        </div>
      </form>
    </div>
  );
}
