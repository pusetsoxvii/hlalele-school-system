import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ANNUAL_FEE, CA_SLOTS, SUBJECTS } from '../config';
import { calcFinalFull, getCaScoreAverage, getCaReferenceMark, gradeLabel, isCaType, remarkLabel } from './marks';

export function csvCell(value) {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows) {
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}

export function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function loadImageAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Unable to read image'));
    reader.readAsDataURL(blob);
  });
}

export function getStudentReportData(student, term, marks, fees, allStudents, staff = [], subjectRemarkOverrides = {}) {
  const staffById = Object.fromEntries(staff.map((member) => [String(member._id), member.name]));
  const subjectRows = SUBJECTS.map((sub) => {
    const sm = marks.filter((m) => String(m.studentId) === String(student._id) && m.term === term && m.subject === sub);
    const caMarks = sm.filter((m) => isCaType(m.type));
    const caM = getCaReferenceMark(caMarks);
    const testM = sm.find((m) => m.subject === sub && m.type === 'test');
    const ca = getCaScoreAverage(caMarks);
    const caSlotsValues = CA_SLOTS.map((slot) => {
      const mk = caMarks.find((m) => m.type === slot);
      return mk ? mk.score : null;
    });
    const test = testM?.score ?? null;
    const final = calcFinalFull(ca, test);
    const defaultRemark = remarkLabel(final);
    return {
      subject: sub,
      ca,
      caSlots: caSlotsValues,
      test,
      final,
      grade: gradeLabel(final),
      remark:
        (caM?.remark && String(caM.remark).trim()) ||
        (testM?.remark && String(testM.remark).trim()) ||
        subjectRemarkOverrides[sub]?.trim() ||
        defaultRemark,
      caTeacher: caM?.teacherId ? staffById[String(caM.teacherId)] || '—' : '—',
      testTeacher: testM?.teacherId ? staffById[String(testM.teacherId)] || '—' : '—',
    };
  });

    // Compute class-wide subject averages and highs for the student's class
    const classStudents = allStudents.filter((s) => s.grade === student.grade && s.class === student.class);
    const subjectStats = Object.fromEntries(
      SUBJECTS.map((sub) => {
        const finals = classStudents
          .map((mate) => {
            const mm = marks.filter((m) => String(m.studentId) === String(mate._id) && m.term === term && m.subject === sub);
            const ca = getCaScoreAverage(mm.filter((m) => isCaType(m.type)));
            const test = mm.find((m) => m.subject === sub && m.type === 'test')?.score ?? null;
            return calcFinalFull(ca, test);
          })
          .filter((v) => v !== null);
        const avg = finals.length ? +(finals.reduce((a, v) => a + v, 0) / finals.length).toFixed(1) : null;
        const high = finals.length ? Math.max(...finals) : null;
        return [sub, { avg, high }];
      })
    );

    // attach class stats to each subject row
    subjectRows.forEach((r) => {
      const st = subjectStats[r.subject] || { avg: null, high: null };
      r.classAvg = st.avg;
      r.highest = st.high;
    });

    const scored = subjectRows.filter((row) => row.final !== null);
  const total = scored.reduce((sum, row) => sum + row.final, 0);
  const average = scored.length ? (total / scored.length).toFixed(1) : null;

  const classMates = allStudents.filter((s) => s.grade === student.grade && s.class === student.class);
  const classRank = classMates
    .map((mate) => {
      const mateMarks = marks.filter((m) => String(m.studentId) === String(mate._id) && m.term === term);
      const finals = SUBJECTS.map((sub) => {
        const subjectMarks = mateMarks.filter((m) => m.subject === sub);
        const ca = getCaScoreAverage(subjectMarks.filter((m) => isCaType(m.type)));
        const test = mateMarks.find((m) => m.subject === sub && m.type === 'test')?.score ?? null;
        return calcFinalFull(ca, test);
      }).filter((value) => value !== null);
      return {
        id: String(mate._id),
        average: finals.length ? finals.reduce((sum, value) => sum + value, 0) / finals.length : 0,
      };
    })
    .sort((a, b) => b.average - a.average);

  const position = classRank.findIndex((row) => row.id === String(student._id)) + 1;
  const studentFees = fees.filter((fee) => String(fee.studentId) === String(student._id));
  const paid = studentFees.reduce((sum, fee) => sum + fee.amount, 0);
  const owing = Math.max(0, ANNUAL_FEE - paid);
  const feeMethodSummary = feeSummary(studentFees);

  return {
    student,
    term,
    subjectRows,
    average,
    scoredCount: scored.length,
    position,
    classSize: classMates.length,
    paid,
    owing,
    feeMethodSummary,
  };
}

