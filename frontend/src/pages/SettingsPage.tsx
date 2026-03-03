import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [mfaStep, setMfaStep] = useState<'idle' | 'setup' | 'confirm'>('idle');
  const [mfaSecret, setMfaSecret] = useState('');
  const [mfaQr, setMfaQr] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState('');
  const [mfaSuccess, setMfaSuccess] = useState(false);

  const [googleKey, setGoogleKey] = useState(localStorage.getItem('google_key') || '');
  const [mapboxKey, setMapboxKey] = useState(localStorage.getItem('mapbox_key') || '');
  const [keysSaved, setKeysSaved] = useState(false);

  const handleEnableMfa = async () => {
    setMfaLoading(true);
    setMfaError('');
    try {
      const res = await authApi.setupMfa();
      setMfaSecret(res.data.secret);
      setMfaQr(res.data.qr_code_url);
      setMfaStep('setup');
    } catch (err: unknown) {
      setMfaError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to setup MFA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaLoading(true);
    setMfaError('');
    try {
      await authApi.validateMfa('setup_confirm', mfaCode);
      setMfaSuccess(true);
      setMfaStep('idle');
    } catch (err: unknown) {
      setMfaError((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to confirm MFA code');
    } finally {
      setMfaLoading(false);
    }
  };

  const saveApiKeys = () => {
    localStorage.setItem('google_key', googleKey);
    localStorage.setItem('mapbox_key', mapboxKey);
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">{user?.name}</div>
            <div className="text-gray-500">{user?.email}</div>
            <div className="mt-1">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* MFA */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Two-Factor Authentication</h2>
        <p className="text-gray-500 text-sm mb-4">Add an extra layer of security to your account using an authenticator app.</p>

        {mfaSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            ✅ MFA has been successfully enabled!
          </div>
        )}

        {mfaError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{mfaError}</div>
        )}

        {mfaStep === 'idle' && !mfaSuccess && (
          <button
            onClick={handleEnableMfa}
            disabled={mfaLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 font-medium text-sm"
          >
            {mfaLoading ? 'Setting up...' : 'Enable MFA'}
          </button>
        )}

        {mfaStep === 'setup' && (
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">1. Scan this QR code with Google Authenticator or any TOTP app:</p>
              {mfaQr && <img src={mfaQr} alt="MFA QR Code" className="w-48 h-48 mx-auto border-4 border-white shadow-md rounded-lg" />}
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">2. Or manually enter this secret key:</p>
              <div className="font-mono text-sm bg-white p-2 rounded border border-gray-200 text-gray-800 select-all">{mfaSecret}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-3">3. Enter the 6-digit code from your app to confirm:</p>
              <form onSubmit={handleConfirmMfa} className="flex gap-3">
                <input
                  type="text"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-center text-xl tracking-widest text-gray-900"
                />
                <button
                  type="submit"
                  disabled={mfaLoading || mfaCode.length !== 6}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 font-medium text-sm"
                >
                  {mfaLoading ? 'Confirming...' : 'Confirm'}
                </button>
              </form>
            </div>
            <button onClick={() => setMfaStep('idle')} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        )}
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Map API Keys</h2>
        <p className="text-gray-500 text-sm mb-4">Enter your API keys to use premium map providers. Keys are stored locally in your browser.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Google Maps API Key</label>
            <input
              type="text"
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Used for Google Maps Satellite and Roads providers</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mapbox Access Token</label>
            <input
              type="text"
              value={mapboxKey}
              onChange={(e) => setMapboxKey(e.target.value)}
              placeholder="pk.eyJ1..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Used for Mapbox Streets provider</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={saveApiKeys} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
              Save API Keys
            </button>
            {keysSaved && <span className="text-green-600 text-sm font-medium">✓ Saved!</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
