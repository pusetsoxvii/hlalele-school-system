import { DANGER, G, GLASS, GLASS_EDGE, GLASS_SHADOW, MUTED, PRIMARY, SUCCESS } from '../theme';

export const SI = {
  border: `1px solid ${GLASS_EDGE}`,
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 13,
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  color: '#10221A',
  outline: 'none',
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: 'none',
};

export function Btn({ children, variant = 'primary', onClick, style = {}, disabled = false }) {
  const map = {
    primary: [PRIMARY, '#fff', `1px solid ${GLASS_EDGE}`],
    gold: ['rgba(200,153,26,0.96)', '#fff', `1px solid ${GLASS_EDGE}`],
    danger: ['rgba(220,38,38,0.92)', '#fff', `1px solid ${GLASS_EDGE}`],
    outline: ['transparent', PRIMARY, `1px solid ${GLASS_EDGE}`],
  };
  const [bg, cl, bo] = map[variant] || map.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: bg,
        color: cl,
        border: bo,
        padding: '9px 18px',
        borderRadius: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 700,
        fontSize: 13,
        fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
        boxShadow: GLASS_SHADOW,
        transition: 'transform .12s ease, opacity .12s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
export function Card({ children, style = {} }) {
  return (
    <div
      style={{
        background: GLASS,
        border: `1px solid ${GLASS_EDGE}`,
        borderRadius: 12,
        boxShadow: GLASS_SHADOW,
        padding: 18,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
export function Lbl({ text }) {
  return (
    <label
      style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'rgba(16,34,26,.82)',
        marginBottom: 6,
        display: 'block',
      }}
    >
      {text}
    </label>
  );
}
export function Inp({ label, ...p }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <Lbl text={label} />}
      <input style={SI} {...p} />
    </div>
  );
}
export function Sel({ label, children, ...p }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {label && <Lbl text={label} />}
      <select style={{ ...SI, appearance: 'none' }} {...p}>
        {children}
      </select>
    </div>
  );
}
export function Badge({ label, color = 'green' }) {
  const map = {
    green: ['rgba(220,252,231,.55)', '#15803D'],
    red: ['rgba(254,226,226,.55)', '#DC2626'],
    yellow: ['rgba(254,249,195,.55)', '#A16207'],
    gray: ['rgba(243,244,246,.45)', '#374151'],
    blue: ['rgba(219,234,254,.55)', '#1D4ED8'],
    purple: ['rgba(243,232,255,.55)', '#7C3AED'],
  };
  const [bg, tc] = map[color] || map.gray;
  return (
    <span
      style={{
        background: bg,
        color: tc,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        border: `1px solid ${GLASS_EDGE}`,
      }}
    >
      {label}
    </span>
  );
}
export function PageHdr({ title, sub }) {
  return (
    <div style={{ marginBottom: 28, padding: '4px 2px' }}>
      <h1
        style={{
          fontFamily: "'Playfair Display',Georgia,serif",
          fontSize: 26,
          fontWeight: 900,
          color: G,
          margin: 0,
          textShadow: '0 1px 0 rgba(255,255,255,.35)',
        }}
      >
        {title}
      </h1>
      {sub && <p style={{ color: 'rgba(16,34,26,.7)', fontSize: 14, margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}
export function DataTable({ cols, rows, empty = 'No records found.' }) {
  const thS = {
    textAlign: 'left',
    padding: '11px 16px',
    fontSize: 12,
    fontWeight: 800,
    color: G,
    background: 'rgba(255,255,255,.45)',
    borderBottom: `1px solid ${GLASS_EDGE}`,
    whiteSpace: 'nowrap',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
  };
  const tdS = {
    padding: '10px 16px',
    fontSize: 13,
    borderBottom: `1px solid rgba(255,255,255,.2)`,
    verticalAlign: 'middle',
    background: 'rgba(255,255,255,.14)',
  };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c} style={thS}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={cols.length}
                style={{ ...tdS, textAlign: 'center', color: MUTED, padding: 32 }}
              >
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FDFCF9' }}>
                {row.map((cell, j) => (
                  <td key={j} style={tdS}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
export function ErrMsg({ msg }) {
  return msg ? <p style={{ color: DANGER, fontSize: 13, marginBottom: 12 }}>{msg}</p> : null;
}
export function OkMsg({ msg }) {
  return msg ? <p style={{ color: SUCCESS, fontSize: 13, fontWeight: 600 }}>{msg}</p> : null;
}
