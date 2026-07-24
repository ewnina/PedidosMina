import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import type { AuthResponse } from '../../types';

export function LoginPage(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post<AuthResponse>('/auth/login', { email, password });
      login(response.data.accessToken);
      navigate('/admin');
    } catch {
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        <div className="text-center mb-8">
          <h1 className="text-[34px] font-bold text-black">LunchSync</h1>
          <p className="text-[15px] text-[#8E8E93] mt-2">Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit} className="ios-card p-6 space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="admin@lunchsync.com"
              required
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#8E8E93] mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#F2F2F7] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#007AFF]"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#FF3B30] text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#007AFF] text-white rounded-full text-[17px] font-medium active:scale-[0.97] transition-transform disabled:opacity-50"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
