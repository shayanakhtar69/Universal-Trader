import React, { useState, useEffect } from 'react';
import { Product, Supplier } from '../types';
import { api } from '../api';
import { X, Truck, Plus, Trash2, AlertCircle } from 'lucide-react';

interface NewPurchaseModalProps {
  products: Product[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}

export const NewPurchaseModal: React.FC<NewPurchaseModalProps> = ({
  products,
  suppliers,
  onClose,
  onSuccess,
}) => {
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [items, setItems] = useState<
    { productId: string; quantity: number; costPrice: number }[]
  >([{ productId: products[0]?.id || '', quantity: 20, costPrice: products[0]?.cost_price || 1000 }]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { productId: products[0]?.id || '', quantity: 10, costPrice: products[0]?.cost_price || 1000 },
    ]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        copy[index] = {
          ...copy[index],
          productId: value,
          costPrice: prod?.cost_price || copy[index].costPrice,
        };
      } else {
        copy[index] = { ...copy[index], [field]: value };
      }
      return copy;
    });
  };

  const totalPurchaseCost = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.costPrice) || 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setError('Please select a supplier.');
      return;
    }
    if (items.some((i) => i.quantity <= 0 || i.costPrice <= 0)) {
      setError('Every item must have a quantity and cost price greater than zero.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.createPurchase({
        supplierId,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          costPrice: Number(i.costPrice),
        })),
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record purchase restock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-2xl shadow-2xl p-5 my-6">
        <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Record Supplier Purchase & Stock Inward
            </h3>
          </div>
          <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 font-sans text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Select Supplier / Mill*
              </label>
              <select
                required
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-white border border-[#55606B] px-3 py-2 text-xs text-[#1F2B3A] rounded outline-hidden"
              >
                {suppliers.map((sup) => (
                  <option key={sup.id} value={sup.id}>
                    {sup.name} ({sup.contact_person || sup.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono font-bold text-[#1F2B3A] block mb-1">
                Delivery Memo / Gate Pass / Truck No.
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Truck MH-04-AB-1234, Challan #881"
                className="w-full bg-white border border-[#55606B] px-3 py-2 text-xs text-[#1F2B3A] rounded outline-hidden"
              />
            </div>
          </div>

          {/* Items Inward Table */}
          <div className="border border-[#1F2B3A] bg-[#EEF0EC] p-3 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono font-bold text-xs uppercase text-[#1F2B3A]">
                Items Inward List
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#1F2B3A] text-white text-[11px] font-mono rounded hover:bg-slate-800 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="space-y-2">
              {items.map((row, idx) => {
                const prod = products.find((p) => p.id === row.productId);
                const lineTotal = (Number(row.quantity) || 0) * (Number(row.costPrice) || 0);

                return (
                  <div
                    key={idx}
                    className="bg-white p-2.5 border border-[#D8DDD4] grid grid-cols-12 gap-2 items-center text-xs"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="text-[10px] font-mono text-[#55606B] block">Product</label>
                      <select
                        value={row.productId}
                        onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                        className="w-full border border-slate-300 px-2 py-1 text-xs text-[#1F2B3A] rounded outline-hidden"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.unit.replace('_', ' ')})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <label className="text-[10px] font-mono text-[#55606B] block">
                        Qty ({prod?.unit.replace('_', ' ') || 'units'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full border border-slate-300 px-2 py-1 font-mono font-bold text-xs text-[#1F2B3A] rounded outline-hidden"
                      />
                    </div>

                    <div className="col-span-5 sm:col-span-3">
                      <label className="text-[10px] font-mono text-[#55606B] block">
                        Cost Rate (Rs.)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={row.costPrice}
                        onChange={(e) => updateItem(idx, 'costPrice', Number(e.target.value))}
                        className="w-full border border-slate-300 px-2 py-1 font-mono text-xs text-[#1F2B3A] rounded outline-hidden"
                      />
                    </div>

                    <div className="col-span-2 sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => removeItemRow(idx)}
                        className="text-[#C1443C] hover:bg-red-50 p-1.5 rounded transition disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-2 border-t border-[#D8DDD4] flex justify-between items-center font-mono">
              <span className="text-xs text-[#55606B]">Total Purchase Inward Cost:</span>
              <span className="text-sm font-bold text-[#1F2B3A]">
                Rs. {totalPurchaseCost.toLocaleString('en-PK')}
              </span>
            </div>
          </div>

          {error && (
            <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2 text-xs font-mono text-[#C1443C] flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
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
              {loading ? 'Receiving Stock...' : 'Confirm Restock & Update Godown'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