export function feeSummary(feeEntries = []) {
  return ['mpesa', 'cash', 'bank'].map((method) => {
    const methodEntries = feeEntries.filter((fee) => (fee.paymentMethod || 'mpesa') === method);
    return {
      method,
      count: methodEntries.length,
      amount: methodEntries.reduce((sum, fee) => sum + fee.amount, 0),
    };
  });
}

export function buildStudentCsv(data, remarks, includeFees = true) {
  const rows = [
    ['Hlalele High School'],
    ['Student Progress Report', data.term],
    [],
    ['Student Name', data.student.name],
    ['Student No.', data.student.studentNo],
    ['Grade & Class', `Grade ${data.student.grade}${data.student.class}`],
    ['Parent / Guardian', data.student.parentName || ''],
    ['Overall Average', data.average ? `${data.average}%` : '—'],
    ['Class Position', data.position > 0 ? `${data.position}` : '—'],
    ['Class Size', `${data.classSize}`],
    ['Subjects Assessed', `${data.scoredCount}/${SUBJECTS.length}`],
    ['Fee Paid', `M ${data.paid.toLocaleString()}`],
    ['Fee Owing', `M ${data.owing.toLocaleString()}`],
    ['Fee Status', data.owing === 0 ? 'Fully Paid' : data.paid > 0 ? 'Partial' : 'Unpaid'],
    [],
  ];
  if (includeFees) {
    rows.push([], ['Fee Method Breakdown', 'Count', 'Amount']);
    rows.push(...data.feeMethodSummary.map((row) => [row.method.toUpperCase(), `${row.count}`, `M ${row.amount.toLocaleString()}`]));
  }
  rows.push(
    [],
    ['Subject', 'CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'CA Avg (30%)', 'CA Teacher', 'Test (70%)', 'Test Teacher', 'Final Mark', 'Class Avg', 'Highest', 'Grade', 'Remarks'],
    ...data.subjectRows.map((row) => [
      row.subject,
      ...(row.caSlots || []).map((v) => (v != null ? `${v}%` : '')),
      row.ca != null ? `${row.ca}%` : '',
      row.caTeacher,
      row.test != null ? `${row.test}%` : '',
      row.testTeacher,
      row.final != null ? `${row.final}%` : '',
      row.classAvg != null ? `${row.classAvg}%` : '',
      row.highest != null ? `${row.highest}%` : '',
      row.final != null ? row.grade : '',
      row.remark,
    ]),
  );
  rows.push([], ['Teacher Remarks', remarks.teacher || ''], ['Class Teacher Remarks', remarks.classTeacher || ''], ['Principal Remarks', remarks.principal || '']);
  return toCsv(rows);
}

export function buildStudentFeeCsv(student, term, fees) {
  const rows = [
    ['Hlalele High School'],
    ['Student Fee Report', term],
    [],
    ['Student Name', student.name],
    ['Student No.', student.studentNo],
    ['Grade & Class', `Grade ${student.grade}${student.class}`],
    [],
    ['Date', 'Amount', 'Method', 'Reference', 'Paid By', 'Recorded By'],
    ...fees
      .filter((f) => String(f.studentId) === String(student._id) && f.term === term)
      .map((f) => [f.date, `M ${f.amount.toLocaleString()}`, (f.paymentMethod || 'mpesa').toUpperCase(), f.paymentMethod === 'mpesa' ? f.mpesaRef : f.reference || '', f.paidBy || '', f.recordedBy || '']),
  ];
  return toCsv(rows);
}

export async function downloadStudentFeePdf(student, term, fees) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadImageAsDataUrl('/logo/logo.jpeg').catch(() => null);
  if (logo) doc.addImage(logo, 'JPEG', 14, 12, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Hlalele High School - Student Fees', logo ? 36 : 14, 20);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${student.name} — ${student.studentNo} — Grade ${student.grade}${student.class}`, 14, 30);

  const rows = fees
    .filter((f) => String(f.studentId) === String(student._id) && f.term === term)
    .map((f) => [f.date, `M ${f.amount.toLocaleString()}`, (f.paymentMethod || 'mpesa').toUpperCase(), f.paymentMethod === 'mpesa' ? f.mpesaRef : f.reference || '', f.paidBy || '', f.recordedBy || '']);

  autoTable(doc, {
    startY: 36,
    head: [['Date', 'Amount', 'Method', 'Reference', 'Paid By', 'Recorded By']],
    body: rows,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [92, 121, 95] },
  });
  doc.save(`${student.name.replace(/\s+/g, '_')}_fees_${term.replace(/\s+/g, '_')}.pdf`);
}

