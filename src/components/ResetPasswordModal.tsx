import React, { useState } from 'react';
import { api } from '../api';
import { User } from '../types';
import { X, KeyRound, Check, Copy, AlertCircle } from 'lucide-react';

interface ResetPasswordModalProps {
  salesman: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  salesman,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim()) {
      setError('Please enter a new password');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.resetSalesmanPassword(salesman.id, newPassword.trim());
      setSuccessMsg(`Password successfully updated for ${salesman.name}.`);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    const creds = `Universal Trader Counter Login\nUsername: ${salesman.username}\nPassword: ${newPassword}`;
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-md shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Reset Salesman Password
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#EEF0EC] p-3 rounded mb-4 text-xs font-mono border border-[#D8DDD4] space-y-1">
          <div>
            Salesman: <span className="font-bold text-[#1F2B3A]">{salesman.name}</span>
          </div>
          <div>
            Username: <span className="font-bold text-[#1F2B3A]">{salesman.username}</span>
          </div>
        </div>

        {successMsg ? (
          <div className="space-y-4 font-mono text-xs">
            <div className="bg-[#3F7D58]/10 border border-[#3F7D58] p-3 text-[#3F7D58] rounded">
              <div className="font-bold mb-1">✓ Password Updated!</div>
              <p className="text-[11px]">
                The salesman can now log in using username{' '}
                <span className="font-bold text-[#1F2B3A]">{salesman.username}</span> and the new password.
              </p>
            </div>

            <button
              onClick={handleCopyCredentials}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1F2B3A] text-[#EEF0EC] hover:bg-slate-800 rounded font-bold transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#D9A441]" />}
              <span>{copied ? 'Credentials Copied to Clipboard!' : 'Copy Login Details for Staff'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-2 bg-[#D9A441] text-[#1F2B3A] font-bold rounded"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                New Password / PIN*
              </label>
              <input
                type="text"
                required
                placeholder="e.g. sales2026 or 4-digit PIN"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 font-mono text-sm text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            {error && (
              <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2 text-xs font-mono text-[#C1443C] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-[#D8DDD4]">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 border border-[#55606B] text-[#55606B] font-mono text-xs hover:bg-[#EEF0EC] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-sm"
              >
                {loading ? 'Updating...' : 'Set New Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
