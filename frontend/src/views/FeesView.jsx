import { useState } from 'react';
import { ANNUAL_FEE, TERMS } from '../config';
import { Au, BG, DANGER, G, MUTED, SUCCESS, TEXT_MUTED } from '../theme';
import { Badge, Btn, Card, DataTable, ErrMsg, Inp, PageHdr, Sel, SI } from '../components/ui';

export function FeesView({ user, api, reload, students, fees, mobile = false }) {
  const canLog = ['principal', 'secretary'].includes(user.role);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    studentId: '',
    amount: '',
    paymentMethod: 'mpesa',
    mpesaRef: '',
    reference: '',
    term: 'Term 1',
    paidBy: '',
  });
  const [err, setErr] = useState(''),
    [saving, setSaving] = useState(false),
    [ok, setOk] = useState(false);
  const [search, setSearch] = useState('');

  const log = async () => {
    const method = form.paymentMethod;
    if (!form.studentId || !form.amount)
      return setErr('Student and amount are required.');
    if (method === 'mpesa' && !form.mpesaRef.trim())
      return setErr('M-Pesa reference is required for M-Pesa payments.');
    if (isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0)
      return setErr('Enter a valid amount.');
    setSaving(true);
    setErr('');
    try {
      await api('/api/fees', { method: 'POST', body: JSON.stringify(form) });
      await reload('fees');
      setForm({
        studentId: '',
        amount: '',
        paymentMethod: 'mpesa',
        mpesaRef: '',
        reference: '',
        term: 'Term 1',
        paidBy: '',
      });
      setShowForm(false);
      setOk(true);
      setTimeout(() => setOk(false), 3000);
    } catch (e) {
      setErr(e.message);
    }
    setSaving(false);
  };

  const totPaid = fees.reduce((s, f) => s + f.amount, 0);
  const totOwe = Math.max(0, students.length * ANNUAL_FEE - totPaid);
  const fullPaid = students.filter(
    (s) =>
      fees.filter((f) => String(f.studentId) === String(s._id)).reduce((t, f) => t + f.amount, 0) >=
      ANNUAL_FEE
  ).length;
  const list = students.filter(
    (s) =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.studentNo.includes(search)
  );

  return (
    <div>
      <PageHdr title="Fee Management" sub="M-Pesa, cash, and bank payment records · Annual fee: M 1,500" />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: mobile ? '1fr 1fr' : 'repeat(4,1fr)',
          gap: 14,
          marginBottom: 24,
        }}
      >
        {[
          { ico: 'TC', lbl: 'Total Collected', val: `M ${totPaid.toLocaleString()}`, c: SUCCESS },
          {
            ico: 'TO',
            lbl: 'Total Outstanding',
            val: `M ${totOwe.toLocaleString()}`,
            c: DANGER,
          },
          { ico: 'FP', lbl: 'Fully Paid', val: `${fullPaid} students`, c: Au },
          { ico: 'EN', lbl: 'Total Enrolled', val: `${students.length} students`, c: G },
        ].map((s) => (
          <Card key={s.lbl} style={{ textAlign: 'center', padding: 18 }}>
            <div style={{ fontSize: 26, marginBottom: 6 }}>{s.ico}</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: s.c, fontFamily: 'Georgia,serif' }}>
              {s.val}
            </div>
            <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{s.lbl}</div>
          </Card>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 20,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search students…"
          style={{ ...SI, maxWidth: 240, marginBottom: 0 }}
        />
        {canLog && (
          <Btn variant="gold" onClick={() => setShowForm((s) => !s)}>
            + Log Payment
          </Btn>
        )}
        {ok && (
          <span style={{ color: SUCCESS, fontSize: 13, fontWeight: 600 }}>Payment saved!</span>
        )}
      </div>
      {showForm && canLog && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ color: G, fontSize: 15, fontWeight: 700, marginBottom: 18 }}>
            Log Payment
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
              gap: mobile ? 0 : '0 20px',
            }}
          >
            <Sel
              label="Student *"
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            >
              <option value="">— Select Student —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} — {s.studentNo} (Grade {s.grade}
                  {s.class})
                </option>
              ))}
            </Sel>
            <Inp
              label="Amount (LSL) *"
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="e.g. 500"
            />
            <Sel
              label="Term"
              value={form.term}
              onChange={(e) => setForm({ ...form, term: e.target.value })}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Sel>
            <Inp
              label="Paid By (Parent Name)"
              value={form.paidBy}
              onChange={(e) => setForm({ ...form, paidBy: e.target.value })}
              placeholder="Parent/Guardian name"
            />
            <Sel
              label="Payment Method"
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
            >
              <option value="mpesa">M-Pesa</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
            </Sel>
            {form.paymentMethod === 'mpesa' ? (
              <Inp
                label="M-Pesa Reference *"
                value={form.mpesaRef}
                onChange={(e) => setForm({ ...form, mpesaRef: e.target.value })}
                placeholder="e.g. QJ45TX8902"
              />
            ) : (
              <Inp
                label={form.paymentMethod === 'cash' ? 'Cash Receipt No. / Note' : 'Bank Reference / Slip No.'}
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder={
                  form.paymentMethod === 'cash'
                    ? 'Optional cash receipt note'
                    : 'Optional bank slip/reference'
                }
              />
            )}
          </div>
          <ErrMsg msg={err} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="gold" onClick={log} disabled={saving}>
              {saving ? 'Saving…' : 'Save Payment'}
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
      <Card>
        <DataTable
          cols={['Name', 'No.', 'Grade', 'Method', 'Paid (M)', 'Outstanding', 'Payments', 'Status']}
          rows={list.map((s) => {
            const sf = fees.filter((f) => String(f.studentId) === String(s._id));
            const paid = sf.reduce((t, f) => t + f.amount, 0);
            const owe = Math.max(0, ANNUAL_FEE - paid);
            const lastMethod = sf[0]?.paymentMethod || '—';
            return [
              s.name,
              <span key={`sno-${s._id}`} style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.studentNo}</span>,
              `${s.grade}${s.class}`,
              <span key={`method-${s._id}`} style={{ textTransform: 'uppercase' }}>{lastMethod}</span>,
              <strong key={`paid-${s._id}`} style={{ color: SUCCESS }}>M {paid.toLocaleString()}</strong>,
              <strong key={`owe-${s._id}`} style={{ color: owe > 0 ? DANGER : SUCCESS }}>
                M {owe.toLocaleString()}
              </strong>,
              <span key={`count-${s._id}`} style={{ color: TEXT_MUTED }}>
                {sf.length} payment{sf.length !== 1 ? 's' : ''}
              </span>,
              <Badge
                key={`status-${s._id}`}
                label={owe === 0 ? 'Fully Paid' : paid > 0 ? 'Partial' : 'Unpaid'}
                color={owe === 0 ? 'green' : paid > 0 ? 'yellow' : 'red'}
              />,
            ];
          })}
          empty="No students registered yet."
        />
      </Card>
      {fees.length > 0 && (
        <Card style={{ marginTop: 20 }}>
          <h3 style={{ color: G, fontSize: 14, fontWeight: 700, marginBottom: 14 }}>
            Recent Payment Log
          </h3>
          <DataTable
            cols={['Date', 'Student', 'Amount', 'Method', 'Reference', 'Term', 'Paid By', 'Recorded By']}
            rows={[...fees].slice(0, 20).map((f) => {
              const s = students.find((st) => String(st._id) === String(f.studentId));
              return [
                f.date,
                s?.name || '—',
                <strong key={`amt-${f._id}`} style={{ color: SUCCESS }}>M {f.amount.toLocaleString()}</strong>,
                <span key={`method-${f._id}`} style={{ textTransform: 'uppercase', fontSize: 12 }}>{f.paymentMethod || 'mpesa'}</span>,
                <code key={`ref-${f._id}`} style={{ fontSize: 12, background: BG, padding: '2px 8px', borderRadius: 4 }}>
                  {f.paymentMethod === 'mpesa' ? f.mpesaRef : f.reference || '—'}
                </code>,
                f.term,
                f.paidBy || '—',
                f.recordedBy || '—',
              ];
            })}
          />
        </Card>
      )}
    </div>
  );
}