export function buildClassCsv(classRows, subjectAvgs, classFeeSummary, grade, cls, term, remarks, includeFees = true) {
  const rows = [['Hlalele High School'], [`Class Report`, `Grade ${grade}${cls}`, term], []];

  if (includeFees) {
    rows.push(['Position', 'Student Name', 'Student No.', 'Final Average', 'Subjects Assessed', 'Fee Status', 'Fee Paid', 'Fee Owing']);
    rows.push(
      ...classRows.map((row, index) => [
        index + 1,
        row.name,
        row.studentNo,
        row.avg ? `${row.avg}%` : '—',
        `${row.finalsCount}/${SUBJECTS.length}`,
        row.owe === 0 ? 'Fully Paid' : row.paid > 0 ? 'Partial' : 'Unpaid',
        `M ${row.paid.toLocaleString()}`,
        `M ${row.owe.toLocaleString()}`,
      ])
    );
  } else {
    rows.push(['Position', 'Student Name', 'Student No.', 'Final Average', 'Subjects Assessed']);
    rows.push(...classRows.map((row, index) => [index + 1, row.name, row.studentNo, row.avg ? `${row.avg}%` : '—', `${row.finalsCount}/${SUBJECTS.length}`]));
  }

  rows.push([], ['Subject Averages', 'CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'Weighted Final']);
  rows.push(...subjectAvgs.map((row) => [row.sub, ...(row.caSlots || []).map((v) => (v != null ? `${v}%` : '—')), row.avg ? `${row.avg}%` : '—']));

  if (includeFees) {
    rows.push([], ['Fee Method Breakdown', 'Count', 'Amount']);
    rows.push(...classFeeSummary.map((row) => [row.method.toUpperCase(), `${row.count}`, `M ${row.amount.toLocaleString()}`]));
  }

  rows.push([], ['Teacher Remarks', remarks.teacher || ''], ['Class Teacher Remarks', remarks.classTeacher || ''], ['Principal Remarks', remarks.principal || '']);
  return toCsv(rows);
}

export async function downloadStudentPdf(data, remarks, includeFees = true) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const logo = await loadImageAsDataUrl('/logo/logo.jpeg').catch(() => null);
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  if (logo) doc.addImage(logo, 'JPEG', 14, 12, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Hlalele High School', logo ? 36 : 14, 19);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Student Progress Report - ${data.term}`, logo ? 36 : 14, 26);
  doc.text(`Grade ${data.student.grade}${data.student.class} | ${data.student.name}`, 14, 38);
  doc.text(`Student No.: ${data.student.studentNo}`, 14, 44);
  doc.text(`Parent / Guardian: ${data.student.parentName || '—'}`, 14, 50);

  autoTable(doc, {
    startY: 56,
    margin: { left: 10, right: 10 },
    tableWidth: 'wrap',
    head: [['Subject', 'CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'CA Avg', 'CA Teacher', 'Test', 'Test Teacher', 'Final', 'Class Avg', 'Highest', 'Grade', 'Remarks']],
    body: data.subjectRows.map((row) => [
      row.subject,
      ...(row.caSlots || []).map((v) => (v != null ? `${v}%` : '—')),
      row.ca != null ? `${row.ca}%` : '—',
      row.caTeacher,
      row.test != null ? `${row.test}%` : '—',
      row.testTeacher,
      row.final != null ? `${row.final}%` : '—',
      row.classAvg != null ? `${row.classAvg}%` : '—',
      row.highest != null ? `${row.highest}%` : '—',
      row.final != null ? row.grade : '—',
      row.remark,
    ]),
    styles: {
      fontSize: 7.2,
      cellPadding: 1.4,
      overflow: 'linebreak',
      valign: 'middle',
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [107, 62, 38],
      fontSize: 6.8,
      halign: 'center',
      valign: 'middle',
      overflow: 'linebreak',
    },
    bodyStyles: { minCellHeight: 6 },
    columnStyles: {
      0: { cellWidth: 28, halign: 'left' },
      1: { cellWidth: 10, halign: 'center' },
      2: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 10, halign: 'center' },
      6: { cellWidth: 16, halign: 'center' },
      7: { cellWidth: 24, halign: 'left' },
      8: { cellWidth: 14, halign: 'center' },
      9: { cellWidth: 24, halign: 'left' },
      10: { cellWidth: 14, halign: 'center' },
      11: { cellWidth: 16, halign: 'center' },
      12: { cellWidth: 14, halign: 'center' },
      13: { cellWidth: 10, halign: 'center' },
      14: { cellWidth: 37, halign: 'left' },
    },
  });

  const summaryY = doc.lastAutoTable.finalY + 8;
  const summaryItems = [
    [`Overall Average`, data.average ? `${data.average}%` : '—'],
    [`Class Position`, data.position > 0 ? `${data.position}` : '—'],
    [`Class Size`, `${data.classSize}`],
    [`Subjects Assessed`, `${data.scoredCount}/${SUBJECTS.length}`],
  ];
  if (includeFees) {
    summaryItems.push([`Fee Paid`, `M ${data.paid.toLocaleString()}`], [`Fee Owing`, `M ${data.owing.toLocaleString()}`]);
  }

  autoTable(doc, {
    startY: summaryY,
    margin: { left: 10, right: pageWidth - 90 },
    head: [['Summary', 'Value']],
    body: summaryItems,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [200, 153, 26] },
  });

  const remarksY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Remarks', 14, remarksY);
  doc.setFont('helvetica', 'normal');
  const remarkSections = [
    ['Teacher Remarks', remarks.teacher || 'No remarks provided.'],
    ['Class Teacher Remarks', remarks.classTeacher || 'No remarks provided.'],
    ['Principal Remarks', remarks.principal || 'No remarks provided.'],
  ];
  let cursorY = remarksY + 6;
  remarkSections.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, cursorY);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value, pageWidth - 28);
    doc.text(lines, 14, cursorY + 5);
    cursorY += 5 + lines.length * 4 + 3;
  });

  doc.setFontSize(10);
  if (cursorY > pageHeight - 24) {
    doc.addPage();
  }
  doc.text('Class Teacher Signature ____________________', 14, pageHeight - 14);
  doc.text('Principal Signature ____________________', pageWidth / 2, pageHeight - 14);

  doc.save(`${data.student.name.replace(/\s+/g, '_')}_${data.term.replace(/\s+/g, '_')}.pdf`);
}

