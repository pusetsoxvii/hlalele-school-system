import { useState } from 'react';
import { CAN_ASSIGN, CLASSES, GRADES, SUBJECTS } from '../config';
import { BG, BO, G, MUTED, TEXT_MUTED } from '../theme';
import { Badge, Btn, Card, DataTable, ErrMsg, Inp, Lbl, OkMsg, PageHdr, Sel, SI } from '../components/ui';

function MultiSelect({ label, options, value = [], onChange, style }) {
  const handle = (e) => {
    const vals = Array.from(e.target.selectedOptions).map((o) => o.value);
    onChange(vals);
  };
  return (
    <div style={{ marginBottom: 16 }}>
      <Lbl text={label} />
      <select
        multiple
        value={value}
        onChange={handle}
        style={{ ...SI, height: 120, ...(style || {}) }}
      >
        {options.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TeachersView({ user, api, reload, staff, mobile = false }) {
  const canRegister = user.role === 'principal';
  const canAssign = CAN_ASSIGN.includes(user.role);
  const teachers = staff.filter((s) => ['teacher', 'class_teacher'].includes(s.role));

  const [showRegForm, setShowRegForm] = useState(false);
  const [regForm, setRegForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'teacher',
    subject: [SUBJECTS[0]],
    assignedGrade: '8',
    assignedClass: 'A',
  });
  const [regErr, setRegErr] = useState(''),
    [regSaving, setRegSaving] = useState(false),
    [showPw, setShowPw] = useState(false);

  // Assign modal state
  const [assignTarget, setAssignTarget] = useState(null); // teacher being assigned
  const [aGrade, setAGrade] = useState('8');
  const [aClass, setAClass] = useState('A');
  const [assignErr, setAssignErr] = useState(''),
    [assignSaving, setAssignSaving] = useState(false),
    [assignOk, setAssignOk] = useState('');
  // Manage teachesClasses modal state
  const [manageTarget, setManageTarget] = useState(null);
  const [mcItems, setMcItems] = useState([]);
  const [mcGrade, setMcGrade] = useState('8');
  const [mcClass, setMcClass] = useState('A');
  const [mcErr, setMcErr] = useState('');
  const [mcSaving, setMcSaving] = useState(false);

  const saveTeacher = async () => {
    if (!regForm.name.trim() || !regForm.username.trim() || !regForm.password.trim())
      return setRegErr('All starred fields are required.');
    if (
      regForm.role === 'teacher' &&
      (!Array.isArray(regForm.subject) || regForm.subject.length === 0)
    )
      return setRegErr('Select at least one subject.');
    setRegSaving(true);
    setRegErr('');
    try {
      await api('/api/staff', { method: 'POST', body: JSON.stringify(regForm) });
      await reload('staff');
      setRegForm({
        name: '',
        username: '',
        password: '',
        role: 'teacher',
        subject: [SUBJECTS[0]],
        assignedGrade: '8',
        assignedClass: 'A',
      });
      setShowRegForm(false);
    } catch (e) {
      setRegErr(e.message);
    }
    setRegSaving(false);
  };

  const del = async (id) => {
    if (!confirm('Remove this teacher?')) return;
    await api(`/api/staff/${id}`, { method: 'DELETE' });
    await reload('staff');
  };

  const openAssign = (t) => {
    setAssignTarget(t);
    setAGrade(t.assignedGrade || '8');
    setAClass(t.assignedClass || 'A');
    setAssignErr('');
  };

  const openManageClasses = (t) => {
    setManageTarget(t);
    setMcItems(t.teachesClasses ? [...t.teachesClasses] : []);
    setMcErr('');
  };

  const addMcItem = () => {
    if (!mcGrade || !mcClass) return setMcErr('Select grade and class');
    setMcItems((i) => [...i, { grade: mcGrade, class: mcClass }]);
    setMcErr('');
  };

  const removeMcItem = (idx) => setMcItems((i) => i.filter((_, k) => k !== idx));

  const saveMc = async () => {
    setMcSaving(true);
    setMcErr('');
    try {
      await api(`/api/staff/${manageTarget._id}/teachesClasses`, {
        method: 'PATCH',
        body: JSON.stringify({ teachesClasses: mcItems }),
      });
      await reload('staff');
      setManageTarget(null);
    } catch (e) {
      setMcErr(e.message);
    }
    setMcSaving(false);
  };

  const saveAssign = async () => {
    setAssignSaving(true);
    setAssignErr('');
    try {
      await api(`/api/staff/${assignTarget._id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({ assignedGrade: aGrade, assignedClass: aClass }),
      });
      await reload('staff');
      setAssignTarget(null);
      setAssignOk(`${assignTarget.name} assigned to Grade ${aGrade}${aClass}`);
      setTimeout(() => setAssignOk(''), 3000);
    } catch (e) {
      setAssignErr(e.message);
    }
    setAssignSaving(false);
  };

  const unassign = async (t) => {
    if (
      !confirm(`Remove ${t.name} as class teacher for Grade ${t.assignedGrade}${t.assignedClass}?`)
    )
      return;
    await api(`/api/staff/${t._id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedGrade: null, assignedClass: null }),
    });
    await reload('staff');
    setAssignOk(`${t.name} unassigned from class teacher role`);
    setTimeout(() => setAssignOk(''), 3000);
  };

  return (
    <div>
      <PageHdr
        title="Teachers"
        sub={`${teachers.length} teacher${teachers.length !== 1 ? 's' : ''} on staff`}
      />

      {/* Permission info for non-principal roles */}
      {!canRegister && (
        <div
          style={{
            background: BG,
            border: `1px solid ${BO}`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            color: TEXT_MUTED,
          }}
        >
          You can <strong style={{ color: G }}>assign or unassign class teachers</strong>. Only the
          Principal can register or remove staff.
        </div>
      )}

      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {canRegister && <Btn onClick={() => setShowRegForm((s) => !s)}>+ Register Teacher</Btn>}
        <OkMsg msg={assignOk} />
      </div>

      {/* Register form — principal only */}
      {showRegForm && canRegister && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ color: G, fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
            Register New Teacher
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
              value={regForm.name}
              onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
              placeholder="Teacher's full name"
            />
            <Inp
              label="Username *"
              value={regForm.username}
              onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
              placeholder="Login username"
            />
            <div style={{ marginBottom: 16 }}>
              <Lbl text="Password *" />
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={regForm.password}
                  onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                  style={SI}
                  placeholder="Login password"
                />
                <button
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: TEXT_MUTED,
                    fontSize: 12,
                  }}
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <MultiSelect
              label="Subject Taught *"
              options={SUBJECTS}
              value={regForm.subject}
              onChange={(vals) => setRegForm({ ...regForm, subject: vals })}
            />
          </div>
          <p
            style={{
              fontSize: 12,
              color: TEXT_MUTED,
              margin: '-8px 0 16px',
              background: BG,
              padding: '8px 12px',
              borderRadius: 6,
            }}
          >
            💡 Register teachers as <strong>Subject Teachers</strong>. Use the{' '}
            <strong>Assign as Class Teacher</strong> button in the table below to give them a class.
          </p>
          <ErrMsg msg={regErr} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn onClick={saveTeacher} disabled={regSaving}>
              {regSaving ? 'Saving…' : 'Save Teacher'}
            </Btn>
            <Btn
              variant="outline"
              onClick={() => {
                setShowRegForm(false);
                setRegErr('');
              }}
            >
              Cancel
            </Btn>
          </div>
        </Card>
      )}

      {/* Assign modal */}
      {assignTarget && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <Card style={{ width: mobile ? 'calc(100vw - 32px)' : 420, padding: 28 }}>
            <h3 style={{ color: G, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Assign Class Teacher
            </h3>
            <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 20 }}>
              Assigning <strong>{assignTarget.name}</strong> as class teacher for:
            </p>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
                gap: mobile ? 0 : '0 16px',
              }}
            >
              <Sel label="Grade" value={aGrade} onChange={(e) => setAGrade(e.target.value)}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </Sel>
              <Sel label="Class" value={aClass} onChange={(e) => setAClass(e.target.value)}>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Sel>
            </div>
            <ErrMsg msg={assignErr} />
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn onClick={saveAssign} disabled={assignSaving}>
                {assignSaving ? 'Saving…' : 'Confirm Assignment'}
              </Btn>
              <Btn variant="outline" onClick={() => setAssignTarget(null)}>
                Cancel
              </Btn>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <DataTable
          cols={[
            'Name',
            'Username',
            'Subject',
            'Role',
            'Assigned Class',
            ...(canAssign ? ['Actions'] : []),
          ]}
          rows={teachers.map((t) => [
            t.name,
            <code key={`user-${t._id}-username`} style={{ fontSize: 12, background: BG, padding: '2px 8px', borderRadius: 4 }}>
              {t.username}
            </code>,
            Array.isArray(t.subject) ? t.subject.join(', ') : t.subject || '-',
            <Badge
              key={`role-${t._id}`}
              label={t.role === 'class_teacher' ? 'Class Teacher' : 'Subject Teacher'}
              color={t.role === 'class_teacher' ? 'blue' : 'gray'}
            />,
              t.assignedGrade ? (
              <Badge key={`assigned-${t._id}`} label={`Grade ${t.assignedGrade}${t.assignedClass}`} color="purple" />
            ) : (
              <span key={`assigned-${t._id}-empty`} style={{ color: MUTED }}>—</span>
            ),
            ...(canAssign
              ? [
                  <div key={`actions-${t._id}`} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Btn
                      onClick={() => openAssign(t)}
                      style={{ padding: '4px 12px', fontSize: 12 }}
                    >
                      {t.role === 'class_teacher' ? '↔ Reassign' : '+ Assign Class'}
                    </Btn>
                    {t.role === 'class_teacher' && (
                      <Btn
                        variant="danger"
                        onClick={() => unassign(t)}
                        style={{ padding: '4px 12px', fontSize: 12 }}
                      >
                        Unassign
                      </Btn>
                    )}
                    {canRegister && (
                      <Btn
                        variant="danger"
                        onClick={() => del(t._id)}
                        style={{ padding: '4px 12px', fontSize: 12 }}
                      >
                        Remove
                      </Btn>
                    )}
                    {canRegister && (
                      <Btn
                        onClick={() => openManageClasses(t)}
                        style={{ padding: '4px 12px', fontSize: 12 }}
                      >
                        Manage Classes
                      </Btn>
                    )}
                  </div>,
                ]
              : []),
          ])}
          empty="No teachers registered."
        />
      </Card>
      {manageTarget && (
        <ManageClassesModal
          target={manageTarget}
          items={mcItems}
          grades={GRADES}
          classesList={CLASSES}
          onClose={() => setManageTarget(null)}
          onAdd={addMcItem}
          onRemove={removeMcItem}
          onSave={saveMc}
          err={mcErr}
          saving={mcSaving}
          setGrade={setMcGrade}
          setClass={setMcClass}
          grade={mcGrade}
          cls={mcClass}
        />
      )}
    </div>
  );
}

