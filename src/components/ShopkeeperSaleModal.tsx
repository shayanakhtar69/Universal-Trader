import React, { useState } from 'react';
import { Customer, Product, Order, User } from '../types';
import { api } from '../api';
import { formatCurrency, THEME } from '../theme';
import { searchMatchesCustomer, searchMatchesProduct } from '../searchUtils';
import {
  X,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
  Package,
  CreditCard,
  Search,
  Printer,
  Receipt,
  Store,
} from 'lucide-react';
import { BillReceipt } from './BillReceipt';

interface ShopkeeperSaleModalProps {
  initialCustomer?: Customer | null;
  customers: Customer[];
  products: Product[];
  currentUser: User;
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export const ShopkeeperSaleModal: React.FC<ShopkeeperSaleModalProps> = ({
  initialCustomer,
  customers,
  products,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [customerList, setCustomerList] = useState<Customer[]>(customers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(initialCustomer || null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Keep customer list synced if props change
  React.useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

  // New Quick Customer Mode
  const [isAddingNewShopkeeper, setIsAddingNewShopkeeper] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopPhone, setNewShopPhone] = useState('');
  const [newShopAddress, setNewShopAddress] = useState('');
  const [newShopOpeningBalance, setNewShopOpeningBalance] = useState('');

  // Cart: Map<productId, quantity>
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'partial'>('cash');
  const [amountPaidNow, setAmountPaidNow] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Cart handlers
  const updateQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const copy = new Map(prev);
      const current = Number(copy.get(productId) || 0);
      const next = current + delta;
      if (next <= 0) {
        copy.delete(productId);
      } else {
        if (next > prod.current_stock) {
          alert(`Cannot exceed available Godown stock of ${prod.current_stock} ${prod.unit.replace('_', ' ')} for ${prod.name}`);
          return prev;
        }
        copy.set(productId, next);
      }
      return copy;
    });
  };

