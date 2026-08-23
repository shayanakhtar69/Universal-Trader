import React, { useState, useEffect } from 'react';
import {
  User,
  Product,
  Customer,
  Order,
  Purchase,
  Supplier,
  StockMovement,
  SalesReportSummary,
  TopProductReport,
  OutstandingCreditCustomer,
} from '../types';
import { api } from '../api';
import { THEME, formatCurrency, formatDate } from '../theme';
import { BillReceipt } from './BillReceipt';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { StockAdjustmentModal } from './StockAdjustmentModal';
import { NewProductModal } from './NewProductModal';
import { EditProductModal } from './EditProductModal';
import { NewPurchaseModal } from './NewPurchaseModal';
import { NewSalesmanModal } from './NewSalesmanModal';
import { EditSalesmanModal } from './EditSalesmanModal';
import { ResetPasswordModal } from './ResetPasswordModal';
import { SalesmanLoginSlipModal } from './SalesmanLoginSlipModal';
import { ShopkeeperSaleModal } from './ShopkeeperSaleModal';
import { NewCustomerModal } from './NewCustomerModal';
import { RoleIsolationTester } from './RoleIsolationTester';
import { SettingsTab } from './SettingsTab';
import { ConfirmModal } from './ConfirmModal';
import {
  searchMatchesCustomer,
  searchMatchesProduct,
  searchMatchesOrder,
} from '../searchUtils';
import {
  LayoutDashboard,
  Boxes,
  Users,
  Receipt,
  BookOpen,
  Truck,
  TrendingUp,
  Sliders,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Trash2,
  Eye,
  DollarSign,
  Package,
  KeyRound,
  Edit2,
  UserPlus,
  Database,
  Lock,
  Settings,
  Link2,
  Share2,
  Copy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface OwnerDashboardProps {
  currentUser: User;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'inventory'
    | 'salesmen'
    | 'orders'
    | 'customers'
    | 'purchases'
    | 'audit'
    | 'reports'
    | 'security'
    | 'settings'
  >('overview');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [salesmen, setSalesmen] = useState<User[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // Reports Data
  const [salesReport, setSalesReport] = useState<SalesReportSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductReport[]>([]);
  const [outstandingCredit, setOutstandingCredit] = useState<OutstandingCreditCustomer[]>([]);

  // Modals State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showNewProductModal, setShowNewProductModal] = useState(false);
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [showNewSalesmanModal, setShowNewSalesmanModal] = useState(false);
  const [editingSalesman, setEditingSalesman] = useState<User | null>(null);
  const [resettingPasswordSalesman, setResettingPasswordSalesman] = useState<User | null>(null);
  const [viewingLoginSlipSalesman, setViewingLoginSlipSalesman] = useState<User | null>(null);
  const [viewingLedgerCustomer, setViewingLedgerCustomer] = useState<Customer | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showShopkeeperSaleModal, setShowShopkeeperSaleModal] = useState(false);
  const [saleInitialCustomer, setSaleInitialCustomer] = useState<Customer | null>(null);
  const [viewingBillOrder, setViewingBillOrder] = useState<Order | null>(null);

  // In-app Confirmation Dialogs State (eliminates iframe-blocked prompt/confirm)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [deletingSalesman, setDeletingSalesman] = useState<User | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [showResetAllConfirm, setShowResetAllConfirm] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => {
      setActionNotice((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Filters & Search
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryCategory, setInventoryCategory] = useState('all');
  const [orderSalesmanFilter, setOrderSalesmanFilter] = useState('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [
        pRes,
        cRes,
        oRes,
        uRes,
        purRes,
        supRes,
        smRes,
        srRes,
        tpRes,
        ocRes,
      ] = await Promise.all([
        api.getProducts(),
        api.getCustomers(),
        api.getAllOrders(),
        api.getUsers(),
        api.getPurchases(),
        api.getSuppliers(),
        api.getStockMovements(),
        api.getSalesReport(),
        api.getTopProducts(),
        api.getOutstandingCredit(),
      ]);

      setProducts(pRes.products);
      setCustomers(cRes.customers);
      setOrders(oRes.orders);
      setSalesmen(uRes.users.filter((u) => u.role === 'salesman'));
      setPurchases(purRes.purchases);
      setSuppliers(supRes.suppliers);
      setStockMovements(smRes.movements);
      setSalesReport(srRes);
      setTopProducts(tpRes.topProducts);
      setOutstandingCredit(ocRes.debtors);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Key metrics calculation
  const todayStr = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr));
  const todaySalesTotal = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const lowStockCount = products.filter((p) => p.current_stock <= p.low_stock_threshold).length;
  const totalCreditDebt = customers.reduce((sum, c) => sum + c.credit_balance, 0);

  const executeDeleteProduct = async () => {
    if (!deletingProduct) return;
    try {
      await api.deleteProduct(deletingProduct.id);
      const name = deletingProduct.name;
      setDeletingProduct(null);
      await loadAllData();
      showNotification('success', `Product "${name}" was deleted/archived successfully.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete product');
    }
  };

  const handleToggleSalesmanStatus = async (user: User) => {
    try {
      await api.updateUserStatus(user.id, !user.active);
      await loadAllData();
      showNotification('success', `Salesman ${user.name} is now ${!user.active ? 'Active' : 'Inactive'}.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to update user status');
    }
  };

  const executeDeleteSalesman = async () => {
    if (!deletingSalesman) return;
    try {
      await api.deleteUser(deletingSalesman.id);
      const name = deletingSalesman.name;
      setDeletingSalesman(null);
      await loadAllData();
      showNotification('success', `Salesman account "${name}" permanently deleted.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete salesman account');
    }
  };

  const executeDeleteCustomer = async () => {
    if (!deletingCustomer) return;
    try {
      await api.deleteCustomer(deletingCustomer.id);
      const name = deletingCustomer.name;
      setDeletingCustomer(null);
      await loadAllData();
      showNotification('success', `Shopkeeper "${name}" removed from register.`);
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to delete shopkeeper');
    }
  };

  const executeResetAllData = async () => {
    try {
      await api.resetAllData();
      setShowResetAllConfirm(false);
      await loadAllData();
      showNotification('success', 'All business registers and bills have been cleared successfully.');
    } catch (err: any) {
      showNotification('error', err.message || 'Failed to reset data');
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#EEF0EC] text-[#1F2B3A] flex flex-col md:flex-row font-sans">
      {/* Clean Minimalism Deep Navy Sidebar */}
      <aside className="w-full md:w-64 bg-[#1F2B3A] text-[#EEF0EC] flex flex-col shrink-0 border-r border-black/10">
        {/* Shop Branding Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h1 className="slab text-xl uppercase tracking-wider text-[#D9A441] leading-tight">
              Bazaar Ledger
            </h1>
          </div>
          <p className="text-[10px] uppercase tracking-[0.2em] opacity-60 mt-1 font-mono">
            {THEME.shopInfo.name}
          </p>
        </div>

        {/* Navigation Items with Clean Left-Border Indicators */}
        <nav className="flex-1 py-3 font-mono text-xs space-y-0.5">
          <div className="px-5 py-2 text-[10px] uppercase tracking-wider opacity-40 font-bold">
            MASTER REGISTERS
          </div>

          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'overview' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#D9A441]" />
            <span className="font-medium">Overview & Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-between px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'inventory' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Boxes className="w-4 h-4 text-[#D9A441]" />
              <span className="font-medium">Inventory & Stock</span>
            </div>
            {lowStockCount > 0 && (
              <span className="bg-[#C1443C] text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                {lowStockCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'orders' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <Receipt className="w-4 h-4 text-[#D9A441]" />
              <span className="font-medium">Sales Bills</span>
            </div>
            <span className="text-[10px] opacity-60">({orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('customers')}
            className={`w-full flex items-center justify-between px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'customers' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-[#D9A441]" />
              <span className="font-medium">Shopkeepers & Khata</span>
            </div>
            <span className="text-[10px] opacity-60">({customers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('salesmen')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'salesmen' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Users className="w-4 h-4 text-[#D9A441]" />
            <span className="font-medium">Staff Management</span>
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'purchases' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Truck className="w-4 h-4 text-[#D9A441]" />
            <span className="font-medium">Supplier Restocks</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'audit' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#D9A441]" />
            <span className="font-medium">Stock Audit Log</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'reports' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-[#D9A441]" />
            <span className="font-medium">Reports & Audit</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left sidebar-item cursor-pointer ${
              activeTab === 'settings' ? 'active' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <Settings className="w-4 h-4 text-[#D9A441]" />
            <span className="font-medium">Settings & Backup</span>
          </button>

          <div className="pt-2 px-4">
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-2 px-3 py-2 border rounded text-left transition font-mono ${
                activeTab === 'security'
                  ? 'bg-[#3F7D58] text-white border-[#3F7D58] font-bold'
                  : 'bg-white/5 border-white/20 text-[#D9A441] hover:bg-white/10'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px]">Verify Role Isolation</span>
            </button>
          </div>
        </nav>

        {/* Bottom Active Session Profile & Data Reset */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#D9A441] flex items-center justify-center text-[#1F2B3A] font-bold font-mono text-sm">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{currentUser.name}</p>
              <p className="text-[10px] opacity-50 uppercase font-mono">Owner • Active Session</p>
            </div>
          </div>

          <button
            onClick={() => setShowResetAllConfirm(true)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white/5 hover:bg-red-950/50 border border-white/10 hover:border-red-500/50 text-white/60 hover:text-red-300 rounded text-[10px] font-mono transition cursor-pointer"
            title="Clear all demo/test transactions"
          >
            <Database className="w-3 h-3" />
            <span>Wipe / Reset All Data</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#EEF0EC]">
        {/* Clean Minimalist Top Stat Cards Header */}
        <header className="p-4 sm:p-6 border-b border-black/5 bg-[#EEF0EC]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Stat Card 1: Today's Revenue (Mustard Top Accent) */}
            <div className="bg-white border border-black/5 rounded flex flex-col justify-center p-5 stat-card-mustard shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#55606B] tracking-wider font-mono">
                Today's Total Revenue
              </span>
              <span className="mono text-2xl sm:text-3xl font-bold text-[#1F2B3A] mt-1">
                Rs. {todaySalesTotal.toLocaleString('en-PK')}.00
              </span>
            </div>

            {/* Stat Card 2: Low Stock Alerts (Red Top Accent) */}
            <div className="bg-white border border-black/5 rounded flex flex-col justify-center p-5 stat-card-red shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#C1443C] tracking-wider font-mono">
                Low Stock Alerts
              </span>
              <span className="mono text-2xl sm:text-3xl font-bold text-[#C1443C] mt-1">
                {lowStockCount}
              </span>
            </div>

            {/* Stat Card 3: Outstanding Credit (Green Top Accent) */}
            <div className="bg-white border border-black/5 rounded flex flex-col justify-center p-5 stat-card-green shadow-xs">
              <span className="text-[10px] uppercase font-bold text-[#55606B] tracking-wider font-mono">
                Outstanding Credit
              </span>
              <span className="mono text-2xl sm:text-3xl font-bold text-[#3F7D58] mt-1">
                Rs. {totalCreditDebt.toLocaleString('en-PK')}.00
              </span>
            </div>
          </div>
        </header>

        {/* Main Body View */}
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {/* ================================================= */}
          {/* TAB 1: OVERVIEW */}
          {/* ================================================= */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Quick Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <button
                  onClick={() => setShowNewProductModal(true)}
                  className="p-3 bg-white border-2 border-[#1F2B3A] hover:bg-[#EEF0EC] text-[#1F2B3A] font-bold flex items-center gap-2 rounded shadow-xs transition"
                >
                  <Plus className="w-4 h-4 text-[#D9A441]" />
                  <span>+ New Product</span>
                </button>

                <button
                  onClick={() => setShowNewPurchaseModal(true)}
                  className="p-3 bg-white border-2 border-[#1F2B3A] hover:bg-[#EEF0EC] text-[#1F2B3A] font-bold flex items-center gap-2 rounded shadow-xs transition"
                >
                  <Truck className="w-4 h-4 text-[#3F7D58]" />
                  <span>+ Restock PO</span>
                </button>

                <button
                  onClick={() => setShowNewSalesmanModal(true)}
                  className="p-3 bg-white border-2 border-[#1F2B3A] hover:bg-[#EEF0EC] text-[#1F2B3A] font-bold flex items-center gap-2 rounded shadow-xs transition"
                >
                  <Users className="w-4 h-4 text-[#1F2B3A]" />
                  <span>+ Add Salesman</span>
                </button>

                <button
                  onClick={loadAllData}
                  className="p-3 bg-[#1F2B3A] hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-2 rounded shadow-xs transition"
                >
                  <RefreshCw className={`w-4 h-4 text-[#D9A441] ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh DB</span>
                </button>
              </div>

              {/* Low Stock Urgent Warning Banner */}
              {lowStockCount > 0 && (
                <div className="bg-[#C1443C]/10 border-2 border-[#C1443C] p-4 text-xs font-mono">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#C1443C] text-sm flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      CRITICAL: {lowStockCount} PRODUCTS AT OR BELOW LOW-STOCK THRESHOLD
                    </span>
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className="underline font-bold text-[#1F2B3A] hover:text-[#C1443C]"
                    >
                      View Low-Stock Table &rarr;
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {products
                      .filter((p) => p.current_stock <= p.low_stock_threshold)
                      .slice(0, 3)
                      .map((p) => (
                        <div key={p.id} className="bg-white p-2 border border-[#C1443C] rounded">
                          <div className="font-bold text-[#1F2B3A] truncate">{p.name}</div>
                          <div className="text-[11px] text-[#C1443C] mt-0.5">
                            Stock: <span className="font-bold">{p.current_stock}</span> {p.unit.replace('_', ' ')} (Min: {p.low_stock_threshold})
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Two Column Summary Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Salesmen Performance */}
                <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2 mb-3">
                    <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                      Salesmen Counter Performance
                    </h3>
                    <button
                      onClick={() => setActiveTab('salesmen')}
                      className="text-xs font-mono text-[#55606B] underline"
                    >
                      Manage Staff
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {salesmen.map((sm) => (
                      <div
                        key={sm.id}
                        className="p-3 border border-[#D8DDD4] bg-[#F7F8F5] rounded flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-sm text-[#1F2B3A]">{sm.name}</div>
                          <div className="text-[11px] text-[#55606B]">
                            User: {sm.username} • {sm.active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-[#1F2B3A]">
                            Rs. {(sm.today_sales || 0).toLocaleString('en-PK')}
                          </div>
                          <div className="text-[10px] text-[#55606B]">
                            Total All-Time: Rs. {(sm.total_sales || 0).toLocaleString('en-PK')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Debtors to Collect */}
                <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-[#D8DDD4] pb-2 mb-3">
                    <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                      Top Outstanding Credit Balances
                    </h3>
                    <button
                      onClick={() => setActiveTab('customers')}
                      className="text-xs font-mono text-[#55606B] underline"
                    >
                      All Customers
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {customers
                      .filter((c) => c.credit_balance > 0)
                      .slice(0, 4)
                      .map((c) => (
                        <div
                          key={c.id}
                          onClick={() => setViewingLedgerCustomer(c)}
                          className="p-3 border border-[#D8DDD4] bg-[#F7F8F5] hover:bg-amber-50/50 cursor-pointer rounded flex items-center justify-between transition"
                        >
                          <div>
                            <div className="font-bold text-sm text-[#1F2B3A]">{c.name}</div>
                            <div className="text-[11px] text-[#55606B]">{c.phone}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm text-[#C1443C]">
                              Rs. {c.credit_balance.toLocaleString('en-PK')}
                            </div>
                            <span className="text-[10px] text-[#55606B]">Click for Khata</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 2: INVENTORY TABLE */}
          {/* ================================================= */}
          {activeTab === 'inventory' && (
            <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8DDD4] pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F2B3A]">
                    Wholesale Inventory & Stock Register
                  </h2>
                  <p className="text-xs font-mono text-[#55606B]">
                    {products.length} Products registered in Godown
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-add-product"
                    onClick={() => setShowNewProductModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Product</span>
                  </button>
                  <button
                    onClick={() => setShowNewPurchaseModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#1F2B3A] text-white hover:bg-slate-800 font-mono font-bold text-xs rounded transition shadow-sm"
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Restock Inward</span>
                  </button>
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative sm:col-span-2">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                  <input
                    type="text"
                    placeholder="Search by product name, code, SKU..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-sans border border-[#55606B] rounded outline-hidden"
                  />
                </div>

                <div>
                  <select
                    value={inventoryCategory}
                    onChange={(e) => setInventoryCategory(e.target.value)}
                    className="w-full border border-[#55606B] px-3 py-1.5 text-xs font-sans rounded outline-hidden"
                  >
                    <option value="all">All Categories</option>
                    <option value="Grains & Pulses">Grains & Pulses</option>
                    <option value="Edible Oils">Edible Oils</option>
                    <option value="Spices">Spices & Condiments</option>
                    <option value="Commodities">Commodities</option>
                  </select>
                </div>
              </div>

              {/* Products Table with Clean Minimalism Header & Badges */}
              <div className="bg-white border border-black/5 rounded shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs font-sans">
                  <thead className="bg-[#1F2B3A] text-white text-[10px] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="py-3 px-4">Code / SKU</th>
                      <th className="py-3 px-4">Product Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Unit</th>
                      <th className="py-3 px-4 text-right">Wholesale Price</th>
                      <th className="py-3 px-4 text-right">Current Stock</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {products
                      .filter((p) => {
                        const matchesSearch =
                          p.name.toLowerCase().includes(inventorySearch.toLowerCase()) ||
                          p.code.toLowerCase().includes(inventorySearch.toLowerCase());
                        const matchesCat =
                          inventoryCategory === 'all' || p.category === inventoryCategory;
                        return matchesSearch && matchesCat;
                      })
                      .map((prod) => {
                        const isLow = prod.current_stock <= prod.low_stock_threshold;
                        return (
                          <tr
                            key={prod.id}
                            className={`border-b border-black/5 hover:bg-[#EEF0EC]/50 transition ${
                              isLow ? 'bg-[#C1443C]/5' : ''
                            }`}
                          >
                            <td className="py-3 px-4 font-mono font-bold text-[#1F2B3A] whitespace-nowrap">
                              {prod.code}
                            </td>
                            <td className="py-3 px-4 font-medium text-[#1F2B3A]">
                              <div>{prod.name}</div>
                              {isLow && (
                                <span className="text-[10px] font-mono text-[#C1443C] font-bold">
                                  Low Stock Threshold: {prod.low_stock_threshold}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-xs opacity-70 text-[#55606B]">{prod.category}</td>
                            <td className="py-3 px-4 text-xs opacity-70 capitalize text-[#1F2B3A]">
                              {prod.unit.replace('_', ' ')}
                            </td>
                            <td className="py-3 px-4 mono text-right font-bold text-[#1F2B3A]">
                              Rs. {prod.wholesale_price.toFixed(2)}
                            </td>
                            <td
                              className={`py-3 px-4 mono text-right font-bold ${
                                isLow ? 'text-[#C1443C]' : 'text-[#1F2B3A]'
                              }`}
                            >
                              {prod.current_stock < 10 ? `0${prod.current_stock}` : prod.current_stock}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase font-mono ${
                                  isLow
                                    ? 'bg-[#C1443C]/10 text-[#C1443C]'
                                    : 'bg-[#3F7D58]/10 text-[#3F7D58]'
                                }`}
                              >
                                {isLow ? 'Low Stock' : 'In Stock'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => setEditingProduct(prod)}
                                  title="Edit Product Details & Rates"
                                  className="px-2 py-1 bg-[#1F2B3A] hover:bg-slate-800 text-white rounded text-[10px] font-bold font-mono uppercase transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3 text-[#D9A441]" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  onClick={() => setAdjustingProduct(prod)}
                                  title="Adjust Stock Count (Audit Logged)"
                                  className="px-2 py-1 bg-[#EEF0EC] hover:bg-[#D9A441] hover:text-[#1F2B3A] text-[#1F2B3A] rounded text-[10px] font-bold font-mono uppercase transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Sliders className="w-3 h-3 text-[#D9A441]" />
                                  <span>Adjust</span>
                                </button>

                                <button
                                  onClick={() => setDeletingProduct(prod)}
                                  title="Archive/Delete Product"
                                  className="p-1 text-[#C1443C] hover:bg-red-50 rounded transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 3: ALL BILLS / ORDERS TABLE */}
          {/* ================================================= */}
          {activeTab === 'orders' && (
            <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8DDD4] pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F2B3A]">
                    Master Takeaway Orders & Bills Register
                  </h2>
                  <p className="text-xs font-mono text-[#55606B]">
                    Complete sales log across all counter salesmen
                  </p>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="sm:col-span-2 relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                  <input
                    type="text"
                    placeholder="Search by invoice no, customer name, phone..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-[#55606B] rounded outline-hidden"
                  />
                </div>

                <div>
                  <select
                    value={orderSalesmanFilter}
                    onChange={(e) => setOrderSalesmanFilter(e.target.value)}
                    className="w-full border border-[#55606B] px-3 py-1.5 rounded outline-hidden"
                  >
                    <option value="all">All Salesmen</option>
                    {salesmen.map((sm) => (
                      <option key={sm.id} value={sm.id}>
                        {sm.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={orderPaymentFilter}
                    onChange={(e) => setOrderPaymentFilter(e.target.value)}
                    className="w-full border border-[#55606B] px-3 py-1.5 rounded outline-hidden"
                  >
                    <option value="all">All Payment Terms</option>
                    <option value="cash">Full Cash</option>
                    <option value="credit">Full Credit</option>
                    <option value="partial">Partial Payment</option>
                  </select>
                </div>
              </div>

              {/* Orders Table */}
              <div className="border border-[#1F2B3A] overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#EEF0EC] border-b-2 border-[#1F2B3A] text-[#1F2B3A]">
                      <th className="py-2.5 px-3 text-left">Invoice No</th>
                      <th className="py-2.5 px-3 text-left">Date & Time</th>
                      <th className="py-2.5 px-3 text-left">Customer</th>
                      <th className="py-2.5 px-3 text-left">Counter Salesman</th>
                      <th className="py-2.5 px-3 text-right">Total (Rs.)</th>
                      <th className="py-2.5 px-3 text-right">Paid (Rs.)</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4] bg-white">
                    {orders
                      .filter((o) => {
                        const matchesSalesman =
                          orderSalesmanFilter === 'all' || o.salesman_id === orderSalesmanFilter;
                        const matchesPay =
                          orderPaymentFilter === 'all' || o.payment_type === orderPaymentFilter;
                        const matchesSearch = searchMatchesOrder(o, orderSearch);
                        return matchesSalesman && matchesPay && matchesSearch;
                      })
                      .map((ord) => (
                        <tr key={ord.id} className="hover:bg-amber-50/50">
                          <td className="py-2.5 px-3 font-bold text-[#1F2B3A] whitespace-nowrap">
                            {ord.invoice_number}
                          </td>
                          <td className="py-2.5 px-3 text-[#55606B] whitespace-nowrap">
                            {formatDate(ord.created_at)}
                          </td>
                          <td className="py-2.5 px-3 font-sans font-medium text-[#1F2B3A]">
                            <div>{ord.customer_name}</div>
                            <span className="text-[10px] font-mono text-[#55606B]">{ord.customer_phone}</span>
                          </td>
                          <td className="py-2.5 px-3 text-[#55606B]">{ord.salesman_name}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#1F2B3A]">
                            {ord.total_amount.toLocaleString('en-PK')}
                          </td>
                          <td className="py-2.5 px-3 text-right text-[#3F7D58] font-bold">
                            {ord.amount_paid.toLocaleString('en-PK')}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              ord.remaining_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'
                            }`}
                          >
                            {ord.remaining_balance.toLocaleString('en-PK')}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                ord.status === 'paid'
                                  ? 'bg-[#3F7D58]/15 text-[#3F7D58]'
                                  : 'bg-[#C1443C]/15 text-[#C1443C]'
                              }`}
                            >
                              {ord.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setViewingBillOrder(ord)}
                              className="px-2.5 py-1 bg-[#1F2B3A] hover:bg-slate-800 text-white rounded text-[10px] font-bold flex items-center gap-1 mx-auto transition"
                            >
                              <Eye className="w-3 h-3 text-[#D9A441]" />
                              <span>View Bill</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 4: SHOPKEEPERS & RUNNING CREDIT KHATA */}
          {/* ================================================= */}
          {activeTab === 'customers' && (
            <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8DDD4] pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F2B3A] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#D9A441]" />
                    <span>Shopkeepers & Retail Stores (Khata / Ledger)</span>
                  </h2>
                  <p className="text-xs font-mono text-[#55606B]">
                    Manage retail store accounts, issue goods on sale, and track market credit
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setShowNewCustomerModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Add Shopkeeper</span>
                  </button>

                  <button
                    onClick={() => {
                      setSaleInitialCustomer(null);
                      setShowShopkeeperSaleModal(true);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#1F2B3A] text-white hover:bg-slate-800 font-mono font-bold text-xs rounded transition shadow-xs cursor-pointer"
                  >
                    <Receipt className="w-3.5 h-3.5 text-[#D9A441]" />
                    <span>🛒 Give Goods on Sale</span>
                  </button>
                </div>
              </div>

              {/* Summary Debt Indicator */}
              <div className="bg-[#F7F8F5] p-3 border border-[#D8DDD4] rounded flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="text-[#55606B] block text-[11px] uppercase">Registered Shopkeepers:</span>
                  <strong className="text-sm text-[#1F2B3A]">{customers.length} Retail Stores</strong>
                </div>
                <div className="text-right">
                  <span className="text-[#55606B] block text-[11px] uppercase">Total Market Credit (Udhaar):</span>
                  <strong className="text-base text-[#C1443C]">Rs. {totalCreditDebt.toLocaleString('en-PK')}</strong>
                </div>
              </div>

              {/* Customer Search */}
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                  <input
                    type="text"
                    placeholder="Search shopkeeper by store name, mobile/whatsapp #, market address..."
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

                {customerSearch.trim() && (
                  <div className="text-[11px] font-mono text-[#55606B] flex items-center gap-1.5">
                    <span>
                      Matching{' '}
                      <strong className="text-[#1F2B3A]">
                        {customers.filter((c) => searchMatchesCustomer(c, customerSearch)).length}
                      </strong>{' '}
                      of {customers.length} shops
                    </span>
                    <button
                      onClick={() => setCustomerSearch('')}
                      className="text-xs text-[#D9A441] underline font-bold cursor-pointer"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Customer Table */}
              <div className="border border-[#1F2B3A] overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#EEF0EC] border-b-2 border-[#1F2B3A] text-[#1F2B3A]">
                      <th className="py-2.5 px-3 text-left">Shopkeeper / Store Name</th>
                      <th className="py-2.5 px-3 text-left">Phone / WhatsApp</th>
                      <th className="py-2.5 px-3 text-left">Market Address</th>
                      <th className="py-2.5 px-3 text-right">Total Bills</th>
                      <th className="py-2.5 px-3 text-right">Khata Balance (Udhaar)</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4] bg-white">
                    {(() => {
                      const filtered = customers.filter((c) => searchMatchesCustomer(c, customerSearch));

                      if (customers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#55606B]">
                              No shopkeepers registered yet. Click "+ Add Shopkeeper" above to record your retail grocery stores.
                            </td>
                          </tr>
                        );
                      }

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-[#55606B]">
                              <div className="font-sans text-sm text-[#1F2B3A] font-bold mb-1">
                                No shopkeepers found matching "{customerSearch}"
                              </div>
                              <p className="text-xs text-[#55606B] mb-2 font-mono">
                                Try searching by single keywords like "saleem", "drink", "super", or mobile number digits.
                              </p>
                              <button
                                onClick={() => setCustomerSearch('')}
                                className="px-3 py-1 bg-[#D9A441] text-[#1F2B3A] rounded text-xs font-mono font-bold hover:bg-[#D9A441]/90 transition cursor-pointer"
                              >
                                Clear Search Filter
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((cust) => {
                        const hasDebt = (cust.credit_balance || 0) > 0;
                        return (
                          <tr
                            key={cust.id}
                            className={`hover:bg-amber-50/50 ${hasDebt ? 'bg-[#C1443C]/5' : ''}`}
                          >
                            <td className="py-2.5 px-3 font-sans font-bold text-[#1F2B3A]">
                              {cust.name}
                            </td>
                            <td className="py-2.5 px-3 text-[#55606B] font-mono">{cust.phone}</td>
                            <td className="py-2.5 px-3 text-[#55606B]">{cust.address || 'Market Store'}</td>
                            <td className="py-2.5 px-3 text-right text-[#1F2B3A]">
                              {cust.total_orders_count || 0}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-bold text-sm ${
                                hasDebt ? 'text-[#C1443C]' : 'text-[#3F7D58]'
                              }`}
                            >
                              Rs. {(cust.credit_balance || 0).toLocaleString('en-PK')}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    setSaleInitialCustomer(cust);
                                    setShowShopkeeperSaleModal(true);
                                  }}
                                  className="px-2.5 py-1 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                  title="Issue Grocery on Sale"
                                >
                                  <Receipt className="w-3 h-3" />
                                  <span>Sell Goods</span>
                                </button>

                                <button
                                  onClick={() => setViewingLedgerCustomer(cust)}
                                  className="px-2.5 py-1 bg-[#1F2B3A] hover:bg-slate-800 text-white rounded text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                                  title="Open Khata Ledger"
                                >
                                  <BookOpen className="w-3 h-3 text-[#D9A441]" />
                                  <span>Khata Ledger</span>
                                </button>

                                <button
                                  onClick={() => setDeletingCustomer(cust)}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                                  title="Delete Shopkeeper"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 5: SALESMEN STAFF MANAGEMENT */}
          {/* ================================================= */}
          {activeTab === 'salesmen' && (
            <div className="bg-white border-2 border-[#1F2B3A] p-4 sm:p-5 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8DDD4] pb-4">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F2B3A] flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#D9A441]" />
                    <span>Salesmen & Counter Staff Management</span>
                  </h2>
                  <p className="text-xs font-mono text-[#55606B] mt-0.5">
                    Create and manage staff accounts, assign login PINs, and track counter sales
                  </p>
                </div>

                <button
                  id="btn-add-salesman"
                  onClick={() => setShowNewSalesmanModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Counter Salesman</span>
                </button>
              </div>

              {/* If no salesmen accounts yet */}
              {salesmen.length === 0 ? (
                <div className="bg-[#F7F8F5] border-2 border-dashed border-[#1F2B3A]/30 p-8 rounded text-center space-y-4 font-mono text-xs">
                  <div className="w-12 h-12 rounded-full bg-[#1F2B3A]/10 text-[#1F2B3A] flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <div className="font-bold text-sm text-[#1F2B3A]">
                      No Salesman Accounts Created Yet
                    </div>
                    <p className="text-[#55606B] text-[11px] leading-relaxed">
                      As the Owner of Universal Trader, you have full control over your staff accounts.
                      Add your counter salesmen here and assign their usernames and passwords.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowNewSalesmanModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#D9A441] text-[#1F2B3A] font-bold rounded shadow-sm hover:bg-[#D9A441]/90 transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create First Salesman Account</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {salesmen.map((sm) => (
                    <div
                      key={sm.id}
                      className="border-2 border-[#1F2B3A] bg-[#FCFDF9] p-4 rounded shadow-xs font-mono text-xs space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        {/* Header & Status */}
                        <div className="flex items-start justify-between gap-2 border-b border-[#D8DDD4] pb-2.5">
                          <div>
                            <div className="font-sans font-bold text-base text-[#1F2B3A]">
                              {sm.name}
                            </div>
                            <div className="text-[#55606B] text-[11px] mt-0.5 flex flex-wrap items-center gap-2">
                              <span>
                                Login ID: <span className="font-bold text-[#1F2B3A] bg-amber-100/60 px-1.5 py-0.5 rounded border border-amber-200">{sm.username}</span>
                              </span>
                              <span>•</span>
                              <span className="text-[#55606B]">Phone: {sm.phone || 'Not set'}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleToggleSalesmanStatus(sm)}
                            title={sm.active ? 'Click to Suspend Account' : 'Click to Activate Account'}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition cursor-pointer ${
                              sm.active
                                ? 'bg-[#3F7D58]/15 text-[#3F7D58] border border-[#3F7D58] hover:bg-[#3F7D58]/25'
                                : 'bg-red-100 text-red-700 border border-red-300 hover:bg-red-200'
                            }`}
                          >
                            {sm.active ? '✓ Active' : '✕ Suspended'}
                          </button>
                        </div>

                        {/* Performance Metrics */}
                        <div className="grid grid-cols-2 gap-2 bg-[#F7F8F5] p-2.5 border border-[#D8DDD4] rounded">
                          <div>
                            <span className="text-[10px] text-[#55606B] block uppercase tracking-wider">Today's Sales</span>
                            <span className="font-bold text-sm text-[#1F2B3A]">
                              Rs. {(sm.today_sales || 0).toLocaleString('en-PK')}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#55606B] block uppercase tracking-wider">All-Time Sales</span>
                            <span className="font-bold text-sm text-[#3F7D58]">
                              Rs. {(sm.total_sales || 0).toLocaleString('en-PK')}
                            </span>
                            <span className="text-[10px] text-[#55606B] block mt-0.5">
                              ({sm.orders_count || 0} Bills Created)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Management Actions */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#D8DDD4]">
                        <button
                          onClick={() => setViewingLoginSlipSalesman(sm)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] rounded text-[11px] font-bold transition cursor-pointer shadow-xs"
                          title="Generate, Copy or Share Salesman Direct Access Link"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>🔗 Direct Link & Slip</span>
                        </button>

                        <button
                          onClick={() => {
                            if (sm.access_token) {
                              const link = `${window.location.origin}/?salesman_token=${sm.access_token}`;
                              navigator.clipboard.writeText(link);
                              alert(`Direct access link for ${sm.name} copied to clipboard!\n\n${link}`);
                            } else {
                              setViewingLoginSlipSalesman(sm);
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-amber-50 border border-[#D8DDD4] text-[#1F2B3A] rounded text-[11px] font-bold transition cursor-pointer"
                          title="Quick Copy Link"
                        >
                          <Copy className="w-3.5 h-3.5 text-[#D9A441]" />
                          <span>Copy Link</span>
                        </button>

                        <button
                          onClick={() => setResettingPasswordSalesman(sm)}
                          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-[#D8DDD4] text-[#1F2B3A] rounded text-[11px] font-bold transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-[#55606B]" />
                          <span>Reset PIN</span>
                        </button>

                        <button
                          onClick={() => setEditingSalesman(sm)}
                          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-[#D8DDD4] text-[#1F2B3A] rounded text-[11px] font-bold transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#55606B]" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeletingSalesman(sm)}
                          className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-red-50 border border-red-200 text-red-700 rounded text-[11px] font-bold transition cursor-pointer ml-auto"
                          title="Delete Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Isolation Rules Note */}
              <div className="bg-[#EEF0EC] p-3.5 rounded border border-[#D8DDD4] text-xs font-mono text-[#55606B] flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#3F7D58] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold text-[#1F2B3A]">Strict Counter Security Enforced:</div>
                  <p className="text-[11px]">
                    Salesmen can only log in to the Takeaway Bill POS counter. They can check available inventory quantities but cannot modify prices, view owner financial reports, see supplier purchase costs, or access other salesmen's bills.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 6: PURCHASES & RESTOCKING */}
          {/* ================================================= */}
          {activeTab === 'purchases' && (
            <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8DDD4] pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F2B3A]">
                    Supplier Purchases & Restock Inward
                  </h2>
                  <p className="text-xs font-mono text-[#55606B]">
                    Audit-logged inward receipts from agro mills and suppliers
                  </p>
                </div>

                <button
                  id="btn-new-purchase"
                  onClick={() => setShowNewPurchaseModal(true)}
                  className="flex items-center gap-1 px-3.5 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] font-mono font-bold text-xs rounded transition shadow-sm"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>+ Record Restock Inward</span>
                </button>
              </div>

              {/* Purchases Table */}
              <div className="border border-[#1F2B3A] overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#EEF0EC] border-b-2 border-[#1F2B3A] text-[#1F2B3A]">
                      <th className="py-2.5 px-3 text-left">PO Number</th>
                      <th className="py-2.5 px-3 text-left">Date</th>
                      <th className="py-2.5 px-3 text-left">Supplier</th>
                      <th className="py-2.5 px-3 text-left">Items Received</th>
                      <th className="py-2.5 px-3 text-right">Total Cost (Rs.)</th>
                      <th className="py-2.5 px-3 text-left">Memo / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4] bg-white">
                    {purchases.map((pur) => (
                      <tr key={pur.id} className="hover:bg-amber-50/50">
                        <td className="py-2.5 px-3 font-bold text-[#1F2B3A] whitespace-nowrap">
                          {pur.purchase_number}
                        </td>
                        <td className="py-2.5 px-3 text-[#55606B] whitespace-nowrap">
                          {formatDate(pur.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-[#1F2B3A]">
                          {pur.supplier_name}
                        </td>
                        <td className="py-2.5 px-3">
                          {pur.items?.map((i) => (
                            <div key={i.id} className="text-[11px]">
                              {i.product_name}: <span className="font-bold">{i.quantity} {i.unit}</span> @ Rs.{i.cost_price}
                            </div>
                          ))}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-[#1F2B3A]">
                          Rs. {pur.total_cost.toLocaleString('en-PK')}
                        </td>
                        <td className="py-2.5 px-3 text-[#55606B] font-sans">{pur.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 7: STOCK AUDIT TRAIL */}
          {/* ================================================= */}
          {activeTab === 'audit' && (
            <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#D8DDD4] pb-3">
                <div>
                  <h2 className="font-display font-bold text-lg text-[#1F2B3A]">
                    Godown Stock Movements & Audit Trail
                  </h2>
                  <p className="text-xs font-mono text-[#55606B]">
                    Immutable ledger of every sale, purchase, and manual adjustment
                  </p>
                </div>
              </div>

              {/* Audit Table */}
              <div className="border border-[#1F2B3A] overflow-x-auto">
                <table className="w-full text-xs font-mono border-collapse">
                  <thead>
                    <tr className="bg-[#EEF0EC] border-b-2 border-[#1F2B3A] text-[#1F2B3A]">
                      <th className="py-2.5 px-3 text-left">Timestamp</th>
                      <th className="py-2.5 px-3 text-left">Product</th>
                      <th className="py-2.5 px-3 text-center">Reason</th>
                      <th className="py-2.5 px-3 text-left">Reference #</th>
                      <th className="py-2.5 px-3 text-right">Change</th>
                      <th className="py-2.5 px-3 text-right">Prev &rarr; New Stock</th>
                      <th className="py-2.5 px-3 text-left">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D8DDD4] bg-white">
                    {stockMovements.map((sm) => (
                      <tr key={sm.id} className="hover:bg-amber-50/50">
                        <td className="py-2.5 px-3 text-[#55606B] whitespace-nowrap">
                          {formatDate(sm.created_at)}
                        </td>
                        <td className="py-2.5 px-3 font-sans font-bold text-[#1F2B3A]">
                          {sm.product_name}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              sm.reason === 'sale'
                                ? 'bg-red-100 text-red-800'
                                : sm.reason === 'purchase'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sm.reason}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#1F2B3A]">{sm.reference_number}</td>
                        <td
                          className={`py-2.5 px-3 text-right font-bold ${
                            sm.change_amount > 0 ? 'text-[#3F7D58]' : 'text-[#C1443C]'
                          }`}
                        >
                          {sm.change_amount > 0 ? `+${sm.change_amount}` : sm.change_amount} {sm.unit}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[#55606B]">
                          {sm.previous_stock} &rarr; <span className="font-bold text-[#1F2B3A]">{sm.new_stock}</span>
                        </td>
                        <td className="py-2.5 px-3 text-[#55606B]">{sm.recorded_by_name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 8: REPORTS & ANALYTICS */}
          {/* ================================================= */}
          {activeTab === 'reports' && salesReport && (
            <div className="space-y-6">
              {/* Daily Sales Trend Chart (Mustard & Ink Navy Theme) */}
              <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm">
                <div className="border-b border-[#D8DDD4] pb-2 mb-4">
                  <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                    7-Day Sales Breakdown (Cash vs. Credit Extended)
                  </h3>
                  <p className="text-xs font-mono text-[#55606B]">
                    Mustard & Ink Navy wholesale palette
                  </p>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesReport.sales_by_day}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EC" />
                      <XAxis dataKey="day_name" stroke="#55606B" fontSize={11} />
                      <YAxis stroke="#55606B" fontSize={11} />
                      <Tooltip
                        formatter={(val: any) => [`Rs. ${Number(val).toLocaleString('en-PK')}`, '']}
                        contentStyle={{
                          backgroundColor: '#1F2B3A',
                          color: '#EEF0EC',
                          border: 'none',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="cash" name="Cash Paid" fill="#3F7D58" />
                      <Bar dataKey="credit" name="Credit Balance" fill="#D9A441" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Selling Products List */}
              <div className="bg-white border-2 border-[#1F2B3A] p-4 shadow-sm">
                <div className="border-b border-[#D8DDD4] pb-2 mb-3">
                  <h3 className="font-display font-bold text-base text-[#1F2B3A]">
                    Top Selling Wholesale Products by Revenue
                  </h3>
                </div>

                <div className="border border-[#1F2B3A] overflow-x-auto">
                  <table className="w-full text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-[#EEF0EC] border-b-2 border-[#1F2B3A] text-[#1F2B3A]">
                        <th className="py-2 px-3 text-left">#</th>
                        <th className="py-2 px-3 text-left">Product Name</th>
                        <th className="py-2 px-3 text-right">Units Sold</th>
                        <th className="py-2 px-3 text-right">Total Revenue (Rs.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8DDD4]">
                      {topProducts.map((tp, idx) => (
                        <tr key={tp.product_id} className="hover:bg-amber-50/50">
                          <td className="py-2 px-3 text-[#55606B]">{idx + 1}</td>
                          <td className="py-2 px-3 font-sans font-bold text-[#1F2B3A]">
                            {tp.product_name}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#1F2B3A]">
                            {tp.units_sold} {tp.unit}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-[#3F7D58]">
                            Rs. {tp.total_revenue.toLocaleString('en-PK')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================= */}
          {/* TAB 9: ROLE ISOLATION TESTER */}
          {/* ================================================= */}
          {activeTab === 'security' && <RoleIsolationTester />}

          {/* ================================================= */}
          {/* TAB 10: SETTINGS & OFFLINE BACKUP */}
          {/* ================================================= */}
          {activeTab === 'settings' && <SettingsTab onRefreshAll={loadAllData} />}
        </main>
      </div>

      {/* Modals */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={loadAllData}
        />
      )}

      {showShopkeeperSaleModal && (
        <ShopkeeperSaleModal
          initialCustomer={saleInitialCustomer}
          customers={customers}
          products={products}
          currentUser={currentUser}
          onClose={() => {
            setShowShopkeeperSaleModal(false);
            setSaleInitialCustomer(null);
          }}
          onSuccess={loadAllData}
        />
      )}

      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {viewingLoginSlipSalesman && (
        <SalesmanLoginSlipModal
          salesman={viewingLoginSlipSalesman}
          onClose={() => setViewingLoginSlipSalesman(null)}
          onUserUpdated={(updated) => {
            setSalesmen((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setViewingLoginSlipSalesman(updated);
          }}
        />
      )}

      {adjustingProduct && (
        <StockAdjustmentModal
          product={adjustingProduct}
          onClose={() => setAdjustingProduct(null)}
          onSuccess={loadAllData}
        />
      )}

      {showNewProductModal && (
        <NewProductModal
          onClose={() => setShowNewProductModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showNewPurchaseModal && (
        <NewPurchaseModal
          products={products}
          suppliers={suppliers}
          onClose={() => setShowNewPurchaseModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {showNewSalesmanModal && (
        <NewSalesmanModal
          onClose={() => setShowNewSalesmanModal(false)}
          onSuccess={loadAllData}
        />
      )}

      {editingSalesman && (
        <EditSalesmanModal
          salesman={editingSalesman}
          onClose={() => setEditingSalesman(null)}
          onSuccess={loadAllData}
        />
      )}

      {resettingPasswordSalesman && (
        <ResetPasswordModal
          salesman={resettingPasswordSalesman}
          onClose={() => setResettingPasswordSalesman(null)}
          onSuccess={loadAllData}
        />
      )}

      {viewingLedgerCustomer && (
        <CustomerLedgerModal
          customer={viewingLedgerCustomer}
          onClose={() => setViewingLedgerCustomer(null)}
          onPaymentRecorded={loadAllData}
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

      {/* In-App Action Toast Notification */}
      {actionNotice && (
        <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded shadow-lg border text-xs font-mono font-bold flex items-center gap-2 ${
              actionNotice.type === 'success'
                ? 'bg-[#1F2B3A] text-[#9ae6b4] border-[#3F7D58]'
                : 'bg-[#C1443C] text-white border-red-800'
            }`}
          >
            <span>{actionNotice.message}</span>
            <button
              type="button"
              onClick={() => setActionNotice(null)}
              className="ml-2 text-white/70 hover:text-white cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Product In-App Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingProduct)}
        title="Delete / Archive Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}" (${deletingProduct?.code})?`}
        subMessage="This item will be removed from your active wholesale catalog and stock lists."
        confirmLabel="Yes, Delete Product"
        confirmStyle="danger"
        onConfirm={executeDeleteProduct}
        onCancel={() => setDeletingProduct(null)}
      />

      {/* Delete Customer In-App Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingCustomer)}
        title="Remove Shopkeeper from Register"
        message={`Are you sure you want to remove "${deletingCustomer?.name}"?`}
        subMessage="The shopkeeper profile and historical khata ledger will be deleted from active registers."
        confirmLabel="Yes, Remove Shopkeeper"
        confirmStyle="danger"
        onConfirm={executeDeleteCustomer}
        onCancel={() => setDeletingCustomer(null)}
      />

      {/* Delete Salesman In-App Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingSalesman)}
        title="Delete Salesman Account"
        message={`Are you sure you want to permanently delete salesman "${deletingSalesman?.name}" (${deletingSalesman?.username})?`}
        subMessage="This will immediately revoke their POS login credentials and token access."
        confirmLabel="Yes, Delete Account"
        confirmStyle="danger"
        onConfirm={executeDeleteSalesman}
        onCancel={() => setDeletingSalesman(null)}
      />

      {/* Reset All Data Confirm Modal */}
      <ConfirmModal
        isOpen={showResetAllConfirm}
        title="Reset All Business Registers"
        message="DANGER: This will erase all products, customers, suppliers, purchases, and billing records so you can start fresh."
        subMessage="This action cannot be undone."
        confirmLabel="Reset Everything"
        confirmStyle="danger"
        requiresTypedConfirmation="RESET"
        onConfirm={executeResetAllData}
        onCancel={() => setShowResetAllConfirm(false)}
      />
    </div>
  );
};
