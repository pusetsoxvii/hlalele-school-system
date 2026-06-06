import { ALL_CA_TYPES, CA_SLOTS, CA_WEIGHT, TEST_WEIGHT } from '../config';

export function calcFinal(ca, test) {
  if (ca != null && test != null) return +(ca * CA_WEIGHT + test * TEST_WEIGHT).toFixed(1);
  if (ca != null) return null; // incomplete — don't compute partial weighted
  if (test != null) return null;
  return null;
}
export function calcFinalFull(ca, test) {
  // Used in reports — show whatever we have
  if (ca != null && test != null) return +(ca * CA_WEIGHT + test * TEST_WEIGHT).toFixed(1);
  return null;
}
export function gradeLabel(score) {
  if (score == null) return '—';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
export function remarkLabel(score) {
  if (score == null) return 'Not assessed';
  if (score >= 80) return 'Excellent';
  if (score >= 70) return 'Very Good';
  if (score >= 60) return 'Good';
  if (score >= 50) return 'Satisfactory';
  return 'Below Standard';
}

export function isCaType(type) {
  return ALL_CA_TYPES.includes(type);
}

export function getCaMarks(marks, studentId, subject, term) {
  return marks.filter(
    (m) => String(m.studentId) === String(studentId) && m.subject === subject && m.term === term && isCaType(m.type)
  );
}

export function getCaScoreAverage(caMarks) {
  const scores = caMarks.map((m) => m.score).filter((score) => score != null);
  return scores.length ? +(scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : null;
}

export function getCaReferenceMark(caMarks) {
  return caMarks.find((mark) => CA_SLOTS.includes(mark.type)) || caMarks.find((mark) => mark.type === 'ca') || null;
}
