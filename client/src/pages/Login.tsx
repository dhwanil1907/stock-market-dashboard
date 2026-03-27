import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import api from '../lib/api';
import './login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  const setAuth = useAuthStore(state => state.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 530);
    return () => clearInterval(interval);
  }, []);

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'AUTH_FAILED — Check credentials.');
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
      toast.success('DEMO_SESSION_INITIALIZED — Welcome, Rookie.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'DEMO_INIT_FAILED — Is the server running?');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="login-root">
      <div className="login-wrap">
        <div className="login-window">

          {/* Title bar */}
          <div className="login-titlebar">
            <Link to="/" className="login-back">
              <ArrowLeft size={12} /> Back
            </Link>
          </div>

          {/* Form */}
          <div className="login-body">
            <div className="login-logo">
              <div className="login-logo-text">
                TRADEROOKIE
                <span className={`login-logo-cursor${cursorVisible ? '' : ' login-logo-cursor--hidden'}`}>_</span>
              </div>
              <div className="login-logo-sub">
                {isRegister ? 'Create your account' : 'Sign in to your account'}
              </div>
            </div>

            {error && <div className="login-error">✗ {error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-label">Email</label>
                <input
                  type="email"
                  required
                  className="login-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div className="login-field login-field--last">
                <label className="login-label">Password</label>
                <input
                  type="password"
                  required
                  className="login-input"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading || demoLoading}
              >
                {loading
                  ? <><Loader2 size={12} className="login-spinner" /> Signing in...</>
                  : isRegister ? 'Create Account →' : 'Sign In →'
                }
              </button>
            </form>

            {!isRegister && (
              <button
                type="button"
                className="login-btn-demo"
                onClick={handleDemo}
                disabled={demoLoading || loading}
              >
                {demoLoading
                  ? <><Loader2 size={12} className="login-spinner" /> Loading demo...</>
                  : '⚡ Try Demo — No Sign Up Needed'
                }
              </button>
            )}

            <div className="login-toggle">
              {isRegister ? (
                <>Already have an account?{' '}
                  <button type="button" className="login-btn-link" onClick={() => setIsRegister(false)}>
                    Sign In
                  </button>
                </>
              ) : (
                <>Don't have an account?{' '}
                  <button type="button" className="login-btn-link" onClick={() => setIsRegister(true)}>
                    Register
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="login-footer">
          FOR EDUCATIONAL USE ONLY · NOT FINANCIAL ADVICE
        </div>
      </div>
    </div>
  );
};

export default Login;
