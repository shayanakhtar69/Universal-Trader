import React, { useState } from 'react';
import { Customer } from '../types';
import { api } from '../api';
import { X, Store, AlertCircle, Building2, Phone, MapPin, Banknote } from 'lucide-react';

interface NewCustomerModalProps {
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export const NewCustomerModal: React.FC<NewCustomerModalProps> = ({ onClose, onSuccess }) => {
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim() || !phone.trim()) {
      setError('Shop / Store name and mobile phone number are required.');
      return;
    }

    const fullDisplayName = ownerName.trim()
      ? `${shopName.trim()} (${ownerName.trim()})`
      : shopName.trim();

    try {
      setLoading(true);
      setError(null);
      const res = await api.createCustomer({
        name: fullDisplayName,
        phone: phone.trim(),
        address: address.trim() || 'Market Store',
        opening_balance: openingBalance ? Number(openingBalance) : 0,
      });
      onSuccess(res.customer);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register shopkeeper');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-md shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Register New Shopkeeper / Store
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Shop / Grocery Store Name*
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
              <input
                type="text"
                required
                placeholder="e.g. Bismillah General Store"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm text-[#1F2B3A] bg-white border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Shopkeeper / Owner Name
              </label>
              <input
                type="text"
                placeholder="e.g. Haji Muhammad"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Mobile / WhatsApp #*
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#55606B]" />
                <input
                  type="text"
                  required
                  placeholder="0300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 font-mono text-xs text-[#1F2B3A] bg-white border border-[#55606B] rounded outline-hidden"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Shop Address / Market Location
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#55606B]" />
              <input
                type="text"
                placeholder="e.g. Shop 12, Main Wholesale Grain Market"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs text-[#1F2B3A] bg-white border border-[#55606B] rounded outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Previous Khata / Opening Balance (Rs.)
            </label>
            <div className="relative">
              <Banknote className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#55606B]" />
              <input
                type="number"
                min="0"
                placeholder="0 (or enter existing debt from offline khata)"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 font-mono text-xs text-[#1F2B3A] bg-white border border-[#55606B] rounded outline-hidden"
              />
            </div>
            <p className="text-[10px] font-mono text-[#55606B] mt-0.5">
              If this shopkeeper already owes previous money, enter it here to carry forward their Khata balance.
            </p>
          </div>

          {error && (
            <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2 text-xs font-mono text-[#C1443C] flex items-center gap-1.5 rounded">
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
              className="px-4 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-xs cursor-pointer"
            >
              {loading ? 'Adding...' : 'Register Shopkeeper'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