export async function downloadClassPdf(classRows, subjectAvgs, classFeeSummary, grade, cls, term, remarks, includeFees = true) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logo = await loadImageAsDataUrl('/logo/logo.jpeg').catch(() => null);

  if (logo) doc.addImage(logo, 'JPEG', 14, 12, 18, 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Hlalele High School', logo ? 36 : 14, 19);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Class Report - Grade ${grade}${cls} - ${term}`, logo ? 36 : 14, 26);

  if (includeFees) {
    autoTable(doc, {
      startY: 36,
      head: [['Position', 'Student Name', 'Student No.', 'Final Average', 'Subjects', 'Fee Status', 'Fee Paid', 'Fee Owing']],
      body: classRows.map((row, index) => [
        index + 1,
        row.name,
        row.studentNo,
        row.avg ? `${row.avg}%` : '—',
        `${row.finalsCount}/${SUBJECTS.length}`,
        row.owe === 0 ? 'Fully Paid' : row.paid > 0 ? 'Partial' : 'Unpaid',
        `M ${row.paid.toLocaleString()}`,
        `M ${row.owe.toLocaleString()}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [107, 62, 38] },
    });
  } else {
    autoTable(doc, {
      startY: 36,
      head: [['Position', 'Student Name', 'Student No.', 'Final Average', 'Subjects']],
      body: classRows.map((row, index) => [
        index + 1,
        row.name,
        row.studentNo,
        row.avg ? `${row.avg}%` : '—',
        `${row.finalsCount}/${SUBJECTS.length}`,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [107, 62, 38] },
    });
  }

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Subject', 'CA1', 'CA2', 'CA3', 'CA4', 'CA5', 'Weighted Final Average']],
    body: subjectAvgs.map((row) => [row.sub, ...(row.caSlots || []).map((v) => (v != null ? `${v}%` : '—')), row.avg ? `${row.avg}%` : '—']),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [200, 153, 26] },
    columnStyles: { 0: { cellWidth: 26 } },
  });

  if (includeFees) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 8,
      head: [['Fee Method', 'Count', 'Amount']],
      body: classFeeSummary.map((row) => [row.method.toUpperCase(), `${row.count}`, `M ${row.amount.toLocaleString()}`]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [92, 121, 95] },
    });
  }

  const remarksY = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Class Remarks', 14, remarksY);
  doc.setFont('helvetica', 'normal');
  const lines = [
    ['Teacher Remarks', remarks.teacher || 'No remarks provided.'],
    ['Class Teacher Remarks', remarks.classTeacher || 'No remarks provided.'],
    ['Principal Remarks', remarks.principal || 'No remarks provided.'],
  ];
  let cursorY = remarksY + 6;
  lines.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 14, cursorY);
    doc.setFont('helvetica', 'normal');
    const wrapped = doc.splitTextToSize(value, 175);
    doc.text(wrapped, 14, cursorY + 5);
    cursorY += 5 + wrapped.length * 4 + 3;
  });

  doc.save(`Grade_${grade}${cls}_${term.replace(/\s+/g, '_')}.pdf`);
}
