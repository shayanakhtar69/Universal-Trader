import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../api';
import {
  X,
  Copy,
  Check,
  ShieldCheck,
  Smartphone,
  Printer,
  ExternalLink,
  Link2,
  Share2,
  RefreshCw,
  Lock,
  UserCheck,
  Send,
} from 'lucide-react';

interface SalesmanLoginSlipModalProps {
  salesman: User;
  onClose: () => void;
  onUserUpdated?: (updated: User) => void;
}

export const SalesmanLoginSlipModal: React.FC<SalesmanLoginSlipModalProps> = ({
  salesman: initialSalesman,
  onClose,
  onUserUpdated,
}) => {
  const [salesman, setSalesman] = useState<User>(initialSalesman);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPortalLink, setCopiedPortalLink] = useState(false);
  const [copiedSlip, setCopiedSlip] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [regenSuccess, setRegenSuccess] = useState<string | null>(null);

  const getDirectLink = () => {
    if (!salesman.access_token) return '';
    return `${window.location.origin}/?salesman_token=${salesman.access_token}`;
  };

  const getPortalLink = () => {
    return `${window.location.origin}/?portal=salesman&u=${encodeURIComponent(salesman.username)}`;
  };

  const directLink = getDirectLink();
  const portalLink = getPortalLink();

  const loginInstructions = `📱 UNIVERSAL TRADER - SALESMAN POS ACCESS SLIP
------------------------------------------------
Staff Member: ${salesman.name}
Personal Instant Login Link:
${directLink || 'Ask Owner for fresh link'}

Salesman Login Portal:
${portalLink}

Username: ${salesman.username}
Phone: ${salesman.phone || 'Not recorded'}
Default Password: ${salesman.username === 'salesman1' ? 'sales123' : '•••••••• (or assigned by owner)'}

🔒 Privacy & Security:
- Isolated access strictly to ${salesman.name}'s counter terminal, billing, and customer ledgers.
- Financial metrics, profit margins, supplier rates, and other salesmen records remain completely protected and hidden.`;

  const handleCopyLink = () => {
    if (!directLink) return;
    navigator.clipboard.writeText(directLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPortalLink = () => {
    navigator.clipboard.writeText(portalLink);
    setCopiedPortalLink(true);
    setTimeout(() => setCopiedPortalLink(false), 2500);
  };

  const handleCopySlip = () => {
    navigator.clipboard.writeText(loginInstructions);
    setCopiedSlip(true);
    setTimeout(() => setCopiedSlip(false), 2500);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hello ${salesman.name}!\n\nHere is your private access link for Universal Trader POS Counter:\n\n🚀 Direct 1-Click Link:\n${directLink || portalLink}\n\n👤 Username: ${salesman.username}\n\nOpen this link on your phone to access your personal counter to book orders and manage shopkeepers.`
    );
    
    // If salesman has phone, format it for direct send
    let cleanPhone = (salesman.phone || '').replace(/[^0-9]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '92' + cleanPhone.substring(1);
    }
    
    const waUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${text}`
      : `https://api.whatsapp.com/send?text=${text}`;
      
    window.open(waUrl, '_blank');
  };

  const executeRegenerateToken = async () => {
    try {
      setRegenerating(true);
      setRegenSuccess(null);
      setShowRegenConfirm(false);
      const res = await api.regenerateSalesmanToken(salesman.id);
      setSalesman(res.user);
      if (onUserUpdated) onUserUpdated(res.user);
      setRegenSuccess('Fresh direct link generated! Previous link has been revoked.');
      setTimeout(() => setRegenSuccess(null), 4000);
    } catch (err: any) {
      setRegenSuccess(err.message || 'Failed to regenerate access link');
    } finally {
      setRegenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-lg shadow-2xl p-4 sm:p-6 my-auto">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#D9A441]" />
            <div>
              <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                {salesman.name}'s Personal Portal & Login Link
              </h3>
              <p className="text-[11px] font-mono text-[#55606B]">
                Exclusive direct access for this salesman
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A] cursor-pointer p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {regenSuccess && (
            <div className="bg-[#3F7D58]/15 border border-[#3F7D58] p-2.5 rounded text-xs text-[#3F7D58] font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{regenSuccess}</span>
            </div>
          )}

          {/* Direct 1-Click Instant Login Link */}
          <div className="bg-white border-2 border-[#D9A441] rounded p-3.5 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-[#1F2B3A] flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-[#D9A441]" />
                1. Direct 1-Click Login Link (No Password):
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  salesman.active
                    ? 'bg-[#3F7D58]/15 text-[#3F7D58] border border-[#3F7D58]'
                    : 'bg-red-100 text-red-700 border border-red-300'
                }`}
              >
                {salesman.active ? 'Active' : 'Suspended'}
              </span>
            </div>

            <div className="p-2.5 bg-[#EEF0EC] border border-[#D8DDD4] rounded text-[11px] font-mono break-all text-[#1F2B3A] select-all">
              {directLink || 'Token not found. Click "Generate Link" below.'}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleCopyLink}
                disabled={!directLink}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-bold rounded transition cursor-pointer disabled:opacity-50"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Direct Link Copied!' : 'Copy Direct Link'}</span>
              </button>

              <button
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded transition cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Pre-Filled Credentials Login Option */}
          <div className="bg-white border border-[#D8DDD4] rounded p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] text-[#1F2B3A] flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-[#3F7D58]" />
                2. Pre-Filled Portal Link (Requires PIN/Password):
              </span>
            </div>

            <div className="p-2 bg-[#F7F8F5] border border-[#D8DDD4] rounded text-[11px] font-mono break-all text-[#55606B] select-all">
              {portalLink}
            </div>

            <button
              onClick={handleCopyPortalLink}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 border border-[#1F2B3A] text-[#1F2B3A] hover:bg-[#EEF0EC] font-bold rounded transition cursor-pointer"
            >
              {copiedPortalLink ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPortalLink ? 'Portal Link Copied!' : 'Copy Pre-Filled Portal Link'}</span>
            </button>
          </div>

          {/* Staff Credentials Card */}
          <div className="bg-[#F7F8F5] border-2 border-dashed border-[#1F2B3A]/40 p-3.5 rounded text-[#1F2B3A] space-y-2.5">
            <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2">
              <div>
                <span className="text-[10px] text-[#55606B] block uppercase">Assigned Staff Member:</span>
                <span className="font-bold text-sm font-sans text-[#1F2B3A]">{salesman.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                disabled={regenerating}
                className="text-[10px] text-[#C1443C] hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                <span>Revoke & New Link</span>
              </button>
            </div>

            {showRegenConfirm && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded text-red-800 space-y-2">
                <p className="text-[11px]">
                  Generate a fresh direct link for <strong>{salesman.name}</strong>? Any previous active link will stop working immediately.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={executeRegenerateToken}
                    disabled={regenerating}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold cursor-pointer"
                  >
                    {regenerating ? 'Generating...' : 'Confirm Revoke & New'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRegenConfirm(false)}
                    className="px-2.5 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-[10px] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white p-2.5 border border-[#D8DDD4] rounded space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#55606B] uppercase">Salesman ID:</span>
                <span className="font-bold text-xs text-[#D9A441] select-all">{salesman.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#55606B] uppercase">Phone:</span>
                <span className="font-bold text-xs text-[#1F2B3A]">{salesman.phone || 'Not recorded'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#55606B] uppercase">Counter Status:</span>
                <span className="text-[10px] text-[#3F7D58] font-bold">Authorized Terminal</span>
              </div>
            </div>

            <div className="bg-[#3F7D58]/10 border border-[#3F7D58]/30 p-2 rounded text-[11px] text-[#3F7D58] space-y-0.5">
              <div className="flex items-center gap-1 font-bold">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span>Strict Security & Account Privacy:</span>
              </div>
              <p className="text-[10px] leading-tight text-[#55606B]">
                Only <strong>{salesman.name}</strong> can access their specific sales dashboard, orders, and customer accounts. All other staff and owner sections remain completely protected.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={handleCopySlip}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1F2B3A] text-white hover:bg-slate-800 rounded font-bold transition cursor-pointer"
            >
              {copiedSlip ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#D9A441]" />}
              <span>{copiedSlip ? 'Slip Copied!' : 'Copy Full Slip'}</span>
            </button>

            <button
              onClick={() => directLink && window.open(directLink, '_blank')}
              disabled={!directLink}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[#1F2B3A] text-[#1F2B3A] hover:bg-[#EEF0EC] rounded font-bold transition cursor-pointer disabled:opacity-50"
            >
              <ExternalLink className="w-4 h-4 text-[#55606B]" />
              <span>Test Terminal</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-[#1F2B3A] text-[#1F2B3A] hover:bg-[#EEF0EC] rounded font-bold transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-[#55606B]" />
              <span>Print Badge</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 bg-[#EEF0EC] hover:bg-[#D8DDD4] text-[#1F2B3A] font-bold rounded transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
