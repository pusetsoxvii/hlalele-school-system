export const API = import.meta.env.VITE_API_URL || '';

export const SUBJECTS = [
  'Mathematics',
  'English',
  'Sesotho',
  'Physical Science',
  'Accounting',
  'Business Studies',
  'Agriculture',
  'Biology',
  'Development Studies',
  'Computer',
  'Life Skills',
  'Religious Education',
];
export const GRADES = ['8', '9', '10', '11', '12'];
export const CLASSES = ['A', 'B', 'C', 'D', 'E'];
export const TERMS = ['Term 1', 'Term 2', 'Term 3'];
export const ANNUAL_FEE = 1500;
export const CA_WEIGHT = 0.3;
export const TEST_WEIGHT = 0.7;
export const CA_SLOTS = ['ca1', 'ca2', 'ca3', 'ca4', 'ca5'];
export const ALL_CA_TYPES = ['ca', ...CA_SLOTS];

export const CAN_ASSIGN = ['principal', 'vice_principal', 'secretary'];

export const ROLE_NAV = {
  principal: [
    { id: 'students', label: 'Students', ico: 'ST' },
    { id: 'teachers', label: 'Teachers', ico: 'TE' },
    { id: 'fees', label: 'Fees', ico: 'FE' },
    { id: 'reports', label: 'Reports', ico: 'RP' },
  ],
  vice_principal: [
    { id: 'students', label: 'Students', ico: 'ST' },
    { id: 'teachers', label: 'Teachers', ico: 'TE' },
    { id: 'reports', label: 'Reports', ico: 'RP' },
  ],
  secretary: [
    { id: 'fees', label: 'Fees', ico: 'FE' },
    { id: 'students', label: 'Students', ico: 'ST' },
    { id: 'teachers', label: 'Teachers', ico: 'TE' },
  ],
  teacher: [{ id: 'marks', label: 'Enter Marks', ico: 'MK' }],
  class_teacher: [
    { id: 'marks', label: 'Enter Marks', ico: 'MK' },
    { id: 'reports', label: 'Reports', ico: 'RP' },
  ],
};

export const ROLE_LBL = {
  principal: 'Principal',
  vice_principal: 'Vice Principal',
  secretary: 'Secretary',
  teacher: 'Subject Teacher',
  class_teacher: 'Class Teacher',
};
