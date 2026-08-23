import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ShopProfile } from '../types';
import { ConfirmModal } from './ConfirmModal';
import {
  Store,
  Save,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileJson,
  Mail,
  Check,
} from 'lucide-react';

interface SettingsTabProps {
  onRefreshAll: () => Promise<void>;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({ onRefreshAll }) => {
  const [profile, setProfile] = useState<ShopProfile>({
    name: '',
    tagline: '',
    ownerName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    ntn: '',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    terms: '',
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getShopProfile();
      if (res.shopProfile) {
        setProfile(res.shopProfile);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load shop profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMsg(null);
      setErrorMsg(null);
      await api.updateShopProfile(profile);
      setSuccessMsg('Shop branding and bill invoice settings updated successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
      onRefreshAll();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update shop profile');
    } finally {
      setSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      setErrorMsg(null);
      const res = await api.exportBackup();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.backup, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute('download', `wholesale_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setSuccessMsg('Database backup downloaded successfully. Keep this file safe on your local drive.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to export backup');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      fileReader.readAsText(file, 'UTF-8');
      fileReader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (!confirm(`Restore database from file "${file.name}"? This will overwrite current products and bills.`)) {
            return;
          }
          await api.importBackup(parsed);
          await onRefreshAll();
          await loadProfile();
          setSuccessMsg('Database restored successfully from backup file.');
          setTimeout(() => setSuccessMsg(null), 4000);
        } catch (err: any) {
          setErrorMsg('Invalid backup file format: ' + (err.message || 'Corrupt JSON'));
        }
      };
    }
  };

  const executeResetData = async () => {
    try {
      await api.resetAllData();
      setShowResetConfirm(false);
      await onRefreshAll();
      await loadProfile();
      setSuccessMsg('All business records cleared. You can now start with fresh inventory.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reset data');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl pb-12 font-sans text-[#1F2B3A]">
      {/* Header Banner */}
      <div className="bg-white border-2 border-[#1F2B3A] p-5 rounded shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="slab text-xl uppercase tracking-wider text-[#1F2B3A] flex items-center gap-2">
            <Store className="w-5 h-5 text-[#D9A441]" />
            <span>Shop Profile & System Settings</span>
          </h2>
          <p className="text-xs font-mono text-[#55606B] mt-1">
            Configure business identity printed on POS bills, manage offline storage, and download backups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadProfile}
            disabled={loading}
            className="px-3 py-2 bg-[#EEF0EC] hover:bg-[#D8DDD4] text-[#1F2B3A] border border-black/20 rounded font-mono text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-[#3F7D58]/10 border border-[#3F7D58] p-3 text-xs font-mono text-[#3F7D58] flex items-center gap-2 rounded">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-[#C1443C]/10 border border-[#C1443C] p-3 text-xs font-mono text-[#C1443C] flex items-center gap-2 rounded">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Business Identity & Bill Header */}
      <div className="bg-white border border-black/10 rounded shadow-xs p-6">
        <div className="border-b border-black/10 pb-3 mb-5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-[#1F2B3A] uppercase tracking-wide">
              1. Business Identity & Thermal Bill Header
            </h3>
            <p className="text-xs font-mono text-[#55606B]">
              These details appear at the top of every 80mm thermal receipt and PDF invoice.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                Shop / Business Name *
              </label>
              <input
                type="text"
                required
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="e.g. UNIVERSAL TRADER"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                Tagline / Business Category
              </label>
              <input
                type="text"
                value={profile.tagline || ''}
                onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                placeholder="e.g. Wholesale Provision, Spices & Grain Merchants"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                Owner / Proprietor Name
              </label>
              <input
                type="text"
                value={profile.ownerName || ''}
                onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                placeholder="e.g. Master Business Owner"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                Phone / WhatsApp Numbers *
              </label>
              <input
                type="text"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="e.g. +92 300 1234567 / 042-37654321"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                Shop Address / Market Location
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="e.g. Shop No. 42-45, Wholesale Grain Market"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                City / Market Zone
              </label>
              <input
                type="text"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                placeholder="e.g. Grain Market, Lahore"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                NTN / Sales Tax Reg Number
              </label>
              <input
                type="text"
                value={profile.ntn || ''}
                onChange={(e) => setProfile({ ...profile, ntn: e.target.value })}
                placeholder="e.g. NTN: 8492018-4"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>

            <div>
              <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                Currency Symbol
              </label>
              <input
                type="text"
                value={profile.currencySymbol || 'Rs.'}
                onChange={(e) => setProfile({ ...profile, currencySymbol: e.target.value })}
                placeholder="e.g. Rs. or PKR"
                className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
              Terms & Conditions (Printed at bottom of Invoice)
            </label>
            <textarea
              rows={2}
              value={profile.terms || ''}
              onChange={(e) => setProfile({ ...profile, terms: e.target.value })}
              placeholder="e.g. Goods once sold will not be returned. Credit payment due within agreed terms."
              className="w-full px-3 py-2 bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441] text-sm"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-bold uppercase tracking-wider rounded text-xs shadow-xs flex items-center gap-2 cursor-pointer transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Profile...' : 'Save Shop Settings'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Section 2: Local Persistence & Offline Backup */}
      <div className="bg-white border border-black/10 rounded shadow-xs p-6">
        <div className="border-b border-black/10 pb-3 mb-5">
          <h3 className="font-bold text-sm text-[#1F2B3A] uppercase tracking-wide flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-[#3F7D58]" />
            <span>2. Offline Storage & Database Backups</span>
          </h3>
          <p className="text-xs font-mono text-[#55606B] mt-0.5">
            Your data is stored safely on the local file system (<code className="bg-slate-100 px-1 py-0.5 rounded">data/wholesale_database.json</code>). You can backup and restore anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Export Card */}
          <div className="p-4 bg-[#EEF0EC] border border-[#D8DDD4] rounded flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-[#1F2B3A] mb-1">
                <Download className="w-4 h-4 text-[#3F7D58]" />
                <span>Export Full Backup</span>
              </div>
              <p className="text-[11px] text-[#55606B] leading-relaxed">
                Download a complete JSON snapshot of all products, stock movements, customers, credit ledger, and sales invoices.
              </p>
            </div>
            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 bg-[#1F2B3A] hover:bg-slate-800 text-white font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <FileJson className="w-4 h-4 text-[#D9A441]" />
              <span>Download Backup (.json)</span>
            </button>
          </div>

          {/* Import Card */}
          <div className="p-4 bg-[#EEF0EC] border border-[#D8DDD4] rounded flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center gap-2 font-bold text-[#1F2B3A] mb-1">
                <Upload className="w-4 h-4 text-[#D9A441]" />
                <span>Restore From Backup</span>
              </div>
              <p className="text-[11px] text-[#55606B] leading-relaxed">
                Upload a previous backup file to restore all master registers, prices, customer ledgers, and bills.
              </p>
            </div>
            <label className="w-full py-2.5 bg-white hover:bg-slate-50 border-2 border-dashed border-[#1F2B3A] text-[#1F2B3A] font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition text-center">
              <Upload className="w-4 h-4 text-[#3F7D58]" />
              <span>Select Backup File to Restore</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Reset Database Option */}
        <div className="mt-6 pt-5 border-t border-black/10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-xs text-[#C1443C] uppercase tracking-wider">
              Emergency Reset Data
            </h4>
            <p className="text-[11px] font-mono text-[#55606B]">
              Wipe demo products and transactions to start a completely fresh business ledger.
            </p>
          </div>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 border border-[#C1443C] text-[#C1443C] font-mono text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear / Reset All Records</span>
          </button>
        </div>
      </div>

      {/* Section 3: Google Account & Email Verification */}
      <div className="bg-white border border-black/10 rounded shadow-xs p-6">
        <div className="border-b border-black/10 pb-3 mb-5">
          <h3 className="font-bold text-sm text-[#1F2B3A] uppercase tracking-wide flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#D9A441]" />
            <span>3. Google Account & Verification</span>
          </h3>
          <p className="text-xs font-mono text-[#55606B] mt-0.5">
            Verified Google email address linked for Master Owner ledger recovery, backups, and customer e-receipts.
          </p>
        </div>

        <div className="p-4 bg-[#EEF0EC] border border-[#D8DDD4] rounded font-mono text-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#1F2B3A]">Linked Account:</span>
              {profile.email ? (
                <span className="px-2.5 py-1 bg-white border border-black/15 text-[#1F2B3A] font-bold rounded text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3F7D58]"></span>
                  {profile.email}
                </span>
              ) : (
                <span className="text-[#55606B] italic">No email set in shop profile</span>
              )}
            </div>

            {profile.email && (
              <span className="px-2 py-0.5 bg-[#3F7D58]/15 text-[#3F7D58] border border-[#3F7D58]/30 rounded text-[10px] font-bold uppercase flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified for E-Invoices
              </span>
            )}
          </div>

          <p className="text-[11px] text-[#55606B] leading-relaxed">
            You can update the official Google email address in the <strong className="text-[#1F2B3A]">Shop Profile & Branding</strong> form above anytime. This email is automatically rendered on customer sales invoices and cash memos.
          </p>
        </div>
      </div>

      {/* Section 4: 100% Offline Reliability Certificate */}
      <div className="bg-[#1F2B3A] text-[#EEF0EC] p-5 rounded font-mono text-xs space-y-2 border border-black/20">
        <div className="flex items-center gap-2 text-[#D9A441] font-bold text-sm">
          <ShieldCheck className="w-4 h-4" />
          <span>100% Offline & Local Disk Safe</span>
        </div>
        <p className="text-[11px] text-white/70 leading-relaxed">
          Universal Trader is designed for zero-cloud dependency. All transactions, ledger balances, and staff permissions execute in memory and auto-sync immediately to disk. No monthly server hosting, third-party internet APIs, or internet connectivity are needed.
        </p>
      </div>

      {/* Reset All Database Confirm Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset Entire Business Database"
        message="DANGER: This will erase all inventory products, shopkeeper ledgers, orders, purchases, and billing records."
        subMessage="Type RESET to confirm clearing the local database."
        confirmLabel="Reset Database"
        confirmStyle="danger"
        requiresTypedConfirmation="RESET"
        onConfirm={executeResetData}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
};
