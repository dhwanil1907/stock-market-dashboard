import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { TrendingUp, Mail, Lock, Loader2, Zap } from 'lucide-react';
import api from '../lib/api';

const DEMO_EMAIL = 'demo@stocksage.com';
const DEMO_PASSWORD = 'demo1234';

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
        toast.success('Account created! Please sign in.');
      } else {
        setAuth(res.data.user, res.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setError('');
    try {
      // Try to register the demo account — ignore "already exists" errors
      await api.post('/auth/register', { email: DEMO_EMAIL, password: DEMO_PASSWORD }).catch(() => {});
      // Always attempt login
      const res = await api.post('/auth/login', { email: DEMO_EMAIL, password: DEMO_PASSWORD });
      setAuth(res.data.user, res.data.token);
      toast.success('Logged in as Demo user');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Demo login failed — is the server running?');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 glass rounded-3xl shadow-2xl">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center p-4 bg-brand-green bg-opacity-10 rounded-2xl text-brand-green mb-4">
          <TrendingUp size={40} />
        </div>
        <h1 className="text-2xl font-bold">Welcome to StockSage</h1>
        <p className="text-gray-400 mt-2">{isRegister ? 'Create your paper trading account' : 'Sign in to your account'}</p>
      </div>

      {/* Demo Button */}
      {!isRegister && (
        <button
          onClick={handleDemo}
          disabled={demoLoading || loading}
          className="w-full mb-6 py-3 rounded-xl border border-brand-green/40 text-brand-green bg-brand-green/5 hover:bg-brand-green/10 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {demoLoading
            ? <><Loader2 className="animate-spin" size={16} /> Setting up demo...</>
            : <><Zap size={16} /> Try Demo — No Sign Up Needed</>}
        </button>
      )}

      {!isRegister && (
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-brand-border" />
          <span className="text-xs text-gray-500">or sign in with email</span>
          <div className="flex-1 h-px bg-brand-border" />
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-6 text-sm bg-brand-red bg-opacity-10 text-brand-red">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400 ml-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="email"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-400 ml-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="password"
              required
              className="w-full pl-12 pr-4 py-3 rounded-xl"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" disabled={loading || demoLoading} className="primary w-full py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={20} /> : (isRegister ? 'Create Account' : 'Sign In')}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-400">
        {isRegister ? (
          <p>Already have an account? <button onClick={() => setIsRegister(false)} className="text-brand-green hover:underline">Sign In</button></p>
        ) : (
          <p>Don't have an account? <button onClick={() => setIsRegister(true)} className="text-brand-green hover:underline">Get Started</button></p>
        )}
      </div>
    </div>
  );
};

export default Login;
