import React, { useEffect } from 'react';

interface IosModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function IosModal({ isOpen, onClose, title, children }: IosModalProps): React.JSX.Element | null {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 mb-10">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-[var(--c-bg-card)] rounded-t-[14px] max-h-[85vh] overflow-hidden safe-bottom">
        {title && (
          <div className="px-4 py-3 border-b border-[var(--c-separator)]">
            <h2 className="text-[17px] font-semibold text-center">{title}</h2>
          </div>
        )}
        <div className="overflow-y-auto max-h-[calc(85vh-60px)]">
          {children}
        </div>
      </div>
    </div>
  );
}
