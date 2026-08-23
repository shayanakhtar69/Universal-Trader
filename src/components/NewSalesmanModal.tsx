import React, { useState } from 'react';
import { api } from '../api';
import { User } from '../types';
import {
  X,
  UserPlus,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Link2,
  ExternalLink,
  Smartphone,
  Share2,
  Lock,
} from 'lucide-react';

interface NewSalesmanModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewSalesmanModal: React.FC<NewSalesmanModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('sales123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const [createdPassword, setCreatedPassword] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('Name, username, and password are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.createUser({
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: `${username.trim().toLowerCase()}@universaltrader.com`,
        role: 'salesman',
        phone: phone.trim(),
        password: password.trim(),
      });
      setCreatedUser(res.user);
      setCreatedPassword(password.trim());
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create salesman account');
    } finally {
      setLoading(false);
    }
  };

  const getDirectLink = () => {
    if (!createdUser?.access_token) return '';
    return `${window.location.origin}/?salesman_token=${createdUser.access_token}`;
  };

  const handleCopyLink = () => {
    const link = getDirectLink();
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyFullSlip = () => {
    if (!createdUser) return;
    const directLink = getDirectLink();
    const text = `📱 UNIVERSAL TRADER - SALESMAN POS ACCESS LINK
------------------------------------------------
Salesman: ${createdUser.name}
Direct 1-Click Dashboard Link:
${directLink}

Username: ${createdUser.username}
Password/PIN: ${createdPassword}

🔒 Access Note:
This link opens your dedicated salesman counter POS directly. No other salesman can access your account.`;
    navigator.clipboard.writeText(text);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleWhatsAppShare = () => {
    if (!createdUser) return;
    const directLink = getDirectLink();
    const text = encodeURIComponent(
      `Hello ${createdUser.name}! Here is your direct access link for Universal Trader POS Counter:\n\n🔗 ${directLink}\n\nUsername: ${createdUser.username}\nPIN: ${createdPassword}\n\nOpen this link on your phone/tablet to start billing customers.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-lg shadow-2xl p-4 sm:p-6 my-auto">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              {createdUser ? 'Salesman Created & Direct Link Generated' : 'Add New Counter Salesman'}
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdUser ? (
          <div className="space-y-4 font-mono text-xs">
            {/* Success Banner */}
            <div className="bg-[#3F7D58]/10 border-2 border-[#3F7D58] p-3.5 rounded text-[#1F2B3A] space-y-1.5">
              <div className="flex items-center gap-1.5 text-[#3F7D58] font-bold text-sm">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>Account & Direct Access Link Generated!</span>
              </div>
              <p className="text-[11px] text-[#55606B]">
                Salesman <strong className="text-[#1F2B3A]">{createdUser.name}</strong> can open their personal dashboard directly using this link on any phone or browser.
              </p>
            </div>

            {/* Direct Access Link Box */}
            <div className="bg-white border-2 border-[#D9A441] rounded p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-[#1F2B3A] flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-[#D9A441]" />
                  Salesman Direct Access Link (Affiliate-style)
                </span>
                <span className="text-[10px] bg-[#D9A441]/20 text-[#8F6516] px-1.5 py-0.5 rounded font-bold">
                  Instant Auto-Login
                </span>
              </div>

              <div className="p-2 bg-[#EEF0EC] border border-[#D8DDD4] rounded text-[11px] font-mono break-all text-[#1F2B3A] select-all">
                {getDirectLink()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-bold rounded transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                </button>

                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Send On WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Account Isolation & Fallback Credentials */}
            <div className="bg-[#EEF0EC] p-3 border border-[#D8DDD4] rounded space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-[#1F2B3A]">
                <span>Manual Login Fallback:</span>
                <span className="text-[10px] text-[#55606B]">Username & Password</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 border border-[#D8DDD4] rounded">
                  <span className="text-[10px] text-[#55606B] block">Username</span>
                  <span className="font-bold text-[#1F2B3A]">{createdUser.username}</span>
                </div>
                <div className="bg-white p-2 border border-[#D8DDD4] rounded">
                  <span className="text-[10px] text-[#55606B] block">Password/PIN</span>
                  <span className="font-bold text-[#1F2B3A]">{createdPassword}</span>
                </div>
              </div>
            </div>

            {/* Security Isolation Notice */}
            <div className="bg-[#1F2B3A]/5 border border-[#1F2B3A]/20 p-2.5 rounded text-[11px] text-[#55606B] space-y-1">
              <div className="flex items-center gap-1 font-bold text-[#1F2B3A]">
                <Lock className="w-3.5 h-3.5 text-[#3F7D58]" />
                <span>Strict Security & Account Privacy:</span>
              </div>
              <p className="text-[10px] leading-relaxed">
                • <strong>Isolated access:</strong> Only this salesman can access their dashboard via this link.<br />
                • <strong>Owner control:</strong> The owner can view, reset, or revoke this link anytime from the staff list.<br />
                • <strong>Protected finances:</strong> Salesman cannot view profit margins, purchase costs, or other staff records.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={handleCopyFullSlip}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F2B3A] text-white hover:bg-slate-800 rounded font-bold transition cursor-pointer"
              >
                {copiedSlip ? <Check className="w-4 h-4 text-emerald-400" /> : <Smartphone className="w-4 h-4 text-[#D9A441]" />}
                <span>{copiedSlip ? 'Slip Copied!' : 'Copy Full Login Slip'}</span>
              </button>

              <button
                onClick={() => window.open(getDirectLink(), '_blank')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[#1F2B3A] text-[#1F2B3A] hover:bg-[#EEF0EC] rounded font-bold transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-[#55606B]" />
                <span>Test Link In New Tab</span>
              </button>

              <button
                onClick={onClose}
                className="py-2 px-4 bg-[#EEF0EC] hover:bg-[#D8DDD4] text-[#1F2B3A] font-bold rounded transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-[#EEF0EC] p-3 rounded mb-3 text-xs font-mono border border-[#D8DDD4] text-[#55606B] space-y-1">
              <p className="font-bold text-[#1F2B3A]">⚡ Direct Access Link Feature:</p>
              <p className="text-[11px]">
                When created, a secure direct access link (like an affiliate link) will be automatically generated so the salesman can tap and start billing immediately from their device.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
              <div>
                <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                  Salesman Full Name*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-white border border-[#55606B] px-3 py-2 text-sm text-[#1F2B3A] rounded outline-hidden focus:border-[#D9A441]"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                  Login Username / Counter ID*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ramesh or salesman2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white border border-[#55606B] px-3 py-2 font-mono text-sm text-[#1F2B3A] rounded outline-hidden focus:border-[#D9A441]"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                  Phone Number (Optional - for WhatsApp sharing)
                </label>
                <input
                  type="text"
                  placeholder="e.g. +92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden focus:border-[#D9A441]"
                />
              </div>

              <div>
                <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                  Initial Password / PIN*
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sales123"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden focus:border-[#D9A441]"
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
                  className="px-3 py-1.5 border border-[#55606B] text-[#55606B] font-mono text-xs hover:bg-[#EEF0EC] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{loading ? 'Generating Link...' : 'Create Salesman & Generate Link'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
