import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { IosButton } from '../../components/ui/IosButton';

export function EmployeeRegisterPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();

  const jti = searchParams.get('jti');
  const [fullName, setFullName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!jti) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
        <p className="text-[var(--c-text-secondary)]">Enlace invalido.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data } = await api.post<{ accessToken: string }>('/auth/complete-registration', {
        tokenJti: jti,
        fullName: fullName.trim(),
        employeeCode: employeeCode.trim() || undefined,
      });
      login(data.accessToken);
      navigate('/employee', { replace: true });
    } catch {
      setError('Error al registrar. Intenta de nuevo.');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[var(--c-accent)]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-[28px]">👤</span>
          </div>
          <h1 className="text-[22px] font-bold text-[var(--c-text)]">Bienvenido a MinaLunch</h1>
          <p className="text-[15px] text-[var(--c-text-secondary)] mt-2">
            Completa tus datos para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1.5">
              Nombre completo *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Tu nombre"
              required
              className="w-full px-4 py-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-separator)] text-[var(--c-text)] text-[15px] placeholder:text-[var(--c-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30"
            />
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[var(--c-text-secondary)] mb-1.5">
              Codigo de empleado (opcional)
            </label>
            <input
              type="text"
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              placeholder="Ej: EMP001"
              className="w-full px-4 py-3 rounded-xl bg-[var(--c-card)] border border-[var(--c-separator)] text-[var(--c-text)] text-[15px] placeholder:text-[var(--c-text-secondary)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--c-accent)]/30"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-500 text-center">{error}</p>
          )}

          <IosButton
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting || !fullName.trim()}
          >
            {submitting ? 'Registrando...' : 'Continuar'}
          </IosButton>
        </form>
      </div>
    </div>
  );
}
