import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import api from '../lib/api';
import './login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login';
      const res = await api.post(endpoint, { email, password });
      if (isRegister) {
        setIsRegister(false);
        toast.success('ACCOUNT_CREATED — Please authenticate.');
      } else {
        setAuth(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(msg || 'AUTH_FAILED — Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/demo');
      setAuth(res.data.user, res.data.token);
      toast.success('DEMO_SESSION_INITIALIZED');
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setError(msg || 'DEMO_INIT_FAILED — Is the server running?');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-shell">
        <div className="login-card">
          <div className="login-brand">
            <h1 className="login-title">STOCKSAGE</h1>
          </div>

          <div className="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={!isRegister}
              className={`login-tab${!isRegister ? ' login-tab--on' : ''}`}
              onClick={() => { setIsRegister(false); setError(''); }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isRegister}
              className={`login-tab${isRegister ? ' login-tab--on' : ''}`}
              onClick={() => { setIsRegister(true); setError(''); }}
            >
              Create account
            </button>
          </div>

          {error && <div className="login-error">✗ {error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="login-field">
              <label className="login-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                className="login-input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="login-field login-field--last">
              <div className="login-label-row">
                <label className="login-label login-label--inline" htmlFor="login-pass">Password</label>
                {!isRegister && (
                  <button type="button" className="login-forgot" onClick={() => toast('Contact support to reset access.')}>
                    Forgot?
                  </button>
                )}
              </div>
              <input
                id="login-pass"
                type="password"
                required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="login-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="login-btn-primary" disabled={loading || demoLoading}>
              {loading ? (
                <>
                  <Loader2 size={14} className="login-spinner" />
                  {isRegister ? 'Creating account…' : 'Signing in…'}
                </>
              ) : (
                <>
                  {isRegister ? 'Create account →' : 'Sign in →'}
                </>
              )}
            </button>
          </form>

          {!isRegister && (
            <button
              type="button"
              className="login-btn-secondary"
              onClick={handleDemo}
              disabled={demoLoading || loading}
            >
              {demoLoading ? (
                <>
                  <Loader2 size={14} className="login-spinner" /> Starting demo…
                </>
              ) : (
                'Try demo — no sign-up'
              )}
            </button>
          )}
        </div>

        <p className="login-tagline">
          New accounts get <span className="login-tagline-em">$100,000</span> virtual capital to practice with.
        </p>

        <Link to="/" className="login-back-link">← Back to landing</Link>
      </div>
    </div>
  );
};

export default Login;
