import React, { useState } from 'react';
import { UnitType } from '../types';
import { api } from '../api';
import { X, PackagePlus, AlertCircle } from 'lucide-react';

interface NewProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewProductModal: React.FC<NewProductModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('Grains & Pulses');
  const [unit, setUnit] = useState<UnitType>('bag_50kg');
  const [wholesalePrice, setWholesalePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [initialStock, setInitialStock] = useState('0');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wholesalePrice) {
      setError('Product name and wholesale price are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.createProduct({
        name: name.trim(),
        code: code.trim() || undefined,
        category,
        unit,
        wholesale_price: Number(wholesalePrice),
        cost_price: costPrice ? Number(costPrice) : undefined,
        initial_stock: Number(initialStock || 0),
        low_stock_threshold: Number(lowStockThreshold || 10),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-lg shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Add New Wholesale Product
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Product Name / Variety*
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Kolam Raw Rice Premium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 text-sm text-[#1F2B3A] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Item Code / SKU (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. RICE-KOL-50"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 text-xs text-[#1F2B3A] rounded outline-hidden"
              >
                <option value="Grains & Pulses">Grains & Pulses</option>
                <option value="Edible Oils">Edible Oils</option>
                <option value="Spices">Spices & Condiments</option>
                <option value="Commodities">Commodities (Sugar, Salt, Jaggery)</option>
                <option value="Packaged Foods">Packaged Dry Goods</option>
              </select>
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Wholesale Unit Type*
              </label>
              <select
                value={unit}
                onChange={(e: any) => setUnit(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              >
                <option value="bag_50kg">50 kg Bag (Jute/PP)</option>
                <option value="bag_25kg">25 kg Bag</option>
                <option value="carton">Carton / Master Box</option>
                <option value="tin">15 Liter / 15 kg Tin</option>
                <option value="box">Inner Box (Pack of 10/12)</option>
                <option value="dozen">Dozen</option>
                <option value="kg">Per Kilogram (Kg)</option>
                <option value="liter">Per Liter (L)</option>
                <option value="packet">Packet / Pouch</option>
              </select>
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Wholesale Selling Rate (Rs.)*
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="e.g. 3850"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                className="w-full bg-white border border-[#1F2B3A] px-3 py-1.5 font-mono font-bold text-sm text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Cost / Purchase Price (Rs.)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3450"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Initial Stock In Godown
              </label>
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Low Stock Warning Alert Threshold
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-1.5 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              />
              <p className="text-[10px] text-[#55606B] font-mono mt-0.5">
                App triggers chalk-red alert when stock falls below this quantity.
              </p>
            </div>
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
              {loading ? 'Creating Item...' : 'Save Product to Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
