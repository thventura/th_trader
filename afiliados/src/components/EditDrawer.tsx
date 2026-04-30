import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface EditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onSave: () => void;
  children: ReactNode;
}

export default function EditDrawer({ isOpen, onClose, title, onSave, children }: EditDrawerProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-50 flex flex-col overflow-hidden"
        style={{ width: '420px', backgroundColor: '#0c1018', borderLeft: '1px solid #162030' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
          style={{ borderColor: '#162030' }}
        >
          <h2 className="text-white font-semibold text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors rounded-lg p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>

        {/* Footer */}
        <div
          className="flex gap-3 px-5 py-4 border-t flex-shrink-0"
          style={{ borderColor: '#162030' }}
        >
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white transition-colors"
            style={{ backgroundColor: '#162030' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => { onSave(); onClose(); }}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: '#22c55e' }}
          >
            Salvar
          </button>
        </div>
      </div>
    </>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

export function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="block text-gray-400 text-xs mb-1.5 font-medium">{label}</label>
      {children}
    </div>
  );
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function EditInput({ label, ...props }: InputProps) {
  return (
    <Field label={label}>
      <input
        {...props}
        className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none focus:ring-1 focus:ring-green-500"
        style={{ backgroundColor: '#162030', border: '1px solid #22303f' }}
      />
    </Field>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <div className="pt-2">
      <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-3">{children}</p>
    </div>
  );
}
