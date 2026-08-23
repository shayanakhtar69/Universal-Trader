import React, { useState } from 'react';
import { Product } from '../types';
import { api } from '../api';
import { X, Sliders, AlertTriangle } from 'lucide-react';

interface StockAdjustmentModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  onClose,
  onSuccess,
}) => {
  const [newQuantity, setNewQuantity] = useState<number>(product.current_stock);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const diff = newQuantity - product.current_stock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide an audit reason for adjusting physical stock.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.adjustStock(product.id, newQuantity, reason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-md shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Physical Stock Adjustment
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#EEF0EC] p-3 rounded mb-4 font-mono text-xs border border-[#D8DDD4]">
          <div className="font-sans font-bold text-sm text-[#1F2B3A]">{product.name}</div>
          <div className="text-[#55606B] mt-0.5">Code: {product.code} | Unit: {product.unit.replace('_', ' ')}</div>
          <div className="text-[#55606B] mt-0.5">Current Recorded Stock: <span className="font-bold text-[#1F2B3A]">{product.current_stock}</span></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono font-bold text-[#1F2B3A] block mb-1">
              New Physical Count ({product.unit.replace('_', ' ')})*
            </label>
            <input
              type="number"
              min="0"
              required
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              className="w-full bg-white border border-[#1F2B3A] px-3 py-2 text-base font-mono font-bold rounded focus:ring-1 focus:ring-[#D9A441] outline-hidden"
            />
            {diff !== 0 && (
              <p
                className={`text-xs font-mono font-bold mt-1 ${
                  diff > 0 ? 'text-[#3F7D58]' : 'text-[#C1443C]'
                }`}
              >
                Stock Change: {diff > 0 ? `+${diff}` : diff} {product.unit.replace('_', ' ')}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-mono font-bold text-[#1F2B3A] block mb-1">
              Mandatory Audit Reason / Note*
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Month-end godown physical stock tally, damaged package write-off, or supplier over-delivery"
              className="w-full bg-white border border-[#55606B] px-3 py-2 text-xs font-sans rounded outline-hidden"
            />
          </div>

          {error && (
            <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2 text-xs font-mono text-[#C1443C] flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[#D8DDD4]">
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
              {loading ? 'Logging Adjustment...' : 'Confirm Stock Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
