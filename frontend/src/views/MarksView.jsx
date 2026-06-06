import { useMemo, useState } from 'react';
import { CA_SLOTS, CLASSES, GRADES, SUBJECTS, TERMS } from '../config';
import { calcFinal, getCaMarks, getCaReferenceMark } from '../utils/marks';
import { BG, BO, DANGER, G, MUTED, SUCCESS, TEXT_MUTED } from '../theme';
import { Badge, Btn, Card, PageHdr, Sel, SI } from '../components/ui';

export function MarksView({ user, api, reload, students, marks, mobile = false }) {
  const [grade, setGrade] = useState(user.assignedGrade || '8');
  const [cls, setCls] = useState(user.assignedClass || 'A');
  const [subject, setSubject] = useState(user.subject || SUBJECTS[0]);
  const [term, setTerm] = useState('Term 1');
  const [localScores, setLocalScores] = useState(() =>
    Object.fromEntries([...CA_SLOTS, 'test'].map((key) => [key, {}]))
  ); // studentId → CA1..CA5/test scores
  const [localRemarks, setLocalRemarks] = useState({ ca: {}, test: {} }); // studentId → ca/test remark
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const classStudents = students.filter((s) => s.grade === grade && s.class === cls);

  const initialScores = useMemo(() => {
    const next = Object.fromEntries([...CA_SLOTS, 'test'].map((key) => [key, {}]));
    classStudents.forEach((s) => {
      const sid = String(s._id);
      const subjectMarks = marks.filter(
        (m) => String(m.studentId) === sid && m.subject === subject && m.term === term
      );
      CA_SLOTS.forEach((slot) => {
        const mark = subjectMarks.find((m) => m.type === slot);
        if (mark) next[slot][sid] = mark.score;
      });
      if (!CA_SLOTS.some((slot) => subjectMarks.some((m) => m.type === slot))) {
        const legacyCa = subjectMarks.find((m) => m.type === 'ca');
        if (legacyCa) next.ca1[sid] = legacyCa.score;
      }
      const testM = marks.find(
        (m) => String(m.studentId) === sid && m.subject === subject && m.term === term && m.type === 'test'
      );
      if (testM) next.test[sid] = testM.score;
    });
    return next;
  }, [subject, term, marks, classStudents]);

  const initialRemarks = useMemo(() => {
    const ca = {}, test = {};
    classStudents.forEach((s) => {
      const sid = String(s._id);
      const caM = getCaReferenceMark(getCaMarks(marks, sid, subject, term));
      const testM = marks.find(
        (m) => String(m.studentId) === sid && m.subject === subject && m.term === term && m.type === 'test'
      );
      if (caM) ca[sid] = caM.remark || '';
      if (testM) test[sid] = testM.remark || '';
    });
    return { ca, test };
  }, [subject, term, marks, classStudents]);

  const saveAll = async () => {
    const entries = [];
    classStudents.forEach((s) => {
      const sid = String(s._id);
      CA_SLOTS.forEach((slot) => {
        const slotValue = localScores[slot]?.[sid] ?? initialScores[slot]?.[sid];
        if (slotValue !== undefined && slotValue !== '') {
          const n = parseFloat(slotValue);
          if (!isNaN(n) && n >= 0 && n <= 100)
            entries.push({ studentId: sid, subject, term, type: slot, score: n, remark: localRemarks.ca[sid] ?? initialRemarks.ca[sid] ?? '' });
        }
      });
      const tv = localScores.test[sid] ?? initialScores.test[sid];
      const tr = localRemarks.test[sid] ?? initialRemarks.test[sid] ?? '';
      if (tv !== undefined && tv !== '') {
        const n = parseFloat(tv);
        if (!isNaN(n) && n >= 0 && n <= 100)
          entries.push({ studentId: sid, subject, term, type: 'test', score: n, remark: tr });
      }
    });
    if (!entries.length) return;
    setSaving(true);
    try {
      await api('/api/marks/batch', { method: 'POST', body: JSON.stringify({ entries }) });
      await reload('marks');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert(e.message);
    }
    setSaving(false);
  };

  const caEntered = CA_SLOTS.reduce(
    (count, slot) =>
      count +
      Object.values({ ...(initialScores[slot] || {}), ...(localScores[slot] || {}) }).filter(
        (v) => v !== '' && v !== undefined
      ).length,
    0
  );
  const testEntered = Object.values({ ...initialScores.test, ...localScores.test }).filter((v) => v !== '' && v !== undefined).length;

  const onChangeGrade = (e) => {
    setGrade(e.target.value);
    setLocalScores(Object.fromEntries([...CA_SLOTS, 'test'].map((key) => [key, {}])));
    setSaved(false);
  };
  const onChangeCls = (e) => {
    setCls(e.target.value);
    setLocalScores(Object.fromEntries([...CA_SLOTS, 'test'].map((key) => [key, {}])));
    setSaved(false);
  };
  const onChangeSubject = (e) => {
    setSubject(e.target.value);
    setLocalScores(Object.fromEntries([...CA_SLOTS, 'test'].map((key) => [key, {}])));
    setSaved(false);
  };
  const onChangeTerm = (e) => {
    setTerm(e.target.value);
    setLocalScores(Object.fromEntries([...CA_SLOTS, 'test'].map((key) => [key, {}])));
    setSaved(false);
  };

  const thS = {
    textAlign: 'center',
    padding: '10px 8px',
    fontSize: 11,
    fontWeight: 700,
    color: G,
    background: BG,
    borderBottom: `2px solid ${BO}`,
  };
  const tdS = {
    padding: '7px 8px',
    fontSize: 13,
    borderBottom: `1px solid ${BO}`,
    textAlign: 'center',
    verticalAlign: 'middle',
  };

  return (
    <div>
      <PageHdr title="Enter Marks" sub="Continuous Assessment (30%) + End of Term Test (70%)" />
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(4,1fr)',
            gap: mobile ? 0 : '0 20px',
          }}
        >
          <Sel label="Grade" value={grade} onChange={onChangeGrade}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </Sel>
          <Sel label="Class" value={cls} onChange={onChangeCls}>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Sel>
          <Sel label="Subject" value={subject} onChange={onChangeSubject}>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Sel>
          <Sel label="Term" value={term} onChange={onChangeTerm}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Sel>
        </div>
        {/* Weight legend */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginTop: -4,
            flexDirection: mobile ? 'column' : 'row',
          }}
        >
          <div
            style={{
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              color: '#1D4ED8',
              fontWeight: 600,
            }}
          >
            CA (Continuous Assessment) — 30%
          </div>
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              color: '#15803D',
              fontWeight: 600,
            }}
          >
            End-of-Term Test — 70%
          </div>
          <div
            style={{
              background: BG,
              border: `1px solid ${BO}`,
              borderRadius: 8,
              padding: '8px 14px',
              fontSize: 12,
              color: G,
              fontWeight: 600,
            }}
          >
            Final = Avg(CA1-CA5)×30% + Test×70%
          </div>
        </div>
      </Card>

      {classStudents.length === 0 ? (
        <Card>
          <p style={{ color: MUTED, textAlign: 'center', padding: 32 }}>
            No students in Grade {grade}
            {cls}.
          </p>
        </Card>
      ) : (
        <Card>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 18,
            }}
          >
            <h3 style={{ color: G, fontSize: 15, fontWeight: 700, margin: 0 }}>
              Grade {grade}
              {cls} · {subject} · {term}
            </h3>
            <span style={{ fontSize: 12, color: MUTED }}>
              CA slots: {caEntered}/{classStudents.length * CA_SLOTS.length} &nbsp;|&nbsp; Test: {testEntered}/
              {classStudents.length}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ ...thS, textAlign: 'left', width: 30 }}>#</th>
                  <th style={{ ...thS, textAlign: 'left' }}>Student Name</th>
                  <th style={{ ...thS, textAlign: 'left' }}>Student No.</th>
                  {CA_SLOTS.map((slot) => (
                    <th
                      key={slot}
                      style={{ ...thS, background: '#EFF6FF', color: '#1D4ED8', width: 88 }}
                    >
                      {slot.toUpperCase()}
                      <br />
                      <span style={{ fontSize: 10, fontWeight: 400 }}>0–100</span>
                    </th>
                  ))}
                  <th style={{ ...thS, background: '#EFF6FF', color: '#1D4ED8', width: 110 }}>
                    CA Avg (30%)
                    <br />
                    <span style={{ fontSize: 10, fontWeight: 400 }}>0–100</span>
                  </th>
                  <th style={{ ...thS, background: '#F0FDF4', color: '#15803D', width: 120 }}>
                    Test Mark (70%)
                    <br />
                    <span style={{ fontSize: 10, fontWeight: 400 }}>0–100</span>
                  </th>
                  <th style={{ ...thS, width: 110 }}>
                    Final Mark
                    <br />
                    <span style={{ fontSize: 10, fontWeight: 400 }}>Weighted</span>
                  </th>
                  <th style={{ ...thS, width: 220 }}>Remark</th>
                  <th style={{ ...thS, width: 70 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((s, i) => {
                  const sid = String(s._id);
                  const caValues = CA_SLOTS.map((slot) => localScores[slot]?.[sid] ?? initialScores[slot]?.[sid]);
                  const caFilled = caValues.filter((v) => v !== undefined && v !== '');
                  const caN = caFilled.length
                    ? +(caFilled.reduce((sum, value) => sum + parseFloat(value), 0) / caFilled.length).toFixed(1)
                    : null;
                  const testV = localScores.test[sid] ?? initialScores.test[sid];
                  const testN = testV !== undefined && testV !== '' ? parseFloat(testV) : null;
                  const fin = calcFinal(caN, testN);
                  return (
                    <tr key={sid} style={{ background: i % 2 === 0 ? '#fff' : '#FDFCF9' }}>
                      <td style={{ ...tdS, textAlign: 'left', color: MUTED, fontSize: 12 }}>
                        {i + 1}
                      </td>
                      <td style={{ ...tdS, textAlign: 'left', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ ...tdS, textAlign: 'left', fontSize: 12, color: TEXT_MUTED }}>
                        {s.studentNo}
                      </td>
                      {CA_SLOTS.map((slot, idx) => (
                        <td key={`${sid}-${slot}`} style={{ ...tdS, background: '#F8FAFF' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={caValues[idx] ?? ''}
                            onChange={(e) =>
                              setLocalScores((current) => ({
                                ...current,
                                [slot]: { ...(current[slot] || {}), [sid]: e.target.value },
                              }))
                            }
                            style={{
                              ...SI,
                              width: 64,
                              padding: '6px 8px',
                              marginBottom: 0,
                              textAlign: 'center',
                              border: '1px solid #BFDBFE',
                            }}
                            placeholder="—"
                          />
                        </td>
                      ))}
                      <td style={{ ...tdS, background: '#F8FAFF' }}>
                        {caN !== null ? <strong style={{ color: G }}>{caN}%</strong> : <span style={{ color: '#D1D5DB' }}>—</span>}
                      </td>
                      <td style={{ ...tdS, background: '#F7FFF9' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={testV ?? ''}
                          onChange={(e) =>
                            setLocalScores((s) => ({ ...s, test: { ...s.test, [sid]: e.target.value } }))
                          }
                          style={{
                            ...SI,
                            width: 80,
                            padding: '6px 10px',
                            marginBottom: 0,
                            textAlign: 'center',
                            border: '1px solid #BBF7D0',
                          }}
                          placeholder="—"
                        />
                      </td>
                      <td style={{ ...tdS }}>
                        {fin !== null ? (
                          <strong style={{ color: fin >= 50 ? SUCCESS : DANGER, fontSize: 14 }}>
                            {fin}%
                          </strong>
                        ) : (
                          <span style={{ color: '#D1D5DB' }}>—</span>
                        )}
                      </td>
                      <td style={{ ...tdS, textAlign: 'left' }}>
                        <input
                          value={
                            // prefer CA remark for CA entries; if not present show test remark when CA empty
                            localRemarks.ca[sid] ?? initialRemarks.ca[sid] ?? localRemarks.test[sid] ?? initialRemarks.test[sid] ?? ''
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            setLocalRemarks((r) => ({
                              ...r,
                              ca: { ...r.ca, [sid]: v },
                              test: { ...r.test, [sid]: v },
                            }));
                          }}
                          placeholder="Optional remark for this student"
                          style={{ ...SI, width: '100%', padding: '6px 10px', marginBottom: 0 }}
                        />
                      </td>
                      <td style={{ ...tdS }}>
                        {fin !== null && (
                          <Badge
                            label={fin >= 50 ? 'Pass' : 'Fail'}
                            color={fin >= 50 ? 'green' : 'red'}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Btn onClick={saveAll} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save All Marks'}
            </Btn>
            {saved && (
              <span style={{ color: SUCCESS, fontSize: 13, fontWeight: 600 }}>
                ✓ Marks saved to database!
              </span>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