// Manage classes modal rendered at teachers view level
function ManageClassesModal({
  target,
  items,
  grades,
  classesList,
  onClose,
  onAdd,
  onRemove,
  onSave,
  err,
  saving,
  setGrade,
  setClass,
  grade,
  cls,
}) {
  if (!target) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <Card style={{ width: 420, padding: 20 }}>
        <h3 style={{ color: G, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          Manage Additional Classes
        </h3>
        <p style={{ color: TEXT_MUTED, fontSize: 13, marginBottom: 12 }}>
          Manage extra classes that <strong>{target.name}</strong> teaches (besides assigned class).
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <Sel label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
            {grades.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Sel>
          <Sel label="Class" value={cls} onChange={(e) => setClass(e.target.value)}>
            {classesList.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Sel>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Btn onClick={onAdd}>Add</Btn>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {items.length ? (
            items.map((it, idx) => (
              <div
                key={idx}
                style={{
                  background: BG,
                  border: `1px solid ${BO}`,
                  padding: '6px 10px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontWeight: 600, color: G }}>{`Grade ${it.grade}${it.class}`}</span>
                <button
                  onClick={() => onRemove(idx)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            ))
          ) : (
            <div style={{ color: MUTED }}>No additional classes</div>
          )}
        </div>
        {err && <ErrMsg msg={err} />}
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Btn>
          <Btn variant="outline" onClick={onClose}>
            Cancel
          </Btn>
        </div>
      </Card>
    </div>
  );
}