  const setExplicitQty = (productId: string, qty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const copy = new Map(prev);
      if (qty <= 0) {
        copy.delete(productId);
      } else {
        if (qty > prod.current_stock) {
          alert(`Cannot exceed available stock of ${prod.current_stock} for ${prod.name}`);
          copy.set(productId, prod.current_stock);
        } else {
          copy.set(productId, qty);
        }
      }
      return copy;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const copy = new Map(prev);
      copy.delete(productId);
      return copy;
    });
  };

  // Calculations
  const cartItemsList = Array.from(cart.entries()).map(([productId, quantity]) => {
    const prod = products.find((p) => p.id === productId)!;
    return {
      product: prod,
      quantity,
      lineTotal: (prod?.wholesale_price || 0) * quantity,
    };
  });

  const grandTotal = cartItemsList.reduce((sum, item) => sum + item.lineTotal, 0);

  const calculatedPaidAmount =
    paymentType === 'cash'
      ? grandTotal
      : paymentType === 'credit'
      ? 0
      : Math.min(Number(amountPaidNow || 0), grandTotal);

  const remainingBalance = Math.max(0, grandTotal - calculatedPaidAmount);

  // Quick Register Shopkeeper
  const handleQuickRegisterShopkeeper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim() || !newShopPhone.trim()) {
      setError('Shopkeeper name and mobile number are required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.createCustomer({
        name: newShopName.trim(),
        phone: newShopPhone.trim(),
        address: newShopAddress.trim() || 'Market Store',
        opening_balance: newShopOpeningBalance ? Number(newShopOpeningBalance) : 0,
      });
      setCustomerList((prev) => [res.customer, ...prev]);
      setSelectedCustomer(res.customer);
      setIsAddingNewShopkeeper(false);
      setNewShopName('');
      setNewShopPhone('');
      setNewShopAddress('');
      setNewShopOpeningBalance('');
    } catch (err: any) {
      setError(err.message || 'Failed to register shopkeeper');
    } finally {
      setLoading(false);
    }
  };

  // Submit Sale Order
  const handleSubmitSale = async () => {
    if (!selectedCustomer) {
      setError('Please select or add a Shopkeeper first.');
      return;
    }
    if (cart.size === 0) {
      setError('Please add at least one grocery item to the wholesale bill.');
      return;
    }

    const items = Array.from(cart.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    try {
      setLoading(true);
      setError(null);
      const res = await api.createOrder({
        customerId: selectedCustomer.id,
        items,
        paymentType,
        amountPaidNow: paymentType === 'partial' ? Number(amountPaidNow) : undefined,
        notes: notes.trim() || undefined,
      });

      setCompletedOrder(res.order);
      onSuccess(res.order);
    } catch (err: any) {
      setError(err.message || 'Failed to generate wholesale bill.');
    } finally {
      setLoading(false);
    }
  };

  if (completedOrder) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-xl shadow-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3">
            <div className="flex items-center gap-2 text-[#3F7D58]">
              <CheckCircle2 className="w-6 h-6" />
              <div>
                <h3 className="font-display font-bold text-lg text-[#1F2B3A]">
                  Wholesale Bill Generated Successfully!
                </h3>
                <p className="text-xs font-mono text-[#55606B]">
                  Invoice: <strong className="text-[#1F2B3A]">{completedOrder.invoice_number}</strong> • Shopkeeper: {completedOrder.customer_name}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-[#55606B] hover:text-[#1F2B3A] cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-[#EEF0EC] p-3 rounded font-mono text-xs space-y-1.5 border border-[#D8DDD4]">
            <div className="flex justify-between">
              <span className="text-[#55606B]">Total Bill Amount:</span>
              <span className="font-bold text-sm text-[#1F2B3A]">Rs. {completedOrder.total_amount.toLocaleString('en-PK')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55606B]">Cash Received:</span>
              <span className="font-bold text-sm text-[#3F7D58]">Rs. {completedOrder.amount_paid.toLocaleString('en-PK')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55606B]">Added to Shopkeeper Khata (Credit):</span>
              <span className={`font-bold text-sm ${completedOrder.remaining_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'}`}>
                Rs. {completedOrder.remaining_balance.toLocaleString('en-PK')}
              </span>
            </div>
          </div>

          <div className="border border-[#1F2B3A] p-2 bg-white rounded max-h-80 overflow-y-auto">
            <BillReceipt order={completedOrder} onClose={onClose} />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-xs cursor-pointer"
            >
              Done / Return to Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-[#1F2B3A] text-white p-4 flex items-center justify-between border-b border-[#1F2B3A] shrink-0">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-[#D9A441]" />
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-white">
                Wholesale Sale to Shopkeeper / Retailer
              </h2>
              <p className="text-[11px] text-slate-300 font-mono">
                Select Shopkeeper • Add Grocery Items from Godown • Set Cash or Khata Terms
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-y-auto flex-1">
          {/* Left Column: Shopkeeper Selection & Product Catalog (7 cols) */}
          <div className="lg:col-span-7 p-4 border-r border-[#D8DDD4] space-y-4">
            {/* Step 1: Shopkeeper Box */}
            <div className="border border-[#D8DDD4] bg-white p-3.5 rounded shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-mono font-bold text-xs text-[#1F2B3A] uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-[#D9A441]" />
                  <span>1. Select Shopkeeper / Grocery Retailer*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewShopkeeper(!isAddingNewShopkeeper)}
                  className="text-xs font-mono text-[#D9A441] hover:underline font-bold cursor-pointer"
                >
                  {isAddingNewShopkeeper ? '✕ Choose Existing Shop' : '+ Add New Shopkeeper'}
                </button>
              </div>

              {isAddingNewShopkeeper ? (
                <form onSubmit={handleQuickRegisterShopkeeper} className="bg-[#EEF0EC] p-3 rounded space-y-2 text-xs font-sans border border-[#D8DDD4]">
                  <div className="font-mono font-bold text-[11px] text-[#1F2B3A]">
                    Quick Add Shopkeeper / Store
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Shop Name (e.g. Madina Mart)*"
                        value={newShopName}
                        onChange={(e) => setNewShopName(e.target.value)}
                        className="w-full bg-white border border-[#55606B] px-2.5 py-1.5 rounded text-xs outline-hidden"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        required
                        placeholder="Mobile / WhatsApp #*"
                        value={newShopPhone}
                        onChange={(e) => setNewShopPhone(e.target.value)}
                        className="w-full bg-white border border-[#55606B] px-2.5 py-1.5 rounded text-xs font-mono outline-hidden"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Market Area / Address"
                        value={newShopAddress}
                        onChange={(e) => setNewShopAddress(e.target.value)}
                        className="w-full bg-white border border-[#55606B] px-2.5 py-1.5 rounded text-xs outline-hidden"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Previous Khata Balance (Rs.)"
                        value={newShopOpeningBalance}
                        onChange={(e) => setNewShopOpeningBalance(e.target.value)}
                        className="w-full bg-white border border-[#55606B] px-2.5 py-1.5 rounded text-xs font-mono outline-hidden"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-1.5 bg-[#1F2B3A] text-white font-mono font-bold text-xs rounded hover:bg-slate-800 transition cursor-pointer"
                  >
                    {loading ? 'Saving...' : 'Save & Select Shopkeeper'}
                  </button>
                </form>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                    <input
                      type="text"
                      placeholder="Search shopkeeper by store name, mobile #, or address..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-1.5 text-xs font-sans border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
                    />
                    {customerSearch && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearch('')}
                        className="absolute right-2.5 top-2 text-[#55606B] hover:text-[#1F2B3A] text-xs font-bold cursor-pointer"
                        title="Clear search"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-[#D8DDD4] border border-[#D8DDD4] rounded bg-white">
                    {(() => {
                      const filtered = customerList.filter((c) => searchMatchesCustomer(c, customerSearch));

                      if (customerList.length === 0) {
                        return (
                          <div className="p-3 text-xs text-center text-[#55606B]">
                            No shopkeepers found. Click "+ Quick Add Store" above to register one.
                          </div>
                        );
                      }

                      if (filtered.length === 0) {
                        return (
                          <div className="p-3 text-xs text-center text-[#55606B]">
                            <div>No shopkeeper matching "{customerSearch}".</div>
                            <button
                              type="button"
                              onClick={() => {
                                setNewShopName(customerSearch);
                                setIsAddingNewShopkeeper(true);
                              }}
                              className="mt-1 text-xs text-[#D9A441] underline font-bold cursor-pointer"
                            >
                              + Register "{customerSearch}" as New Shopkeeper
                            </button>
                          </div>
                        );
                      }

                      return filtered.slice(0, 15).map((c) => {
                        const isSelected = selectedCustomer?.id === c.id;
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedCustomer(c)}
                            className={`p-2 text-xs flex items-center justify-between cursor-pointer transition ${
                              isSelected ? 'bg-amber-100 border-l-4 border-[#D9A441]' : 'hover:bg-[#F7F8F5]'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-[#1F2B3A]">{c.name}</div>
                              <div className="text-[11px] text-[#55606B]">
                                {c.phone} • {c.address}
                              </div>
                            </div>
                            <div className="text-right font-mono">
                              <span className="text-[10px] text-[#55606B] block">Khata Balance:</span>
                              <span
                                className={`font-bold ${
                                  c.credit_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'
                                }`}
                              >
                                Rs. {c.credit_balance.toLocaleString('en-PK')}
                              </span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {selectedCustomer && (
                <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded text-xs font-mono flex items-center justify-between">
                  <div>
                    <span className="text-[#55606B] text-[10px] uppercase block">Selected Shop:</span>
                    <strong className="text-sm font-sans text-[#1F2B3A]">{selectedCustomer.name}</strong>
                    <div className="text-[11px] text-[#55606B]">{selectedCustomer.phone} • {selectedCustomer.address}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#55606B] block">Current Udhaar:</span>
                    <span className={`font-bold ${selectedCustomer.credit_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'}`}>
                      Rs. {selectedCustomer.credit_balance.toLocaleString('en-PK')}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Grocery Catalog */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono font-bold text-xs text-[#1F2B3A] uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#D9A441]" />
                  <span>2. Pick Grocery Products from Godown</span>
                </label>
                <span className="text-[11px] font-mono text-[#55606B]">{products.length} Products</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-[#55606B]" />
                  <input
                    type="text"
                    placeholder="Search product by name, code, category..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-8 pr-7 py-1 text-xs border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-2 top-1.5 text-[#55606B] hover:text-[#1F2B3A] text-xs font-bold cursor-pointer"
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full border border-[#55606B] px-2 py-1 text-xs rounded outline-hidden"
                >
                  <option value="all">All Grocery Categories</option>
                  <option value="Grains & Pulses">Grains & Pulses</option>
                  <option value="Edible Oils">Edible Oils & Ghee</option>
                  <option value="Spices">Spices & Condiments</option>
                  <option value="Commodities">Sugar, Salt & Tea</option>
                  <option value="Flours">Flours & Atta</option>
                  <option value="Packaged Foods">Packaged Goods</option>
                </select>
              </div>

              {/* Product Grid / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1 border border-[#D8DDD4] rounded bg-[#F7F8F5]">
                {products
                  .filter((p) => {
                    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
                    const matchSearch = searchMatchesProduct(p, productSearch);
                    return matchCat && matchSearch;
                  })
                  .map((p) => {
                    const inCartQty = cart.get(p.id) || 0;
                    const isOutOfStock = p.current_stock <= 0;

                    return (
                      <div
                        key={p.id}
                        className={`p-2.5 bg-white border rounded shadow-2xs font-mono text-xs flex flex-col justify-between ${
                          inCartQty > 0 ? 'border-[#D9A441] ring-1 ring-[#D9A441]' : 'border-[#D8DDD4]'
                        }`}
                      >
                        <div>
                          <div className="font-sans font-bold text-xs text-[#1F2B3A] line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-[#55606B] flex items-center justify-between mt-0.5">
                            <span>{p.category}</span>
                            <span className="font-bold text-[#1F2B3A] bg-amber-50 px-1 rounded">
                              Rate: Rs. {p.wholesale_price.toLocaleString('en-PK')} / {p.unit.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 mt-1 border-t border-[#D8DDD4]">
                          <span
                            className={`text-[10px] ${
                              isOutOfStock ? 'text-red-600 font-bold' : 'text-[#55606B]'
                            }`}
                          >
                            Stock: {p.current_stock}
                          </span>

                          {inCartQty > 0 ? (
                            <div className="flex items-center gap-1 bg-[#EEF0EC] p-0.5 rounded border border-[#D8DDD4]">
                              <button
                                type="button"
                                onClick={() => updateQty(p.id, -1)}
                                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-red-50 text-[#1F2B3A] rounded cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center font-bold text-xs">{inCartQty}</span>
                              <button
                                type="button"
                                onClick={() => updateQty(p.id, 1)}
                                className="w-5 h-5 flex items-center justify-center bg-white hover:bg-emerald-50 text-[#1F2B3A] rounded cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={isOutOfStock}
                              onClick={() => updateQty(p.id, 1)}
                              className="px-2.5 py-1 bg-[#1F2B3A] hover:bg-slate-800 disabled:opacity-40 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-[#D9A441]" />
                              <span>Add</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Right Column: Bill Summary & Payment Terms (5 cols) */}
          <div className="lg:col-span-5 p-4 bg-[#FCFDF9] flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2">
                <h3 className="font-mono font-bold text-xs text-[#1F2B3A] uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-[#D9A441]" />
                  <span>Wholesale Bill Items ({cart.size})</span>
                </h3>
                {cart.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart(new Map())}
                    className="text-[10px] text-red-600 hover:underline font-mono cursor-pointer"
                  >
                    Clear Bill
                  </button>
                )}
              </div>

              {/* Items in Cart Table */}
              {cartItemsList.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-[#55606B] border border-dashed border-[#D8DDD4] rounded">
                  No grocery items added yet. Click "+ Add" on items to the left.
                </div>
              ) : (
                <div className="max-h-44 overflow-y-auto divide-y divide-[#D8DDD4] border border-[#D8DDD4] rounded bg-white font-mono text-xs">
                  {cartItemsList.map((item) => (
                    <div key={item.product.id} className="p-2 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-sans font-bold text-xs text-[#1F2B3A] truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-[#55606B]">
                          Rs. {item.product.wholesale_price.toLocaleString('en-PK')} × {item.quantity} {item.product.unit.replace('_', ' ')}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#1F2B3A]">
                          Rs. {item.lineTotal.toLocaleString('en-PK')}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Terms Section */}
              <div className="bg-[#EEF0EC] p-3 rounded border border-[#D8DDD4] space-y-2 font-mono text-xs">
                <label className="font-bold text-[11px] text-[#1F2B3A] block uppercase tracking-wider">
                  Payment Terms / Khata
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentType('cash')}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] border transition cursor-pointer ${
                      paymentType === 'cash'
                        ? 'bg-[#3F7D58] text-white border-[#3F7D58]'
                        : 'bg-white text-[#1F2B3A] border-[#D8DDD4] hover:bg-slate-50'
                    }`}
                  >
                    💵 Full Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('credit')}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] border transition cursor-pointer ${
                      paymentType === 'credit'
                        ? 'bg-[#C1443C] text-white border-[#C1443C]'
                        : 'bg-white text-[#1F2B3A] border-[#D8DDD4] hover:bg-slate-50'
                    }`}
                  >
                    📒 Full Udhaar
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('partial')}
                    className={`py-1.5 px-2 rounded font-bold text-[11px] border transition cursor-pointer ${
                      paymentType === 'partial'
                        ? 'bg-[#D9A441] text-[#1F2B3A] border-[#D9A441]'
                        : 'bg-white text-[#1F2B3A] border-[#D8DDD4] hover:bg-slate-50'
                    }`}
                  >
                    ⚖️ Partial
                  </button>
                </div>

                {paymentType === 'partial' && (
                  <div className="pt-1">
                    <label className="font-bold text-[10px] text-[#1F2B3A] block mb-0.5">
                      Cash Amount Paid Now (Rs.):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={grandTotal}
                      placeholder="e.g. 5000"
                      value={amountPaidNow}
                      onChange={(e) => setAmountPaidNow(e.target.value)}
                      className="w-full bg-white border border-[#1F2B3A] px-2.5 py-1 text-sm font-bold text-[#1F2B3A] rounded outline-hidden"
                    />
                  </div>
                )}

                <div>
                  <input
                    type="text"
                    placeholder="Invoice memo / Delivery notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-white border border-[#D8DDD4] px-2.5 py-1 text-xs rounded outline-hidden mt-1 font-sans"
                  />
                </div>
              </div>

              {/* Financial Calculation Box */}
              <div className="bg-white p-3 border-2 border-[#1F2B3A] rounded font-mono text-xs space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-[#55606B]">Gross Bill Total:</span>
                  <span className="font-bold text-sm text-[#1F2B3A]">Rs. {grandTotal.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#55606B]">Cash Received:</span>
                  <span className="font-bold text-sm text-[#3F7D58]">Rs. {calculatedPaidAmount.toLocaleString('en-PK')}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-[#D8DDD4] pt-1">
                  <span className="text-[#55606B]">Add to Shopkeeper Khata:</span>
                  <span className={`font-bold text-sm ${remainingBalance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'}`}>
                    Rs. {remainingBalance.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2 text-xs font-mono text-[#C1443C] flex items-center gap-1.5 rounded">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[#D8DDD4]">
              <button
                type="button"
                disabled={loading || cart.size === 0 || !selectedCustomer}
                onClick={handleSubmitSale}
                className="w-full py-3 bg-[#D9A441] hover:bg-[#D9A441]/90 disabled:opacity-50 text-[#1F2B3A] font-mono font-bold text-xs uppercase tracking-widest rounded shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Receipt className="w-4 h-4" />
                <span>{loading ? 'Generating Wholesale Bill...' : 'Generate Bill & Dispatch Grocery'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-1.5 border border-[#55606B] text-[#55606B] font-mono text-xs hover:bg-[#EEF0EC] transition text-center cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
