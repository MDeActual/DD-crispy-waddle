import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const LoginPage: React.FC = () => {
  const { login, validateMfa, mfaRequired, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (user) {
      navigate(user.role === 'driver' ? '/map' : '/dashboard');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await validateMfa(mfaCode);
      navigate('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'MFA validation failed';
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4">🚛</div>
          <h1 className="text-2xl font-bold text-gray-900">LogiTrack</h1>
          <p className="text-gray-500 mt-1">{mfaRequired ? 'Two-Factor Authentication' : 'Sign in to your account'}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {!mfaRequired ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleMfa} className="space-y-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg mb-4">
              <p className="text-sm text-blue-700">Open your authenticator app and enter the 6-digit code for LogiTrack.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Authenticator Code</label>
              <input
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
              />
            </div>
            <button
              type="submit"
              disabled={loading || mfaCode.length !== 6}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
