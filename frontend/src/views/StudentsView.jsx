import { useState } from 'react';
import { CLASSES, GRADES } from '../config';
import { G } from '../theme';
import { Btn, Card, DataTable, ErrMsg, Inp, PageHdr, Sel, SI } from '../components/ui';

export function StudentsView({ user, api, reload, students, mobile = false }) {
  const canEdit = user.role === 'principal';
  const [form, setForm] = useState({
    name: '',
    grade: '8',
    class: 'A',
    studentNo: '',
    parentName: '',
    parentPhone: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState(''),
    [filterGrade, setFilterGrade] = useState('all');
  const [err, setErr] = useState(''),
    [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.studentNo.trim())
      return setErr('Name and Student Number are required.');
    setSaving(true);
    setErr('');
    try {
      await api('/api/students', { method: 'POST', body: JSON.stringify(form) });
      await reload('students');
      setForm({ name: '', grade: '8', class: 'A', studentNo: '', parentName: '', parentPhone: '' });
      setShowForm(false);
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  };
  const del = async (id) => {
    if (!confirm('Remove this student and all their records?')) return;
    await api(`/api/students/${id}`, { method: 'DELETE' });
    await reload('students');
  };

  const list = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      (!search || s.name.toLowerCase().includes(q) || s.studentNo.includes(q)) &&
      (filterGrade === 'all' || s.grade === filterGrade)
    );
  });

  return (
    <div>
      <PageHdr
        title="Students"
        sub={`${students.length} enrolled student${students.length !== 1 ? 's' : ''}`}
      />
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or number…"
          style={{ ...SI, maxWidth: 250, marginBottom: 0 }}
        />
        <select
          value={filterGrade}
          onChange={(e) => setFilterGrade(e.target.value)}
          style={{ ...SI, width: 'auto', marginBottom: 0 }}
        >
          <option value="all">All Grades</option>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              Grade {g}
            </option>
          ))}
        </select>
        {canEdit && <Btn onClick={() => setShowForm((s) => !s)}>+ Register Student</Btn>}
      </div>
      {showForm && canEdit && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ color: G, fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
            Register New Student
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
              gap: mobile ? 0 : '0 20px',
            }}
          >
            <Inp
              label="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Student's full name"
            />
            <Inp
              label="Student Number *"
              value={form.studentNo}
              onChange={(e) => setForm({ ...form, studentNo: e.target.value })}
              placeholder="e.g. HHS-2025-001"
            />
            <Sel
              label="Grade"
              value={form.grade}
              onChange={(e) => setForm({ ...form, grade: e.target.value })}
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  Grade {g}
                </option>
              ))}
            </Sel>
            <Sel
              label="Class"
              value={form.class}
              onChange={(e) => setForm({ ...form, class: e.target.value })}
            >
              {CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Sel>
            <Inp
              label="Parent / Guardian Name"
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              placeholder="Parent's full name"
            />
            <Inp
              label="Parent Phone (M-Pesa)"
              value={form.parentPhone}
              onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
              placeholder="+266 XXXX XXXX"
            />
          </div>
          <ErrMsg msg={err} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save Student'}
            </Btn>
            <Btn
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setErr('');
              }}
            >
              Cancel
            </Btn>
          </div>
        </Card>
      )}

      {/* ManageClassesModal removed from StudentsView (belongs to TeachersView) */}
      <Card>
        <DataTable
          cols={[
            'Student No.',
            'Name',
            'Grade',
            'Class',
            'Parent Name',
            'Parent Phone',
            ...(canEdit ? ['Action'] : []),
          ]}
          rows={list.map((s) => [
            <span key={`no-${s._id}`} style={{ fontWeight: 700, color: G, fontFamily: 'monospace', fontSize: 12 }}>
              {s.studentNo}
            </span>,
            s.name,
            `Grade ${s.grade}`,
            s.class,
            s.parentName || '—',
            s.parentPhone || '—',
            ...(canEdit
              ? [
                  <Btn
                    key={`del-${s._id}`}
                    variant="danger"
                    onClick={() => del(s._id)}
                    style={{ padding: '4px 12px', fontSize: 12 }}
                  >
                    Remove
                  </Btn>,
                ]
              : []),
          ])}
          empty="No students registered yet."
        />
      </Card>
      
      
    </div>
  );
}
