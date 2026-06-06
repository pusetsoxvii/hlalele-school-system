import { useCallback, useEffect, useState } from 'react';
import { ROLE_LBL, ROLE_NAV } from '../config';
import { useIsMobile } from '../hooks/useIsMobile';
import { apiFetch } from '../utils/api';
import { Au, G } from '../theme';
import { Btn } from './ui';
import { StudentsView } from '../views/StudentsView';
import { TeachersView } from '../views/TeachersView';
import { MarksView } from '../views/MarksView';
import { FeesView } from '../views/FeesView';
import { ReportsView } from '../views/ReportsView';

export function MainApp({ user, token, onLogout }) {
  const [section, setSection] = useState(null);
  const [students, setStudents] = useState(null);
  const [staff, setStaff] = useState(null);
  const [marks, setMarks] = useState(null);
  const [fees, setFees] = useState(null);
  const isMobile = useIsMobile();

  const api = useCallback((path, opts) => apiFetch(path, opts, token), [token]);

  useEffect(() => {
    (async () => {
      try {
        const [s, st, m, f] = await Promise.all([
          api('/api/students'),
          api('/api/staff'),
          api('/api/marks'),
          api('/api/fees'),
        ]);
        setStudents(s);
        setStaff(st);
        setMarks(m);
        setFees(f);
      } catch (e) {
        if (e.message.includes('401') || e.message.includes('Invalid')) onLogout();
      }
    })();
  }, [api, onLogout]);

  const reload = async (what) => {
    if (what === 'students') setStudents(await api('/api/students'));
    if (what === 'staff') setStaff(await api('/api/staff'));
    if (what === 'marks') setMarks(await api('/api/marks'));
    if (what === 'fees') setFees(await api('/api/fees'));
  };

  const nav = ROLE_NAV[user.role] || [];
  const active = section || nav[0]?.id;

  if (!students)
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: G,
          color: '#fff',
          gap: 12,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>HHS</div>
        <p>Loading…</p>
      </div>
    );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        minHeight: '100vh',
        background: `radial-gradient(circle at top right, rgba(200,153,26,.14), transparent 20%), radial-gradient(circle at bottom left, rgba(255,255,255,.22), transparent 24%), linear-gradient(180deg, #eef2ef 0%, #e7ece8 100%)`,
        fontFamily: "'DM Sans',Arial,sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');*{box-sizing:border-box}input:focus,select:focus{border-color:${G}!important;box-shadow:0 0 0 3px rgba(30,58,47,.1)!important}button:hover{opacity:.88}`}</style>
      <aside
        style={{
          width: isMobile ? '100%' : 228,
          background: G,
          position: isMobile ? 'static' : 'fixed',
          top: 0,
          left: 0,
          bottom: isMobile ? 'auto' : 0,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          borderRight: '1px solid rgba(255,255,255,.16)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          boxShadow: '0 18px 40px rgba(10,24,17,.14)',
        }}
      >
        <div
          style={{
            padding: '22px 18px 16px',
            borderBottom: '1px solid rgba(255,255,255,.08)',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
          }}
        >
          <button
            onClick={() => setSection(nav[0]?.id || 'students')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
            }}
          >
            <div
              style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}
            >
              <img
                src="/logo/logo.jpeg"
                alt="Hlalele"
                style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }}
              />
            </div>
            <div>
              <h2
                style={{
                  fontFamily: "'Playfair Display',serif",
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 900,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Hlalele High School
              </h2>
              <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: '4px 0 0' }}>
                Staff Portal
              </p>
            </div>
          </button>
        </div>
        <nav
          style={{
            flex: 1,
            padding: '12px 10px',
            display: isMobile ? 'grid' : 'block',
            gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : undefined,
            gap: isMobile ? 8 : 0,
          }}
        >
          {nav.map((item) => (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: isMobile ? '10px 11px' : '10px 13px',
                border: `1px solid ${active === item.id ? 'rgba(255,255,255,.28)' : 'transparent'}`,
                borderRadius: 12,
                cursor: 'pointer',
                marginBottom: isMobile ? 0 : 3,
                background: active === item.id ? 'rgba(255,255,255,.14)' : 'rgba(255,255,255,.04)',
                color: active === item.id ? '#fff' : 'rgba(255,255,255,.72)',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: active === item.id ? 700 : 500,
                textAlign: 'left',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
              }}
            >
              <span style={{ fontSize: 15 }}>{item.ico}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: '14px 16px 20px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
          <p
            style={{
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              margin: '0 0 2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.name}
          </p>
          <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, margin: '0 0 6px' }}>
            {ROLE_LBL[user.role]}
          </p>
          {user.role === 'class_teacher' && user.assignedGrade && (
            <p style={{ color: Au, fontSize: 11, margin: '0 0 10px' }}>
              Class: Grade {user.assignedGrade}
              {user.assignedClass}
            </p>
          )}
          {user.subject && (
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, margin: '0 0 10px' }}>
              Subject: {user.subject}
            </p>
          )}
          <Btn
            variant="outline"
            onClick={onLogout}
            style={{
              width: '100%',
              color: 'rgba(255,255,255,.6)',
              border: '1px solid rgba(255,255,255,.22)',
              fontSize: 12,
              padding: '7px 14px',
            }}
          >
            Sign Out
          </Btn>
        </div>
      </aside>
      <main
        style={{
          flex: 1,
          marginLeft: isMobile ? 0 : 228,
          padding: isMobile ? 16 : 32,
          minWidth: 0,
        }}
      >
        <Section
          id={active}
          user={user}
          api={api}
          reload={reload}
          students={students}
          staff={staff}
          marks={marks}
          fees={fees}
          mobile={isMobile}
        />
      </main>
    </div>
  );
}

function Section({ id, ...p }) {
  if (id === 'students') return <StudentsView {...p} />;
  if (id === 'teachers') return <TeachersView {...p} />;
  if (id === 'marks') return <MarksView {...p} />;
  if (id === 'fees') {
    const { user } = p;
    if (user && (user.role === 'teacher' || user.role === 'class_teacher')) {
      return (
        <div style={{ padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Access Denied</h3>
          <p>You do not have permission to view fee records.</p>
        </div>
      );
    }
    return <FeesView {...p} />;
  }
  if (id === 'reports') return <ReportsView {...p} />;
  return null;
}
