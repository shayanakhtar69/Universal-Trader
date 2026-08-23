import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, AlertCircle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  subMessage?: string;
  confirmLabel?: string;
  confirmStyle?: 'danger' | 'warning' | 'primary';
  requiresTypedConfirmation?: string; // e.g. "RESET"
  onConfirm: () => Promise<void> | void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  subMessage,
  confirmLabel = 'Delete',
  confirmStyle = 'danger',
  requiresTypedConfirmation,
  onConfirm,
  onCancel,
}) => {
  const [typedValue, setTypedValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTypedValue('');
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfirmDisabled =
    isSubmitting ||
    (requiresTypedConfirmation ? typedValue.trim() !== requiresTypedConfirmation : false);

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirm();
    } catch (err: any) {
      setError(err.message || 'Operation failed');
      setIsSubmitting(false);
    }
  };

  const getButtonStyles = () => {
    switch (confirmStyle) {
      case 'danger':
        return 'bg-[#C1443C] hover:bg-red-700 text-white disabled:opacity-50';
      case 'warning':
        return 'bg-[#D9A441] hover:bg-amber-600 text-[#1F2B3A] disabled:opacity-50';
      default:
        return 'bg-[#1F2B3A] hover:bg-slate-800 text-white disabled:opacity-50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="bg-white border-2 border-[#1F2B3A] shadow-2xl rounded max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-[#1F2B3A] text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {confirmStyle === 'danger' ? (
              <Trash2 className="w-4 h-4 text-red-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#D9A441]" />
            )}
            <h3 className="font-mono font-bold text-sm text-white tracking-wide">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="text-slate-300 hover:text-white p-1 rounded transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-full shrink-0 ${
                confirmStyle === 'danger'
                  ? 'bg-red-100 text-[#C1443C]'
                  : 'bg-amber-100 text-[#D9A441]'
              }`}
            >
              {confirmStyle === 'danger' ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="font-sans font-bold text-sm text-[#1F2B3A] leading-snug">{message}</p>
              {subMessage && (
                <p className="font-mono text-xs text-[#55606B] mt-1.5 leading-relaxed">
                  {subMessage}
                </p>
              )}
            </div>
          </div>

          {/* Optional Typed Confirmation (e.g. Type "RESET") */}
          {requiresTypedConfirmation && (
            <div className="bg-[#EEF0EC] p-3 border border-[#D8DDD4] rounded space-y-1.5 font-mono text-xs">
              <label className="text-[11px] text-[#55606B] block">
                To confirm this destructive action, please type{' '}
                <strong className="text-[#C1443C] font-bold">"{requiresTypedConfirmation}"</strong>{' '}
                below:
              </label>
              <input
                type="text"
                autoFocus
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={`Type ${requiresTypedConfirmation}`}
                className="w-full bg-white border border-[#1F2B3A] px-3 py-1.5 text-xs font-mono font-bold text-[#1F2B3A] rounded outline-hidden uppercase tracking-wider"
              />
            </div>
          )}

          {error && (
            <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2.5 rounded text-xs font-mono text-[#C1443C] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-[#F7F8F5] px-4 py-3 border-t border-[#D8DDD4] flex justify-end gap-2 font-mono text-xs">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-[#D8DDD4] text-[#1F2B3A] font-bold rounded transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`px-4 py-2 font-bold rounded transition shadow-xs cursor-pointer flex items-center gap-1.5 ${getButtonStyles()}`}
          >
            {confirmStyle === 'danger' && <Trash2 className="w-3.5 h-3.5" />}
            <span>{isSubmitting ? 'Processing...' : confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
