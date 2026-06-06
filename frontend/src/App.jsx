import { useEffect, useState } from 'react';
import { Login } from './components/Login';
import { MainApp } from './components/MainApp';

export default function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const t = localStorage.getItem('hl_token');
    if (!t) return;
    try {
      const p = JSON.parse(atob(t.split('.')[1]));
      if (p.exp * 1000 > Date.now()) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setToken(t);
        const subjects = Array.isArray(p.subject) ? p.subject : p.subject ? [p.subject] : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUser({
          id: p.id,
          name: p.name,
          role: p.role,
          subject: subjects[0] || null,
          subjects,
          assignedGrade: p.assignedGrade,
          assignedClass: p.assignedClass,
        });
      } else {
        localStorage.removeItem('hl_token');
      }
    } catch {
      localStorage.removeItem('hl_token');
    }
  }, []);

  const onLogin = (u, t) => {
    setUser(u);
    setToken(t);
  };
  const onLogout = () => {
    localStorage.removeItem('hl_token');
    setUser(null);
    setToken(null);
  };

  if (!user) return <Login onLogin={onLogin} />;
  return <MainApp user={user} token={token} onLogout={onLogout} />;
}
