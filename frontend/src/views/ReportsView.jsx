import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ANNUAL_FEE, CA_SLOTS, CLASSES, GRADES, SUBJECTS, TERMS } from '../config';
import { calcFinalFull, getCaScoreAverage, isCaType } from '../utils/marks';
import { buildClassCsv, buildStudentCsv, buildStudentFeeCsv, downloadClassPdf, downloadStudentFeePdf, downloadStudentPdf, downloadTextFile, feeSummary, getStudentReportData, loadImageAsDataUrl, toCsv } from '../utils/reportExports';
import { Au, BG, DANGER, G, MUTED, SUCCESS, TEXT_MUTED } from '../theme';
import { Badge, Btn, Card, DataTable, Lbl, PageHdr, Sel, SI } from '../components/ui';

export function ReportsView({ user, students, marks, fees, staff = [], mobile = false }) {
  const isCT = user.role === 'class_teacher';
  const [grade, setGrade] = useState(isCT ? user.assignedGrade : '8');
  const [cls, setCls] = useState(isCT ? user.assignedClass : 'A');
  const [term, setTerm] = useState('Term 1');
  const [dlAll, setDlAll] = useState(false);
  const [remarks, setRemarks] = useState({ teacher: '', classTeacher: '', principal: '' });

  const classStudents = students.filter((s) => s.grade === grade && s.class === cls);

  const ranked = classStudents
    .map((s) => {
      const sm = marks.filter((m) => String(m.studentId) === String(s._id) && m.term === term);
      const finals = SUBJECTS.map((sub) => {
        const subjectMarks = sm.filter((m) => m.subject === sub);
        const ca = getCaScoreAverage(subjectMarks.filter((m) => isCaType(m.type)));
        const test = sm.find((m) => m.subject === sub && m.type === 'test')?.score ?? null;
        return calcFinalFull(ca, test);
      }).filter((v) => v !== null);
      const avg = finals.length ? (finals.reduce((a, v) => a + v, 0) / finals.length).toFixed(1) : null;
      const sf = fees.filter((f) => String(f.studentId) === String(s._id));
      const paid = sf.reduce((a, f) => a + f.amount, 0);
      return { ...s, avg, paid, owe: Math.max(0, ANNUAL_FEE - paid), finalsCount: finals.length };
    })
    .sort((a, b) => (parseFloat(b.avg) || 0) - (parseFloat(a.avg) || 0));

  const subjectAvgs = SUBJECTS.map((sub) => {
    const finals = classStudents
      .map((s) => {
        const sm = marks.filter((m) => String(m.studentId) === String(s._id) && m.term === term);
        const subjectMarks = sm.filter((m) => m.subject === sub);
        const ca = getCaScoreAverage(subjectMarks.filter((m) => isCaType(m.type)));
        const test = sm.find((m) => m.subject === sub && m.type === 'test')?.score ?? null;
        return calcFinalFull(ca, test);
      })
      .filter((v) => v !== null);

    const caSlots = CA_SLOTS.map((slot) => {
      const vals = classStudents
        .map((s) => {
          const sm = marks.filter((m) => String(m.studentId) === String(s._id) && m.term === term && m.subject === sub);
          const mk = sm.find((m) => m.type === slot);
          return mk ? mk.score : null;
        })
        .filter((v) => v != null);
      return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
    });

    return {
      sub,
      avg: finals.length ? (finals.reduce((a, v) => a + v, 0) / finals.length).toFixed(1) : null,
      caSlots,
    };
  });
  const classFeeSummary = feeSummary(
    fees.filter((fee) => classStudents.some((student) => String(student._id) === String(fee.studentId)))
  );

  const includeFeesAllowed = !(user.role === 'teacher' || user.role === 'class_teacher');

  const updateRemark = (key) => (event) => {
    const value = event.target.value;
    setRemarks((prev) => ({ ...prev, [key]: value }));
  };

  // per-subject custom remarks removed; remarks are entered with marks now

  const dlPdf = async (student) => {
    const data = getStudentReportData(student, term, marks, fees, students, staff, {});
    await downloadStudentPdf(data, remarks, includeFeesAllowed);
  };

  const dlCsv = (student) => {
    const data = getStudentReportData(student, term, marks, fees, students, staff, {});
    downloadTextFile(
      `${student.name.replace(/\s+/g, '_')}_${term.replace(/\s+/g, '_')}.csv`,
      buildStudentCsv(data, remarks, includeFeesAllowed),
      'text/csv;charset=utf-8;'
    );
  };

  const dlBatch = () => {
    setDlAll(true);
    ranked.forEach((s, i) => setTimeout(() => void dlPdf(s), i * 350));
    setTimeout(() => setDlAll(false), ranked.length * 350 + 500);
  };

  const downloadClassPdfReport = async () => {
    await downloadClassPdf(ranked, subjectAvgs, classFeeSummary, grade, cls, term, remarks, includeFeesAllowed);
  };

  const downloadClassCsvReport = () => {
    downloadTextFile(
      `Grade_${grade}${cls}_${term.replace(/\s+/g, '_')}.csv`,
      buildClassCsv(ranked, subjectAvgs, classFeeSummary, grade, cls, term, remarks, includeFeesAllowed),
      'text/csv;charset=utf-8;'
    );
  };

  const buildClassFeeCsv = (classStudents, term, fees) => {
    const rows = [
      ['Hlalele High School'],
      ['Class Fee Report', `Grade ${grade}${cls}`, term],
      [],
      ['Student Name', 'Student No.', 'Date', 'Amount', 'Method', 'Reference', 'Paid By', 'Recorded By'],
      ...classStudents.flatMap((s) =>
        fees
          .filter((f) => String(f.studentId) === String(s._id) && f.term === term)
          .map((f) => [s.name, s.studentNo, f.date, `M ${f.amount.toLocaleString()}`, (f.paymentMethod || 'mpesa').toUpperCase(), f.paymentMethod === 'mpesa' ? f.mpesaRef : f.reference || '', f.paidBy || '', f.recordedBy || ''])
      ),
    ];
    return toCsv(rows);
  };

  const downloadClassFeePdf = async (classStudents, term, fees) => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const logo = await loadImageAsDataUrl('/logo/logo.jpeg').catch(() => null);
    if (logo) doc.addImage(logo, 'JPEG', 14, 12, 18, 18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(`Hlalele High School - Class Fees Grade ${grade}${cls}`, logo ? 36 : 14, 20);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');

    const rows = classStudents.flatMap((s) =>
      fees
        .filter((f) => String(f.studentId) === String(s._id) && f.term === term)
        .map((f) => [s.name, s.studentNo, f.date, `M ${f.amount.toLocaleString()}`, (f.paymentMethod || 'mpesa').toUpperCase(), f.paymentMethod === 'mpesa' ? f.mpesaRef : f.reference || '', f.paidBy || '', f.recordedBy || ''])
    );

    autoTable(doc, {
      startY: 36,
      head: [['Student', 'No.', 'Date', 'Amount', 'Method', 'Reference', 'Paid By', 'Recorded By']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [92, 121, 95] },
    });
    doc.save(`Grade_${grade}${cls}_fees_${term.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div>
      <PageHdr title="Report Cards" sub="PDF and CSV exports with CA, remarks, and class summaries" />
      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)',
            gap: mobile ? 0 : '0 20px',
          }}
        >
          {!isCT ? (
            <>
              <Sel label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    Grade {g}
                  </option>
                ))}
              </Sel>
              <Sel label="Class" value={cls} onChange={(e) => setCls(e.target.value)}>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Sel>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 16 }}>
                <Lbl text="Your Assigned Class" />
                <div
                  style={{
                    padding: '10px 14px',
                    background: BG,
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 700,
                    color: G,
                  }}
                >
                  Grade {grade}
                  {cls}
                </div>
              </div>
              <div />
            </>
          )}
          <Sel label="Term" value={term} onChange={(e) => setTerm(e.target.value)}>
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Sel>
        </div>
      </Card>

      <Card style={{ marginBottom: 20 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)',
            gap: 14,
          }}
        >
          {[
            ['teacher', 'Teacher Remarks'],
            ['classTeacher', 'Class Teacher Remarks'],
            ['principal', 'Principal Remarks'],
          ].map(([key, label]) => (
            <div key={key}>
              <Lbl text={label} />
              <textarea
                value={remarks[key]}
                onChange={updateRemark(key)}
                rows={4}
                placeholder={`Enter ${label.toLowerCase()}`}
                style={{
                  ...SI,
                  minHeight: 112,
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Per-subject remarks are now entered during mark entry and persisted with marks. */}

      {classStudents.length === 0 ? (
        <Card>
          <p style={{ textAlign: 'center', color: MUTED, padding: 32 }}>
            No students in Grade {grade}
            {cls}.
          </p>
        </Card>
      ) : (
        <>
          <Card style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
                marginBottom: 18,
              }}
            >
              <h3 style={{ color: G, fontSize: 15, fontWeight: 700, margin: 0 }}>
                Grade {grade}
                {cls} · {term} · {classStudents.length} students
              </h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Btn variant="outline" onClick={downloadClassCsvReport}>
                  ⬇ Class CSV
                </Btn>
                <Btn onClick={() => void downloadClassPdfReport()}>⬇ Class PDF</Btn>
                {includeFeesAllowed && (
                  <>
                    <Btn
                      variant="outline"
                      onClick={() => {
                        downloadTextFile(
                          `Grade_${grade}${cls}_fees_${term.replace(/\s+/g, '_')}.csv`,
                          buildClassFeeCsv(ranked, term, fees),
                          'text/csv;charset=utf-8;'
                        );
                      }}
                    >
                      ⬇ Class Fees CSV
                    </Btn>
                    <Btn onClick={() => void downloadClassFeePdf(ranked, term, fees)}>⬇ Class Fees PDF</Btn>
                  </>
                )}
                <Btn variant="gold" onClick={dlBatch} disabled={dlAll}>
                  {dlAll ? 'Downloading…' : '⬇ All Student PDFs'}
                </Btn>
              </div>
            </div>

            <DataTable
              cols={[
                'Pos.',
                'Student Name',
                'Student No.',
                'Final Average',
                'Subjects Done',
                'Fee Status',
                'Download',
              ]}
              rows={ranked.map((s, i) => [
                <span
                  key={`pos-${s._id}`}
                  style={{
                    fontWeight: 800,
                    color: i === 0 ? Au : i === 1 ? MUTED : i === 2 ? '#CD7F32' : TEXT_MUTED,
                    fontSize: 14,
                  }}
                >
                  {i + 1}
                  {['🥇', '🥈', '🥉'][i] || ''}
                </span>,
                s.name,
                <span key={`sno-${s._id}`} style={{ fontFamily: 'monospace', fontSize: 12 }}>{s.studentNo}</span>,
                s.avg ? (
                  <strong key={`avg-${s._id}`} style={{ color: parseFloat(s.avg) >= 50 ? SUCCESS : DANGER }}>
                    {s.avg}%
                  </strong>
                ) : (
                  <span key={`avg-empty-${s._id}`} style={{ color: MUTED }}>—</span>
                ),
                <span key={`count-${s._id}`} style={{ color: TEXT_MUTED }}>
                  {s.finalsCount}/{SUBJECTS.length}
                </span>,
                <Badge
                  key={`status-${s._id}`}
                  label={s.owe === 0 ? 'Fully Paid' : s.paid > 0 ? 'Partial' : 'Unpaid'}
                  color={s.owe === 0 ? 'green' : s.paid > 0 ? 'yellow' : 'red'}
                />,
                <div key={`dl-${s._id}`} style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Btn onClick={() => void dlPdf(s)} style={{ padding: '5px 12px', fontSize: 12 }}>
                    PDF
                  </Btn>
                  <Btn
                    variant="outline"
                    onClick={() => dlCsv(s)}
                    style={{ padding: '5px 12px', fontSize: 12 }}
                  >
                    CSV
                  </Btn>
                  {includeFeesAllowed && (
                    <>
                      <Btn
                        variant="outline"
                        onClick={() => {
                          downloadTextFile(
                            `${s.name.replace(/\s+/g, '_')}_fees_${term.replace(/\s+/g, '_')}.csv`,
                            buildStudentFeeCsv(s, term, fees),
                            'text/csv;charset=utf-8;'
                          );
                        }}
                        style={{ padding: '5px 12px', fontSize: 12 }}
                      >
                        Fees CSV
                      </Btn>
                      <Btn
                        onClick={() => void downloadStudentFeePdf(s, term, fees)}
                        style={{ padding: '5px 12px', fontSize: 12 }}
                      >
                        Fees PDF
                      </Btn>
                    </>
                  )}
                </div>,
              ])}
            />
          </Card>

          <Card>
            <h3 style={{ color: G, fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Class Subject Averages (Weighted Finals) — {term}
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: mobile ? '1fr' : 'repeat(3,1fr)',
                gap: 10,
              }}
            >
              {subjectAvgs.map((s) => (
                <div
                  key={s.sub}
                  style={{
                    background: BG,
                    borderRadius: 8,
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontSize: 13, color: G, fontWeight: 500 }}>{s.sub}</span>
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: s.avg ? (parseFloat(s.avg) >= 50 ? SUCCESS : DANGER) : MUTED,
                    }}
                  >
                    {s.avg ? `${s.avg}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
