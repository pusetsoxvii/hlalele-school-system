import { useState } from 'react';
import { apiFetch } from '../utils/api';
import { useIsMobile } from '../hooks/useIsMobile';
import { Btn, ErrMsg, Inp, Lbl, SI } from './ui';
import { G, MUTED } from '../theme';

export function Login({ onLogin }) {
  const [un, setUn] = useState(''),
    [pw, setPw] = useState(''),
    [err, setErr] = useState(''),
    [loading, setLoading] = useState(false),
    [showPw, setShowPw] = useState(false);
  const isMobile = useIsMobile();
  const go = async () => {
    if (!un || !pw) return setErr('Enter your username and password.');
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: un, password: pw }),
      });
      localStorage.setItem('hl_token', data.token);
      onLogin(data.user, data.token);
    } catch (e) {
      setErr(e.message);
    }
    setLoading(false);
  };
  return (
    <div
      style={{
        minHeight: '100vh',
        background: `radial-gradient(circle at top left, rgba(255,255,255,.18), transparent 30%), radial-gradient(circle at 80% 20%, rgba(200,153,26,.18), transparent 22%), linear-gradient(160deg,${G} 0%,#203f33 50%,#152b22 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? 16 : 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: -80,
          background:
            'radial-gradient(circle at 20% 20%, rgba(255,255,255,.18), transparent 22%), radial-gradient(circle at 80% 80%, rgba(255,255,255,.08), transparent 25%)',
          filter: 'blur(18px)',
          pointerEvents: 'none',
        }}
      />
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:opsz,wght@9..40,400;9..40,600;9..40,700&display=swap');*{box-sizing:border-box}input:focus,select:focus{border-color:${G}!important;box-shadow:0 0 0 3px rgba(30,58,47,.12)!important}`}</style>
      <div
        style={{
          width: '100%',
          maxWidth: 340,
          background: 'rgba(255,255,255,.97)',
          borderRadius: 18,
          padding: isMobile ? '22px 16px' : '28px 24px',
          boxShadow: '0 30px 80px rgba(0,0,0,.4)',
          fontFamily: "'DM Sans',Arial,sans-serif",
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 58,
              height: 58,
              borderRadius: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              margin: '0 auto 12px',
            }}
          >
            <img
              src="/logo/logo.jpeg"
              alt="Hlalele logo"
              style={{ width: 58, height: 58, objectFit: 'cover', display: 'block' }}
            />
          </div>
          <h1
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 20,
              color: G,
              fontWeight: 900,
              margin: 0,
            }}
          >
            Hlalele High School
          </h1>
          <p style={{ color: MUTED, fontSize: 13, margin: '6px 0 0' }}>Staff Management Portal</p>
        </div>
        <Inp
          label="Username"
          value={un}
          onChange={(e) => setUn(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && go()}
          placeholder="Your username"
          autoFocus
        />
        <div style={{ marginBottom: 16 }}>
          <Lbl text="Password" />
          <div style={{ position: 'relative' }}>
            <input
              type={showPw ? 'text' : 'password'}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && go()}
              placeholder="Your password"
              style={{ ...SI, paddingRight: 72, marginBottom: 0 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: G,
                fontSize: 12,
                fontWeight: 700,
                padding: 0,
              }}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <ErrMsg msg={err} />
        <Btn
          onClick={go}
          disabled={loading}
          style={{ width: '100%', padding: 13, fontSize: 15, borderRadius: 10 }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Btn>
      </div>
    </div>
  );
}
