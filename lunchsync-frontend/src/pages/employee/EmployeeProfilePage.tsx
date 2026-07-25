import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { IosCard } from '../../components/ui/IosCard';
import { IosButton } from '../../components/ui/IosButton';
import { IosHeader } from '../../components/ui/IosHeader';

export function EmployeeProfilePage(): React.JSX.Element {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <IosHeader title="Mi Cuenta" />

      <div className="space-y-4 mt-4">
        <IosCard>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--c-accent)]/10 flex items-center justify-center mx-auto mb-3">
              <span className="text-[28px]">👤</span>
            </div>
            <p className="text-[17px] font-semibold text-[var(--c-text)]">
              {user?.email ?? 'Sin telefono'}
            </p>
            <p className="text-[13px] text-[var(--c-text-secondary)] mt-1">
              Empleado
            </p>
          </div>
        </IosCard>

        <IosCard>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-[15px] text-[var(--c-text-secondary)]">Telefono</span>
              <span className="text-[15px] text-[var(--c-text)]">{user?.email ?? '-'}</span>
            </div>
            <div className="border-t border-[var(--c-separator)]" />
            <div className="flex justify-between">
              <span className="text-[15px] text-[var(--c-text-secondary)]">Rol</span>
              <span className="text-[15px] text-[var(--c-text)]">Empleado</span>
            </div>
          </div>
        </IosCard>

        <IosButton
          variant="destructive"
          className="w-full"
          onClick={() => {
            logout();
            navigate('/auth/login');
          }}
        >
          Cerrar sesion
        </IosButton>
      </div>
    </div>
  );
}
