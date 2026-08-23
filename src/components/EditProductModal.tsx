import React, { useState } from 'react';
import { Product, UnitType } from '../types';
import { api } from '../api';
import { X, Edit3, AlertCircle, Save, Check } from 'lucide-react';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  product,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState(product.name);
  const [category, setCategory] = useState(product.category);
  const [unit, setUnit] = useState<UnitType>(product.unit);
  const [wholesalePrice, setWholesalePrice] = useState(String(product.wholesale_price));
  const [costPrice, setCostPrice] = useState(product.cost_price ? String(product.cost_price) : '');
  const [lowStockThreshold, setLowStockThreshold] = useState(String(product.low_stock_threshold || 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !wholesalePrice) {
      setError('Product name and wholesale selling price are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.updateProduct(product.id, {
        name: name.trim(),
        category,
        unit,
        wholesale_price: Number(wholesalePrice),
        cost_price: costPrice ? Number(costPrice) : undefined,
        low_stock_threshold: Number(lowStockThreshold || 10),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-lg shadow-2xl p-5">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Edit Wholesale Item Details
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 font-sans text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Item / Grocery Name*
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 text-sm text-[#1F2B3A] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Grocery Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 text-xs text-[#1F2B3A] rounded outline-hidden"
              >
                <option value="Grains & Pulses">Grains & Pulses (Rice, Daal, Wheat)</option>
                <option value="Edible Oils">Edible Oils & Ghee</option>
                <option value="Spices">Spices & Dry Condiments</option>
                <option value="Commodities">Sugar, Salt & Tea</option>
                <option value="Flours">Flours & Atta</option>
                <option value="Packaged Foods">Packaged Dry Goods</option>
              </select>
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Wholesale Unit Packaging*
              </label>
              <select
                value={unit}
                onChange={(e: any) => setUnit(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              >
                <option value="bag_50kg">50 kg Bag (Bori)</option>
                <option value="bag_25kg">25 kg Bag</option>
                <option value="carton">Carton / Master Box</option>
                <option value="tin">16L / 15kg Tin</option>
                <option value="box">Inner Box (Pack of 10/12)</option>
                <option value="dozen">Dozen</option>
                <option value="kg">Per Kilogram (Kg)</option>
                <option value="liter">Per Liter (L)</option>
                <option value="packet">Packet / Pouch</option>
                <option value="piece">Piece</option>
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
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                className="w-full bg-white border border-[#1F2B3A] px-3 py-2 font-mono font-bold text-sm text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Purchase Cost Price (Rs.)
              </label>
              <input
                type="number"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="Owner private cost"
                className="w-full bg-white border border-[#55606B] px-3 py-2 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Low Stock Alert Threshold (Units)
              </label>
              <input
                type="number"
                min="1"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>
          </div>

          <div className="bg-[#EEF0EC] p-2.5 rounded font-mono text-[11px] text-[#55606B] border border-[#D8DDD4]">
            Current In-Stock Quantity: <strong className="text-[#1F2B3A]">{product.current_stock} {product.unit.replace('_', ' ')}</strong>. To add or adjust quantity, use the "Stock Inward / Adjust" button on the inventory table.
          </div>

          {error && (
            <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2.5 text-xs font-mono text-[#C1443C] flex items-center gap-1.5 rounded">
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
              className="px-4 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-xs flex items-center gap-1 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving Changes...' : 'Save Product Updates'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
