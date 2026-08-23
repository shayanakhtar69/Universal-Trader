import React, { useState, useEffect, useMemo } from 'react';
import { User, Product, Customer, Order } from '../types';
import { api } from '../api';
import { THEME, formatCurrency, formatDate } from '../theme';
import { BillReceipt } from './BillReceipt';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { NewCustomerModal } from './NewCustomerModal';
import { searchMatchesCustomer, searchMatchesProduct } from '../searchUtils';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Plus,
  ShoppingBag,
  Users,
  Receipt,
  Search,
  Check,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Banknote,
  Clock,
  Sparkles,
  RefreshCw,
  Minus,
  CheckCircle2,
  TrendingUp,
  FileText,
  Share2,
  Printer,
  Copy,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  KeyRound,
  Calculator,
} from 'lucide-react';

interface SalesmanMobileAppProps {
  currentUser: User;
  onLogout: () => void;
}

type SalesmanTab = 'home' | 'new_order' | 'my_orders' | 'my_customers' | 'closing';

export const SalesmanMobileApp: React.FC<SalesmanMobileAppProps> = ({ currentUser, onLogout }) => {
  const [activeTab, setActiveTab] = useState<SalesmanTab>('home');
  const [loading, setLoading] = useState(false);

  // Products & Customers
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);

  // New Order State
  const [orderStep, setOrderStep] = useState<'customer' | 'items' | 'payment' | 'bill'>('customer');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<Map<string, number>>(new Map());
  const [paymentType, setPaymentType] = useState<'cash' | 'credit' | 'partial'>('cash');
  const [partialAmount, setPartialAmount] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Modals & Search
  const [myOrderSearch, setMyOrderSearch] = useState('');
  const [myOrderFilter, setMyOrderFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [myCustomerSearch, setMyCustomerSearch] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showTerminalInfoModal, setShowTerminalInfoModal] = useState(false);
  const [viewingBillOrder, setViewingBillOrder] = useState<Order | null>(null);
  const [viewingCustomerLedger, setViewingCustomerLedger] = useState<Customer | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pRes, cRes, oRes] = await Promise.all([
        api.getProducts(),
        api.getCustomers(),
        api.getMyOrders(),
      ]);
      setProducts(pRes.products);
      setCustomers(cRes.customers);
      setMyOrders(oRes.orders);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.id]);

  // Reset Order Form
  const startNewOrder = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setProductSearch('');
    setCart(new Map());
    setPaymentType('cash');
    setPartialAmount('');
    setOrderNotes('');
    setCompletedOrder(null);
    setOrderError(null);
    setOrderStep('customer');
    setActiveTab('new_order');
  };

  // Cart operations with stock boundary protection
  const updateCartQty = (productId: string, delta: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const copy = new Map(prev);
      const current: number = Number(copy.get(productId)) || 0;
      const next = current + delta;

      if (next <= 0) {
        copy.delete(productId);
      } else {
        if (next > prod.current_stock) {
          setOrderError(`Cannot add more than available stock (${prod.current_stock} ${prod.unit.replace('_', ' ')}) for "${prod.name}"`);
          setTimeout(() => setOrderError(null), 3000);
          return prev;
        }
        copy.set(productId, next);
      }
      return copy;
    });
  };

  const setCartExactQty = (productId: string, qty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) => {
      const copy = new Map(prev);
      if (qty <= 0) {
        copy.delete(productId);
      } else {
        const safeQty = Math.min(qty, prod.current_stock);
        if (qty > prod.current_stock) {
          setOrderError(`Adjusted to maximum available stock (${prod.current_stock} ${prod.unit})`);
          setTimeout(() => setOrderError(null), 3000);
        }
        copy.set(productId, safeQty);
      }
      return copy;
    });
  };

  // Cart Total Calculation
  const cartItemsList = Array.from(cart.entries()).map(([prodId, qty]) => {
    const prod = products.find((p) => p.id === prodId)!;
    return {
      product: prod,
      quantity: qty,
      lineTotal: (prod?.wholesale_price || 0) * qty,
    };
  });

  const cartTotalAmount = cartItemsList.reduce((sum, item) => sum + item.lineTotal, 0);

  // Submit Order
  const handleConfirmOrder = async () => {
    if (!selectedCustomer) {
      setOrderError('Customer is required.');
      return;
    }
    if (cart.size === 0) {
      setOrderError('Cart is empty.');
      return;
    }

    try {
      setSubmittingOrder(true);
      setOrderError(null);

      const itemsPayload = Array.from(cart.entries()).map(([productId, quantity]) => ({
        productId,
        quantity,
      }));

      const res = await api.createOrder({
        customerId: selectedCustomer.id,
        items: itemsPayload,
        paymentType,
        amountPaidNow: paymentType === 'partial' ? Number(partialAmount) : undefined,
        notes: orderNotes,
      });

      setCompletedOrder(res.order);
      setOrderStep('bill');
      await loadData();
    } catch (err: any) {
      setOrderError(err.message || 'Failed to submit order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Today's own sales calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = myOrders.filter((o) => o.created_at && o.created_at.startsWith(todayStr));
  const todaySalesTotal = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const todayCashCollected = todayOrders.reduce((sum, o) => sum + o.amount_paid, 0);
  const todayCreditGiven = todaySalesTotal - todayCashCollected;

  // 7-Day Sales Trend Calculation for current salesman
  const salesTrend7Days = useMemo(() => {
    const data: { day: string; fullDate: string; sales: number; bills: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Today' : d.toLocaleDateString('en-PK', { weekday: 'short' });

      const dayOrders = myOrders.filter((ord) => {
        if (!ord.created_at) return false;
        return ord.created_at.startsWith(dateKey);
      });

      const daySales = dayOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      data.push({
        day: dayName,
        fullDate: dateKey,
        sales: daySales,
        bills: dayOrders.length,
      });
    }
    return data;
  }, [myOrders]);

  // Personal Direct Link
  const myDirectLink = currentUser.access_token
    ? `${window.location.origin}/?salesman_token=${currentUser.access_token}`
    : `${window.location.origin}/?portal=salesman&u=${encodeURIComponent(currentUser.username)}`;

  const handleCopyMyLink = () => {
    navigator.clipboard.writeText(myDirectLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // WhatsApp Handover Message Generator
  const sendHandoverToOwner = () => {
    const text = encodeURIComponent(
      `📊 *DAILY CASH HANDOVER & CLOSING REPORT*\n` +
      `🏪 *Universal Trader - Counter POS*\n` +
      `------------------------------------\n` +
      `👤 *Salesman:* ${currentUser.name} (${currentUser.username})\n` +
      `📅 *Date:* ${new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}\n` +
      `------------------------------------\n` +
      `🧾 *Bills Created Today:* ${todayOrders.length}\n` +
      `💰 *Total Billed Sales:* Rs. ${todaySalesTotal.toLocaleString('en-PK')}.00\n` +
      `💵 *CASH COLLECTED (IN DRAWER):* Rs. ${todayCashCollected.toLocaleString('en-PK')}.00\n` +
      `📝 *Credit (Udhar) Billed:* Rs. ${todayCreditGiven.toLocaleString('en-PK')}.00\n` +
      `------------------------------------\n` +
      `✅ Ready for cash deposit & owner reconciliation.`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#EEF0EC] min-h-[85vh] flex flex-col font-sans border-x border-[#D8DDD4] shadow-sm pb-20">
      {/* Salesman Counter Dedicated Header */}
      <div className="bg-[#1F2B3A] text-white px-4 py-3 border-b border-[#1F2B3A] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-[#D9A441] text-[#1F2B3A] flex items-center justify-center font-bold text-base font-mono shadow-xs">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="font-display font-bold text-sm leading-tight text-white flex items-center gap-1.5">
              <span>{currentUser.name}</span>
              <span className="text-[10px] bg-[#3F7D58] text-white font-mono px-1.5 py-0.2 rounded">
                Counter POS
              </span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              Terminal: <span className="text-[#D9A441] font-bold">@{currentUser.username}</span> • {currentUser.phone || 'No phone'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowTerminalInfoModal(true)}
            title="My Direct Link & Badge"
            className="p-1.5 text-amber-300 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={loadData}
            title="Refresh Counter Data"
            className="p-1.5 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 p-3 sm:p-4">
        {/* ================================================= */}
        {/* 1. HOME TAB (SALESMAN'S PERSONAL WORKSPACE) */}
        {/* ================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-4">
            {/* Primary Action Button: Big Mustard Button */}
            <button
              id="salesman-btn-new-order"
              onClick={startNewOrder}
              className="w-full py-4 px-5 bg-[#D9A441] hover:bg-[#D9A441]/90 active:scale-[0.99] text-[#1F2B3A] border border-black/10 font-mono font-bold text-base rounded uppercase tracking-wider flex items-center justify-center gap-3 shadow-sm transition cursor-pointer"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              <span>+ New Takeaway Order (F2)</span>
            </button>

            {/* Salesman Today's Own Summary Card */}
            <div className="bg-white border border-black/5 rounded p-4 sm:p-5 stat-card-mustard shadow-xs">
              <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-3.5">
                <span className="font-mono text-[10px] font-bold uppercase text-[#55606B] tracking-wider flex items-center gap-1.5">
                  <Banknote className="w-4 h-4 text-[#3F7D58]" />
                  Today's Counter Performance
                </span>
                <span className="font-mono text-xs font-bold text-[#1F2B3A] bg-[#EEF0EC] px-2 py-0.5 rounded">
                  {todayOrders.length} Bills
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 font-mono">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#55606B] tracking-wider block">Total Billed Today</span>
                  <div className="mono text-xl sm:text-2xl font-bold text-[#1F2B3A] mt-0.5">
                    Rs. {todaySalesTotal.toLocaleString('en-PK')}.00
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[#55606B] tracking-wider block">Cash In Drawer</span>
                  <div className="mono text-xl sm:text-2xl font-bold text-[#3F7D58] mt-0.5">
                    Rs. {todayCashCollected.toLocaleString('en-PK')}.00
                  </div>
                </div>
              </div>

              {todayCreditGiven > 0 && (
                <div className="mt-3 pt-2.5 border-t border-black/5 flex items-center justify-between text-xs font-mono text-[#55606B]">
                  <span>Today's Credit (Udhar):</span>
                  <span className="font-bold text-[#C1443C]">Rs. {todayCreditGiven.toLocaleString('en-PK')}.00</span>
                </div>
              )}
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
              <button
                onClick={() => setActiveTab('my_orders')}
                className="p-3 bg-white border border-[#D8DDD4] hover:border-[#1F2B3A] rounded text-left transition cursor-pointer"
              >
                <Receipt className="w-4 h-4 text-[#D9A441] mb-1.5" />
                <div className="font-bold text-[#1F2B3A]">My Invoices</div>
                <div className="text-[10px] text-[#55606B]">{myOrders.length} Total Bills</div>
              </button>

              <button
                onClick={() => setActiveTab('closing')}
                className="p-3 bg-white border border-[#D8DDD4] hover:border-[#1F2B3A] rounded text-left transition cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-[#3F7D58] mb-1.5" />
                <div className="font-bold text-[#1F2B3A]">Day Closing</div>
                <div className="text-[10px] text-[#55606B]">Cash Handover Slip</div>
              </button>
            </div>

            {/* Sales Trend Line Chart (Last 7 Days) */}
            <div id="salesman-sales-trend-card" className="bg-white border border-black/5 rounded p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-3.5">
                <span className="font-mono text-[10px] font-bold uppercase text-[#55606B] tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#D9A441]" />
                  Sales Trend (Last 7 Days)
                </span>
                <span className="font-mono text-xs font-bold text-[#1F2B3A]">
                  7D: <span className="text-[#3F7D58]">Rs. {salesTrend7Days.reduce((acc, curr) => acc + curr.sales, 0).toLocaleString('en-PK')}</span>
                </span>
              </div>

              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesTrend7Days} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EC" vertical={false} />
                    <XAxis
                      dataKey="day"
                      tick={{ fill: '#55606B', fontSize: 11, fontFamily: 'monospace' }}
                      axisLine={{ stroke: '#D8DDD4' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#55606B', fontSize: 10, fontFamily: 'monospace' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : `${val}`)}
                    />
                    <Tooltip
                      formatter={(value: any) => [`Rs. ${Number(value).toLocaleString('en-PK')}`, 'Sales Revenue']}
                      labelFormatter={(label: any) => `Day: ${label}`}
                      contentStyle={{
                        backgroundColor: '#1F2B3A',
                        color: '#EEF0EC',
                        borderRadius: '4px',
                        border: '1px solid #D9A441',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                        padding: '6px 10px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#D9A441"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#1F2B3A', stroke: '#D9A441', strokeWidth: 1.5 }}
                      activeDot={{ r: 5.5, fill: '#D9A441', stroke: '#1F2B3A', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Orders (Salesman's Own Only) */}
            <div className="bg-white border border-black/5 rounded p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-3">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#1F2B3A] flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-[#D9A441]" />
                  My Recent Counter Bills
                </span>
                <button
                  onClick={() => setActiveTab('my_orders')}
                  className="text-xs text-[#55606B] hover:text-[#1F2B3A] font-mono underline cursor-pointer"
                >
                  View All ({myOrders.length})
                </button>
              </div>

              {myOrders.length === 0 ? (
                <div className="py-6 text-center text-xs font-mono text-[#55606B]">
                  No orders generated today yet. Tap "+ New Takeaway Order" above.
                </div>
              ) : (
                <div className="space-y-2">
                  {myOrders.slice(0, 4).map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => setViewingBillOrder(ord)}
                      className="p-3 border border-black/5 bg-[#FCFDF9] hover:bg-[#EEF0EC]/50 cursor-pointer rounded flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-mono font-bold text-[#1F2B3A]">
                          #{ord.invoice_number}
                        </div>
                        <div className="font-sans text-[#55606B] text-[11px]">
                          {ord.customer_name}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-[#1F2B3A]">
                          Rs. {ord.total_amount.toFixed(2)}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase font-mono ${
                            ord.status === 'paid'
                              ? 'bg-[#3F7D58]/10 text-[#3F7D58]'
                              : 'bg-[#C1443C]/10 text-[#C1443C]'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 2. NEW ORDER WIZARD TAB */}
        {/* ================================================= */}
        {activeTab === 'new_order' && (
          <div className="space-y-3">
            {/* Step Indicators */}
            {orderStep !== 'bill' && (
              <div className="flex items-center justify-between bg-white border border-[#1F2B3A] p-2 text-xs font-mono mb-2">
                <button
                  onClick={() => setOrderStep('customer')}
                  className={`flex items-center gap-1 font-bold ${
                    orderStep === 'customer' ? 'text-[#D9A441]' : 'text-[#1F2B3A]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#1F2B3A] text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Customer</span>
                </button>

                <ArrowRight className="w-3.5 h-3.5 text-[#55606B]" />

                <button
                  onClick={() => selectedCustomer && setOrderStep('items')}
                  disabled={!selectedCustomer}
                  className={`flex items-center gap-1 font-bold disabled:opacity-40 ${
                    orderStep === 'items' ? 'text-[#D9A441]' : 'text-[#1F2B3A]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#1F2B3A] text-white flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <span>Items ({cart.size})</span>
                </button>

                <ArrowRight className="w-3.5 h-3.5 text-[#55606B]" />

                <button
                  onClick={() => cart.size > 0 && setOrderStep('payment')}
                  disabled={cart.size === 0}
                  className={`flex items-center gap-1 font-bold disabled:opacity-40 ${
                    orderStep === 'payment' ? 'text-[#D9A441]' : 'text-[#1F2B3A]'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-[#1F2B3A] text-white flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <span>Payment</span>
                </button>
              </div>
            )}

            {orderError && (
              <div className="bg-[#C1443C]/10 border border-[#C1443C] p-2 text-xs font-mono text-[#C1443C] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{orderError}</span>
              </div>
            )}

            {/* STEP 1: SELECT OR ADD CUSTOMER */}
            {orderStep === 'customer' && (
              <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2">
                  <span className="font-mono font-bold text-xs uppercase text-[#1F2B3A]">
                    Step 1: Select Customer
                  </span>
                  <button
                    onClick={() => setShowAddCustomerModal(true)}
                    className="flex items-center gap-1 text-xs font-mono font-bold text-[#3F7D58] hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add New</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                  <input
                    type="text"
                    placeholder="Search by shop name or phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs font-sans border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
                  />
                  {customerSearch && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearch('')}
                      className="absolute right-2.5 top-2 text-[#55606B] hover:text-[#1F2B3A] text-xs font-bold cursor-pointer"
                      title="Clear"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Selected Customer Card Preview */}
                {selectedCustomer && (
                  <div className="p-3 bg-[#EEF0EC] border-2 border-[#3F7D58] rounded flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-sm text-[#1F2B3A] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-[#3F7D58]" />
                        {selectedCustomer.name}
                      </div>
                      <div className="font-mono text-[11px] text-[#55606B]">
                        Ph: {selectedCustomer.phone} • Balance:{' '}
                        <span
                          className={`font-bold ${
                            selectedCustomer.credit_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'
                          }`}
                        >
                          Rs. {selectedCustomer.credit_balance.toLocaleString('en-PK')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setOrderStep('items')}
                      className="px-3 py-1.5 bg-[#3F7D58] text-white font-mono font-bold text-xs rounded hover:bg-[#3F7D58]/90 transition cursor-pointer"
                    >
                      Proceed &rarr;
                    </button>
                  </div>
                )}

                {/* Customer List */}
                <div className="max-h-60 overflow-y-auto space-y-1.5 divide-y divide-[#EEF0EC]">
                  {(() => {
                    const filtered = customers.filter((c) => searchMatchesCustomer(c, customerSearch));

                    if (customers.length === 0) {
                      return (
                        <div className="p-4 text-center text-xs font-mono text-[#55606B]">
                          No shopkeepers registered yet.
                        </div>
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-xs font-mono text-[#55606B]">
                          <div>No shopkeepers matching "{customerSearch}".</div>
                          <button
                            type="button"
                            onClick={() => setCustomerSearch('')}
                            className="mt-1 text-xs text-[#D9A441] underline font-bold cursor-pointer"
                          >
                            Clear Search
                          </button>
                        </div>
                      );
                    }

                    return filtered.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setOrderStep('items');
                        }}
                        className={`p-2.5 rounded cursor-pointer transition flex items-center justify-between text-xs ${
                          selectedCustomer?.id === cust.id
                            ? 'bg-[#EEF0EC] border border-[#1F2B3A]'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-[#1F2B3A]">{cust.name}</div>
                          <div className="text-[11px] font-mono text-[#55606B]">
                            {cust.phone} • {cust.address || 'Walk-in'}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          <div
                            className={`font-bold ${
                              cust.credit_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'
                            }`}
                          >
                            Rs. {(cust.credit_balance || 0).toLocaleString('en-PK')}
                          </div>
                          <span className="text-[10px] text-[#55606B]">
                            {cust.credit_balance > 0 ? 'Debt Balance' : 'Clear'}
                          </span>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* STEP 2: SELECT ITEMS */}
            {orderStep === 'items' && (
              <div className="space-y-3">
                {/* Search Products */}
                <div className="bg-white p-3 border-2 border-[#1F2B3A] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs uppercase text-[#1F2B3A]">
                      Step 2: Add Products To Cart
                    </span>
                    <span className="text-xs font-mono font-bold text-[#D9A441]">
                      {cart.size} Items (Rs. {cartTotalAmount.toLocaleString('en-PK')})
                    </span>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                    <input
                      type="text"
                      placeholder="Search items by name, barcode or Urdu title..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full pl-9 pr-8 py-2 text-xs font-sans border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch('')}
                        className="absolute right-2.5 top-2 text-[#55606B] hover:text-[#1F2B3A] text-xs font-bold cursor-pointer"
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Available Products Grid/List */}
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {(() => {
                    const filtered = products.filter((p) => searchMatchesProduct(p, productSearch));

                    if (products.length === 0) {
                      return (
                        <div className="p-6 bg-white border border-[#D8DDD4] text-center text-xs font-mono text-[#55606B]">
                          No products registered in inventory yet.
                        </div>
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="p-6 bg-white border border-[#D8DDD4] text-center text-xs font-mono text-[#55606B]">
                          <div>No products matching "{productSearch}".</div>
                          <button
                            type="button"
                            onClick={() => setProductSearch('')}
                            className="mt-1 text-xs text-[#D9A441] underline font-bold cursor-pointer"
                          >
                            Clear Search
                          </button>
                        </div>
                      );
                    }

                    return filtered.map((prod) => {
                      const inCart = cart.get(prod.id) || 0;
                      const isOutOfStock = prod.current_stock <= 0;

                      return (
                        <div
                          key={prod.id}
                          className={`p-3 bg-white border rounded flex items-center justify-between text-xs transition ${
                            inCart > 0
                              ? 'border-[#D9A441] shadow-xs'
                              : 'border-[#D8DDD4] hover:border-[#1F2B3A]'
                          } ${isOutOfStock ? 'opacity-60 bg-gray-50' : ''}`}
                        >
                          <div className="flex-1 pr-2">
                            <div className="font-bold text-[#1F2B3A]">{prod.name}</div>
                            {prod.name_ur && (
                              <div className="text-right font-sans text-xs text-[#55606B]">
                                {prod.name_ur}
                              </div>
                            )}
                            <div className="font-mono text-[11px] text-[#55606B] flex items-center gap-2 mt-0.5">
                              <span>Wholesale: <strong className="text-[#1F2B3A]">Rs. {prod.wholesale_price}</strong></span>
                              <span>•</span>
                              <span
                                className={`font-bold ${
                                  prod.current_stock <= prod.min_stock_alert
                                    ? 'text-[#C1443C]'
                                    : 'text-[#3F7D58]'
                                }`}
                              >
                                Stock: {prod.current_stock} {prod.unit.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Quick Qty Controls */}
                          <div className="flex items-center gap-1.5 font-mono">
                            {inCart > 0 ? (
                              <div className="flex items-center gap-1 bg-[#EEF0EC] p-1 rounded border border-[#55606B]">
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(prod.id, -1)}
                                  className="w-6 h-6 bg-white text-[#1F2B3A] font-bold rounded flex items-center justify-center hover:bg-slate-200 cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={prod.current_stock}
                                  value={inCart}
                                  onChange={(e) => setCartExactQty(prod.id, parseInt(e.target.value) || 0)}
                                  className="w-10 text-center font-bold text-xs bg-transparent outline-hidden"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateCartQty(prod.id, 1)}
                                  disabled={inCart >= prod.current_stock}
                                  className="w-6 h-6 bg-[#D9A441] text-[#1F2B3A] font-bold rounded flex items-center justify-center hover:bg-[#D9A441]/80 disabled:opacity-30 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateCartQty(prod.id, 1)}
                                disabled={isOutOfStock}
                                className="px-3 py-1.5 bg-[#1F2B3A] hover:bg-slate-800 disabled:opacity-40 text-white font-bold rounded text-xs transition cursor-pointer"
                              >
                                {isOutOfStock ? 'Out of Stock' : '+ Add'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Footer Proceed Action */}
                {cart.size > 0 && (
                  <div className="bg-[#1F2B3A] text-white p-3 rounded flex items-center justify-between font-mono shadow-md">
                    <div>
                      <div className="text-[10px] uppercase text-slate-300">Total Billed Amount:</div>
                      <div className="text-base font-bold text-[#D9A441]">
                        Rs. {cartTotalAmount.toLocaleString('en-PK')}.00
                      </div>
                    </div>

                    <button
                      onClick={() => setOrderStep('payment')}
                      className="px-4 py-2 bg-[#D9A441] text-[#1F2B3A] font-bold text-xs uppercase tracking-wider rounded hover:bg-[#D9A441]/90 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: PAYMENT & CONFIRMATION */}
            {orderStep === 'payment' && (
              <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2">
                  <span className="font-mono font-bold text-xs uppercase text-[#1F2B3A]">
                    Step 3: Payment & Terms
                  </span>
                  <button
                    onClick={() => setOrderStep('items')}
                    className="text-xs font-mono text-[#55606B] hover:text-[#1F2B3A] underline cursor-pointer"
                  >
                    &larr; Back to Items
                  </button>
                </div>

                {/* Customer summary */}
                <div className="bg-[#F7F8F5] p-2.5 border border-[#D8DDD4] rounded text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-[#55606B]">Shopkeeper:</span>
                    <span className="font-bold text-[#1F2B3A]">{selectedCustomer?.name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[#55606B]">Current Udhar Balance:</span>
                    <span className="font-bold text-[#C1443C]">
                      Rs. {(selectedCustomer?.credit_balance || 0).toLocaleString('en-PK')}
                    </span>
                  </div>
                </div>

                {/* Order Line items preview */}
                <div className="border border-[#D8DDD4] rounded p-2.5 space-y-1 text-xs font-mono max-h-36 overflow-y-auto">
                  {cartItemsList.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-[#55606B]">
                      <span>{item.product.name} × {item.quantity}</span>
                      <span className="font-bold text-[#1F2B3A]">Rs. {item.lineTotal.toLocaleString('en-PK')}</span>
                    </div>
                  ))}
                  <div className="border-t border-[#D8DDD4] pt-1.5 flex justify-between font-bold text-sm text-[#1F2B3A]">
                    <span>Total Amount:</span>
                    <span>Rs. {cartTotalAmount.toLocaleString('en-PK')}</span>
                  </div>
                </div>

                {/* Payment Selection Options */}
                <div className="space-y-2">
                  <span className="text-xs font-mono font-bold uppercase text-[#1F2B3A] block">
                    Select Payment Mode:
                  </span>

                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentType('cash')}
                      className={`p-2.5 border-2 rounded text-center font-bold transition cursor-pointer ${
                        paymentType === 'cash'
                          ? 'border-[#3F7D58] bg-[#3F7D58]/10 text-[#3F7D58]'
                          : 'border-[#D8DDD4] text-[#55606B]'
                      }`}
                    >
                      Full Cash
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('credit')}
                      className={`p-2.5 border-2 rounded text-center font-bold transition cursor-pointer ${
                        paymentType === 'credit'
                          ? 'border-[#C1443C] bg-[#C1443C]/10 text-[#C1443C]'
                          : 'border-[#D8DDD4] text-[#55606B]'
                      }`}
                    >
                      Full Udhar
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentType('partial')}
                      className={`p-2.5 border-2 rounded text-center font-bold transition cursor-pointer ${
                        paymentType === 'partial'
                          ? 'border-[#D9A441] bg-[#D9A441]/10 text-[#D9A441]'
                          : 'border-[#D8DDD4] text-[#55606B]'
                      }`}
                    >
                      Partial
                    </button>
                  </div>

                  {paymentType === 'partial' && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-mono text-[#55606B] mb-1">
                        Cash Amount Received Now (Rs.):
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 500"
                        value={partialAmount}
                        onChange={(e) => setPartialAmount(e.target.value)}
                        className="w-full p-2 border border-[#1F2B3A] rounded font-mono text-xs outline-hidden focus:ring-1 focus:ring-[#D9A441]"
                      />
                    </div>
                  )}
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-[11px] font-mono text-[#55606B] mb-1">
                    Order Remarks / Slip Notes (Optional):
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delivered by van, checked by Munshi"
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="w-full p-2 border border-[#D8DDD4] rounded font-sans text-xs outline-hidden"
                  />
                </div>

                {/* Final Submit Button */}
                <div className="pt-2">
                  <button
                    id="btn-submit-order"
                    onClick={handleConfirmOrder}
                    disabled={submittingOrder}
                    className="w-full py-3.5 px-4 bg-[#3F7D58] hover:bg-[#3F7D58]/90 text-white font-mono font-extrabold text-sm uppercase tracking-wider rounded border-2 border-[#1F2B3A] shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    {submittingOrder ? 'Generating Official Bill...' : 'Confirm Order & Print Voucher'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: GENERATED TORN RECEIPT BILL VIEW */}
            {orderStep === 'bill' && completedOrder && (
              <div className="space-y-4">
                <div className="bg-[#3F7D58]/15 border-2 border-[#3F7D58] p-3 text-center rounded font-mono text-xs text-[#3F7D58] font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Order & Stock Deduction Completed Successfully!</span>
                </div>

                {/* The Signature Bill Component */}
                <BillReceipt
                  order={completedOrder}
                  customer={selectedCustomer}
                  showBack={false}
                />

                <div className="pt-2">
                  <button
                    onClick={startNewOrder}
                    className="w-full py-3 bg-[#1F2B3A] text-white hover:bg-slate-800 font-mono font-bold text-xs uppercase tracking-wider rounded shadow-md transition cursor-pointer"
                  >
                    + Take Next Order (Standby)
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================= */}
        {/* 3. MY ORDERS TAB (STRICTLY ISOLATED TO THIS SALESMAN) */}
        {/* ================================================= */}
        {activeTab === 'my_orders' && (
          <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2">
              <span className="font-mono font-bold text-xs uppercase text-[#1F2B3A]">
                My Counter Orders ({myOrders.length})
              </span>
              <span className="text-[10px] font-mono text-[#3F7D58] font-bold">
                ✓ Terminal Scoped to @{currentUser.username}
              </span>
            </div>

            {/* Search and Filters */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                <input
                  type="text"
                  placeholder="Search by invoice # or shopkeeper..."
                  value={myOrderSearch}
                  onChange={(e) => setMyOrderSearch(e.target.value)}
                  className="w-full pl-9 pr-8 py-1.5 text-xs font-sans border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
                />
                {myOrderSearch && (
                  <button
                    type="button"
                    onClick={() => setMyOrderSearch('')}
                    className="absolute right-2.5 top-2 text-[#55606B] hover:text-[#1F2B3A] text-xs font-bold cursor-pointer"
                    title="Clear"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Status Pills */}
              <div className="flex items-center gap-1.5 font-mono text-[11px]">
                <button
                  onClick={() => setMyOrderFilter('all')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition ${
                    myOrderFilter === 'all'
                      ? 'bg-[#1F2B3A] text-white'
                      : 'bg-[#EEF0EC] text-[#55606B] hover:bg-[#D8DDD4]'
                  }`}
                >
                  All ({myOrders.length})
                </button>
                <button
                  onClick={() => setMyOrderFilter('paid')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition ${
                    myOrderFilter === 'paid'
                      ? 'bg-[#3F7D58] text-white'
                      : 'bg-[#3F7D58]/10 text-[#3F7D58] hover:bg-[#3F7D58]/20'
                  }`}
                >
                  Paid Cash
                </button>
                <button
                  onClick={() => setMyOrderFilter('unpaid')}
                  className={`px-2.5 py-1 rounded font-bold cursor-pointer transition ${
                    myOrderFilter === 'unpaid'
                      ? 'bg-[#C1443C] text-white'
                      : 'bg-[#C1443C]/10 text-[#C1443C] hover:bg-[#C1443C]/20'
                  }`}
                >
                  Udhar / Partial
                </button>
              </div>
            </div>

            {(() => {
              const filtered = myOrders.filter((ord) => {
                const matchSearch =
                  ord.invoice_number.toLowerCase().includes(myOrderSearch.toLowerCase()) ||
                  (ord.customer_name || '').toLowerCase().includes(myOrderSearch.toLowerCase());
                const matchStatus =
                  myOrderFilter === 'all'
                    ? true
                    : myOrderFilter === 'paid'
                    ? ord.status === 'paid'
                    : ord.status === 'unpaid' || ord.status === 'partial';
                return matchSearch && matchStatus;
              });

              if (filtered.length === 0) {
                return (
                  <div className="py-8 text-center text-xs font-mono text-[#55606B]">
                    No orders match your filter criteria.
                  </div>
                );
              }

              return (
                <div className="space-y-2">
                  {filtered.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => setViewingBillOrder(ord)}
                      className="p-3 border border-[#D8DDD4] bg-[#F7F8F5] hover:bg-amber-50/50 cursor-pointer rounded flex items-center justify-between text-xs transition"
                    >
                      <div>
                        <div className="font-mono font-bold text-sm text-[#1F2B3A]">
                          #{ord.invoice_number}
                        </div>
                        <div className="font-sans font-medium text-[#1F2B3A] text-xs mt-0.5">
                          {ord.customer_name}
                        </div>
                        <div className="text-[10px] font-mono text-[#55606B]">
                          {formatDate(ord.created_at)}
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="font-bold text-sm text-[#1F2B3A]">
                          Rs. {ord.total_amount.toLocaleString('en-PK')}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 ${
                            ord.status === 'paid'
                              ? 'bg-[#3F7D58]/15 text-[#3F7D58]'
                              : 'bg-[#C1443C]/15 text-[#C1443C]'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* ================================================= */}
        {/* 4. MY CUSTOMERS TAB */}
        {/* ================================================= */}
        {activeTab === 'my_customers' && (
          <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2">
              <span className="font-mono font-bold text-xs uppercase text-[#1F2B3A]">
                Shopkeeper Records & Balances
              </span>
              <button
                onClick={() => setShowAddCustomerModal(true)}
                className="text-xs font-mono font-bold text-[#3F7D58] hover:underline cursor-pointer"
              >
                + Add Customer
              </button>
            </div>

            {/* Customer Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
              <input
                type="text"
                placeholder="Search shopkeeper by store name, mobile #..."
                value={myCustomerSearch}
                onChange={(e) => setMyCustomerSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 text-xs font-sans border border-[#55606B] rounded outline-hidden focus:ring-1 focus:ring-[#D9A441]"
              />
              {myCustomerSearch && (
                <button
                  type="button"
                  onClick={() => setMyCustomerSearch('')}
                  className="absolute right-2.5 top-2 text-[#55606B] hover:text-[#1F2B3A] text-xs font-bold cursor-pointer"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(() => {
                const filtered = customers.filter((c) => searchMatchesCustomer(c, myCustomerSearch));

                if (customers.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs font-mono text-[#55606B]">
                      No shopkeepers found. Click "+ Add Customer" above to add one.
                    </div>
                  );
                }

                if (filtered.length === 0) {
                  return (
                    <div className="py-6 text-center text-xs font-mono text-[#55606B]">
                      <div>No shopkeepers matching "{myCustomerSearch}".</div>
                      <button
                        type="button"
                        onClick={() => setMyCustomerSearch('')}
                        className="mt-1 text-xs text-[#D9A441] underline font-bold cursor-pointer"
                      >
                        Clear Search
                      </button>
                    </div>
                  );
                }

                return filtered.map((cust) => (
                  <div
                    key={cust.id}
                    onClick={() => setViewingCustomerLedger(cust)}
                    className="p-3 border border-[#D8DDD4] bg-[#F7F8F5] hover:bg-slate-50 cursor-pointer rounded flex items-center justify-between text-xs transition"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#1F2B3A]">{cust.name}</div>
                      <div className="font-mono text-[11px] text-[#55606B]">
                        {cust.phone} • {cust.address || 'Counter Walk-in'}
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <div
                        className={`font-bold text-sm ${
                          cust.credit_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'
                        }`}
                      >
                        Rs. {(cust.credit_balance || 0).toLocaleString('en-PK')}
                      </div>
                      <span className="text-[10px] text-[#55606B]">
                        {(cust.credit_balance || 0) > 0 ? 'Owed Debt' : 'Clear'}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ================================================= */}
        {/* 5. CLOSING & CASH HANDOVER TAB */}
        {/* ================================================= */}
        {activeTab === 'closing' && (
          <div className="bg-white border-2 border-[#1F2B3A] p-4 sm:p-5 shadow-sm space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-[#3F7D58]" />
                <div>
                  <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                    Daily Closing & Cash Handover
                  </h3>
                  <p className="text-[11px] text-[#55606B]">
                    End-of-day reconciliation for {currentUser.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="p-1.5 text-[#55606B] hover:text-[#1F2B3A] border border-[#D8DDD4] rounded hover:bg-slate-50 cursor-pointer"
                title="Print Shift Closing Slip"
              >
                <Printer className="w-4 h-4" />
              </button>
            </div>

            {/* Handover Summary Slip Box */}
            <div className="bg-[#FCFDF9] border-2 border-dashed border-[#1F2B3A] p-4 rounded space-y-3">
              <div className="text-center border-b border-[#D8DDD4] pb-2">
                <div className="font-bold text-sm text-[#1F2B3A] uppercase tracking-wider">
                  Universal Trader - Shift Closing Slip
                </div>
                <div className="text-[11px] text-[#55606B]">
                  Date: {new Date().toLocaleDateString('en-PK', { dateStyle: 'full' })}
                </div>
                <div className="text-[11px] text-[#D9A441] font-bold">
                  Salesman: {currentUser.name} (@{currentUser.username})
                </div>
              </div>

              {/* Stats Breakdown */}
              <div className="space-y-1.5 divide-y divide-[#EEF0EC]">
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#55606B]">Bills Issued Today:</span>
                  <span className="font-bold text-[#1F2B3A]">{todayOrders.length} Invoices</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#55606B]">Total Gross Sales:</span>
                  <span className="font-bold text-[#1F2B3A]">Rs. {todaySalesTotal.toLocaleString('en-PK')}.00</span>
                </div>
                <div className="flex justify-between items-center py-1 bg-amber-50/60 px-2 rounded">
                  <span className="font-bold text-[#1F2B3A]">CASH IN DRAWER (TO HAND OVER):</span>
                  <span className="font-extrabold text-base text-[#3F7D58]">
                    Rs. {todayCashCollected.toLocaleString('en-PK')}.00
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#55606B]">Credit (Udhar) Billed:</span>
                  <span className="font-bold text-[#C1443C]">Rs. {todayCreditGiven.toLocaleString('en-PK')}.00</span>
                </div>
              </div>

              {/* Bills List Mini */}
              {todayOrders.length > 0 && (
                <div className="pt-2 border-t border-[#D8DDD4] space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#55606B] block">Today's Invoices List:</span>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
                    {todayOrders.map((ord) => (
                      <div key={ord.id} className="flex justify-between text-[#55606B]">
                        <span>#{ord.invoice_number} ({ord.customer_name})</span>
                        <span className="font-bold text-[#1F2B3A]">Rs. {ord.total_amount} ({ord.status})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Handover Actions */}
            <div className="space-y-2 pt-1">
              <button
                onClick={sendHandoverToOwner}
                className="w-full py-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded flex items-center justify-center gap-2 shadow-xs cursor-pointer transition"
              >
                <Share2 className="w-4 h-4" />
                <span>Send Handover Summary to Owner via WhatsApp</span>
              </button>

              <button
                onClick={() => window.print()}
                className="w-full py-2.5 border border-[#1F2B3A] text-[#1F2B3A] hover:bg-[#EEF0EC] font-bold rounded flex items-center justify-center gap-2 cursor-pointer transition"
              >
                <Printer className="w-4 h-4 text-[#55606B]" />
                <span>Print Physical Closing Receipt</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Salesman Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-[#1F2B3A] border-t-2 border-[#1F2B3A] text-white grid grid-cols-5 z-40">
        <button
          onClick={() => setActiveTab('home')}
          className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-mono transition cursor-pointer ${
            activeTab === 'home' ? 'bg-slate-800 text-[#D9A441] font-bold' : 'text-slate-300'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Standby</span>
        </button>

        <button
          onClick={startNewOrder}
          className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-mono transition cursor-pointer ${
            activeTab === 'new_order' ? 'bg-slate-800 text-[#D9A441] font-bold' : 'text-slate-300'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>New Bill</span>
        </button>

        <button
          onClick={() => setActiveTab('my_orders')}
          className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-mono transition cursor-pointer ${
            activeTab === 'my_orders' ? 'bg-slate-800 text-[#D9A441] font-bold' : 'text-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>My Bills</span>
        </button>

        <button
          onClick={() => setActiveTab('my_customers')}
          className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-mono transition cursor-pointer ${
            activeTab === 'my_customers' ? 'bg-slate-800 text-[#D9A441] font-bold' : 'text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Khata</span>
        </button>

        <button
          onClick={() => setActiveTab('closing')}
          className={`py-2.5 flex flex-col items-center gap-1 text-[10px] font-mono transition cursor-pointer ${
            activeTab === 'closing' ? 'bg-slate-800 text-[#D9A441] font-bold' : 'text-slate-300'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Closing</span>
        </button>
      </div>

      {/* Terminal Info & Personal Link Modal */}
      {showTerminalInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-white border-2 border-[#1F2B3A] p-5 rounded w-full max-w-md space-y-4 font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#D9A441]" />
                <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                  My Terminal Link & ID
                </h3>
              </div>
              <button
                onClick={() => setShowTerminalInfoModal(false)}
                className="text-[#55606B] hover:text-[#1F2B3A] font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-[#F7F8F5] p-3 rounded border border-[#D8DDD4] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#55606B]">Staff Name:</span>
                <span className="font-bold text-[#1F2B3A]">{currentUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#55606B]">Salesman ID:</span>
                <span className="font-bold text-[#D9A441]">@{currentUser.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#55606B]">Mobile:</span>
                <span className="text-[#1F2B3A]">{currentUser.phone || 'Not recorded'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#1F2B3A]">
                My Personal Instant Login Link:
              </label>
              <div className="p-2.5 bg-[#EEF0EC] border border-[#D8DDD4] rounded text-[11px] break-all select-all">
                {myDirectLink}
              </div>
              <button
                onClick={handleCopyMyLink}
                className="w-full py-2 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-bold rounded flex items-center justify-center gap-1.5 cursor-pointer transition"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-800" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy My Personal Link'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-[#D8DDD4] flex justify-between items-center">
              <button
                onClick={onLogout}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded font-bold cursor-pointer"
              >
                Switch Account / Sign Out
              </button>
              <button
                onClick={() => setShowTerminalInfoModal(false)}
                className="px-4 py-1.5 bg-[#1F2B3A] text-white rounded font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showAddCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowAddCustomerModal(false)}
          onSuccess={(newCust) => {
            setCustomers((prev) => [newCust, ...prev]);
            setSelectedCustomer(newCust);
            if (activeTab === 'new_order') {
              setOrderStep('items');
            }
          }}
        />
      )}

      {viewingBillOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="bg-[#EEF0EC] p-3 rounded w-full max-w-lg">
            <BillReceipt
              order={viewingBillOrder}
              onClose={() => setViewingBillOrder(null)}
            />
          </div>
        </div>
      )}

      {viewingCustomerLedger && (
        <CustomerLedgerModal
          customer={viewingCustomerLedger}
          onClose={() => setViewingCustomerLedger(null)}
          onPaymentRecorded={loadData}
        />
      )}
    </div>
  );
};
