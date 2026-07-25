import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeeAuthPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = searchParams.get('token');
    const jti = searchParams.get('jti');

    if (!token || !jti) {
      setError('Enlace invalido o expirado.');
      setLoading(false);
      return;
    }

    const validate = async () => {
      try {
        const { data } = await api.post('/auth/magic-link/validate', {
          tokenJti: jti,
          token,
        });

        if (data.accessToken) {
          login(data.accessToken);
          navigate('/employee', { replace: true });
          return;
        }

        if (data.userExists === false) {
          navigate(`/employee/register?jti=${jti}`, { replace: true });
          return;
        }

        setError('Respuesta inesperada del servidor.');
        setLoading(false);
      } catch {
        setError('Enlace invalido, expirado o ya utilizado.');
        setLoading(false);
      }
    };

    void validate();
  }, [searchParams, login, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
        <p className="text-[var(--c-text-secondary)]">Validando enlace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)]">
      <div className="text-center p-6">
        <p className="text-[17px] font-semibold text-[var(--c-text)] mb-2">
          {error ? 'Error' : 'Sesion iniciada'}
        </p>
        <p className="text-[13px] text-[var(--c-text-secondary)]">
          {error ?? 'Redirigiendo...'}
        </p>
      </div>
    </div>
  );
}
