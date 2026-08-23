import React, { useState } from 'react';
import { api } from '../api';
import { User } from '../types';
import { X, UserCog, AlertCircle } from 'lucide-react';

interface EditSalesmanModalProps {
  salesman: User;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSalesmanModal: React.FC<EditSalesmanModalProps> = ({
  salesman,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(salesman.name);
  const [username, setUsername] = useState(salesman.username);
  const [phone, setPhone] = useState(salesman.phone || '');
  const [email, setEmail] = useState(salesman.email || '');
  const [active, setActive] = useState(salesman.active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim()) {
      setError('Name and username are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.updateUser(salesman.id, {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        email: email.trim() || `${username.trim().toLowerCase()}@universaltrader.com`,
        active,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update salesman');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-md shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Edit Salesman Staff Account
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Salesman Full Name*
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white border border-[#55606B] px-3 py-2 text-sm text-[#1F2B3A] rounded outline-hidden"
            />
          </div>

          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Login Username / Counter ID*
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-white border border-[#55606B] px-3 py-2 font-mono text-sm text-[#1F2B3A] rounded outline-hidden"
            />
          </div>

          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
            />
          </div>

          <div>
            <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
            />
          </div>

          <div className="bg-[#EEF0EC] p-3 rounded border border-[#D8DDD4] flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-[#1F2B3A]">Account Status</div>
              <div className="text-[11px] text-[#55606B]">
                Suspended staff cannot log in to the counter app
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`px-3 py-1 font-mono font-bold text-xs rounded uppercase transition ${
                active
                  ? 'bg-[#3F7D58] text-white'
                  : 'bg-red-600 text-white'
              }`}
            >
              {active ? 'Active' : 'Suspended'}
            </button>
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
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
