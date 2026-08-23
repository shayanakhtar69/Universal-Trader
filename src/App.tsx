import React, { useState, useEffect } from 'react';
import { User, ShopProfile } from './types';
import { api } from './api';
import { THEME } from './theme';
import { OwnerDashboard } from './components/OwnerDashboard';
import { SalesmanMobileApp } from './components/SalesmanMobileApp';
import {
  Store,
  Lock,
  Smartphone,
  Monitor,
  LogOut,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  KeyRound,
  UserCheck,
  UserPlus,
  Building2,
  Phone,
  MapPin,
  CheckCircle2,
  HardDrive,
  Mail,
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [portal, setPortal] = useState<'owner' | 'salesman' | 'register'>('owner');
  const [hasOwner, setHasOwner] = useState<boolean>(true);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);

  // Login inputs
  const [loginUsername, setLoginUsername] = useState('owner');
  const [loginPassword, setLoginPassword] = useState('owner123');

  // Register inputs
  const [regName, setRegName] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [regTagline, setRegTagline] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'responsive' | 'mobile_frame'>('responsive');

  // Initialize: verify setup status, direct salesman link token, & active session
  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      setLoading(true);
      const status = await api.getSetupStatus();
      setHasOwner(status.hasOwner);
      if (status.shopProfile) {
        setShopProfile(status.shopProfile);
      }

      // Check URL query parameters for portal or prefilled credentials
      const urlParams = new URLSearchParams(window.location.search);
      const portalParam = (urlParams.get('portal') || urlParams.get('role') || urlParams.get('login'))?.toLowerCase();
      const userParam = urlParams.get('u') || urlParams.get('user') || urlParams.get('salesman');
      const directSalesmanToken =
        urlParams.get('salesman_token') ||
        urlParams.get('token') ||
        urlParams.get('staff_token');

      // 1. Direct magic token login for a specific salesman
      if (directSalesmanToken) {
        try {
          const directLoginRes = await api.tokenLogin(directSalesmanToken);
          setCurrentUser(directLoginRes.user);
          if (directLoginRes.shopProfile) {
            setShopProfile(directLoginRes.shopProfile);
          }
          // Clean the token parameter from URL without reloading
          window.history.replaceState({}, document.title, window.location.pathname);
          setSuccessNotice(
            `Welcome ${directLoginRes.user.name}! Connected to POS Counter via your direct personal access link.`
          );
          setLoading(false);
          return;
        } catch (tokenErr: any) {
          setError(
            tokenErr.message ||
              'This salesman direct access link is invalid, expired, or was revoked by the store owner.'
          );
          window.history.replaceState({}, document.title, window.location.pathname);
          setPortal('salesman');
          setLoginUsername('salesman1');
          setLoginPassword('sales123');
        }
      }

      // 2. Direct portal selection from URL
      if (!status.hasOwner) {
        setPortal('register');
      } else if (portalParam === 'salesman' || portalParam === 'staff' || portalParam === 'pos' || userParam) {
        setPortal('salesman');
        setLoginUsername(userParam || 'salesman1');
        setLoginPassword(userParam === 'salesman1' ? 'sales123' : '');
      } else {
        setPortal('owner');
        setLoginUsername('owner');
        setLoginPassword('owner123');
      }

      // 3. Check current saved token / active session if not already logged in by token
      const userRes = await api.getCurrentUser();
      if (userRes && userRes.user) {
        setCurrentUser(userRes.user);
      }
    } catch {
      // User is either not logged in or account was invalidated, clear session safely
      api.logout();
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const switchPortal = (newPortal: 'owner' | 'salesman' | 'register') => {
    setPortal(newPortal);
    setError(null);
    setSuccessNotice(null);

    // Update browser URL query param cleanly without reloading
    const url = new URL(window.location.href);
    if (newPortal === 'salesman') {
      url.searchParams.set('portal', 'salesman');
      url.searchParams.delete('u');
      window.history.pushState({}, '', url.toString());
      setLoginUsername('salesman1');
      setLoginPassword('sales123');
    } else if (newPortal === 'owner') {
      url.searchParams.set('portal', 'owner');
      url.searchParams.delete('u');
      window.history.pushState({}, '', url.toString());
      setLoginUsername('owner');
      setLoginPassword('owner123');
    } else {
      url.searchParams.delete('portal');
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleLogin = async (e?: React.FormEvent, customUser?: string, customPass?: string) => {
    if (e) e.preventDefault();
    const u = customUser || loginUsername;
    const p = customPass || loginPassword;

    try {
      setLoading(true);
      setError(null);
      setSuccessNotice(null);
      const res = await api.login(u, p);
      setCurrentUser(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccessNotice(null);

      const res = await api.registerOwner({
        name: regName.trim(),
        username: regUsername.trim(),
        password: regPassword.trim(),
        email: regEmail.trim() || undefined,
        shopName: regShopName.trim() || undefined,
        tagline: regTagline.trim() || undefined,
        phone: regPhone.trim() || undefined,
        address: regAddress.trim() || undefined,
      });

      setShopProfile(res.shopProfile);
      setCurrentUser(res.user);
      setHasOwner(true);
      setSuccessNotice('Owner account created successfully! Welcome to Universal Trader.');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const currentShopName = shopProfile?.name || THEME.shopInfo.name;
  const currentShopTagline = shopProfile?.tagline || THEME.shopInfo.tagline;

  // If not logged in, show Dedicated Portals for Owner vs Salesman
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#1F2B3A] flex flex-col justify-center items-center p-3 sm:p-4 font-sans text-[#1F2B3A]">
        {/* ========================================================================= */}
        {/* 1. DEDICATED MASTER OWNER LOGIN PORTAL                                    */}
        {/* ========================================================================= */}
        {portal === 'owner' && (
          <div className="w-full max-w-md bg-white border-2 border-[#D9A441] rounded-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Header: Master Owner Theme */}
            <div className="bg-[#151D28] text-[#EEF0EC] p-6 text-center border-b-2 border-[#D9A441] relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1F2B3A] text-[#D9A441] mb-2.5 shadow-md border-2 border-[#D9A441]/40">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#D9A441]/20 text-[#D9A441] border border-[#D9A441]/50 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                👔 Master Administration
              </div>
              <h1 className="slab text-2xl uppercase tracking-wider text-[#D9A441]">
                {currentShopName}
              </h1>
              <p className="text-xs font-mono text-white/70 mt-0.5">
                Owner Control Center & Master Financial Ledger
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-4 font-mono text-xs">
              {/* Feedback Notices */}
              {successNotice && (
                <div className="bg-[#3F7D58]/10 border border-[#3F7D58] p-3 text-xs text-[#3F7D58] flex items-center gap-2 rounded">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {error && (
                <div className="bg-[#C1443C]/10 border border-[#C1443C] p-3 text-xs text-[#C1443C] flex items-center gap-2 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Master Owner Info Card */}
              <div className="bg-[#EEF0EC] p-3.5 border border-[#D8DDD4] rounded text-xs space-y-1 text-[#1F2B3A]">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-[#1F2B3A]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#D9A441]" />
                    Master Owner Access
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('owner');
                      setLoginPassword('owner123');
                    }}
                    className="text-[10px] text-[#D9A441] hover:underline font-bold cursor-pointer"
                  >
                    [Auto-Fill Demo]
                  </button>
                </div>
                <p className="text-[11px] text-[#55606B]">
                  ID: <strong className="text-[#1F2B3A]">owner</strong> • PIN/Pass: <strong className="text-[#1F2B3A]">owner123</strong>
                </p>
                <p className="text-[10px] text-[#55606B] pt-0.5">
                  Full control over inventory rates, customer ledgers, daily profit margins, supplier restocking, and salesman staff accounts.
                </p>
              </div>

              {/* Owner Login Form */}
              <form onSubmit={(e) => handleLogin(e)} className="space-y-3.5">
                <div>
                  <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                    Master Owner Username *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. owner"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                    Master Owner Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#D9A441] hover:bg-[#D9A441]/90 active:scale-[0.99] text-[#1F2B3A] font-bold text-xs uppercase tracking-widest rounded shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Verifying Credentials...' : 'Log In As Master Owner'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Dedicated Switcher: Go to Salesman Counter Portal */}
              <div className="pt-3 border-t border-black/10 text-center space-y-2">
                <div className="text-[11px] text-[#55606B]">
                  Are you a salesman, counter cashier, or order booker?
                </div>
                <button
                  type="button"
                  onClick={() => switchPortal('salesman')}
                  className="w-full py-2.5 px-3 bg-[#3F7D58]/10 hover:bg-[#3F7D58]/20 border border-[#3F7D58]/40 text-[#3F7D58] rounded font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-[#3F7D58]" />
                  <span>Switch To Salesman Counter Portal →</span>
                </button>
              </div>

              {!hasOwner && (
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={() => switchPortal('register')}
                    className="text-[#D9A441] hover:underline font-bold text-xs cursor-pointer"
                  >
                    + Register First Store Owner Account
                  </button>
                </div>
              )}
            </div>

            {/* Offline Safety Assurance Footer */}
            <div className="p-3.5 bg-[#EEF0EC] border-t border-black/10 text-center font-mono text-[10px] text-[#55606B] flex items-center justify-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#3F7D58]" />
              <span>100% Offline Disk Protected Local SQLite Database</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. DEDICATED SALESMAN & COUNTER POS LOGIN PORTAL                         */}
        {/* ========================================================================= */}
        {portal === 'salesman' && (
          <div className="w-full max-w-md bg-white border-2 border-[#3F7D58] rounded-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            {/* Header: Salesman POS Theme */}
            <div className="bg-[#1F2B3A] text-[#EEF0EC] p-6 text-center border-b-2 border-[#3F7D58] relative">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#3F7D58]/20 text-[#3F7D58] mb-2.5 shadow-md border-2 border-[#3F7D58]">
                <Smartphone className="w-7 h-7" />
              </div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#3F7D58]/20 text-[#3F7D58] border border-[#3F7D58]/50 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                📱 Salesman & Cashier POS
              </div>
              <h1 className="slab text-2xl uppercase tracking-wider text-white">
                {currentShopName}
              </h1>
              <p className="text-xs font-mono text-white/70 mt-0.5">
                Staff Counter Terminal & Shopkeeper Field Booking
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-4 font-mono text-xs">
              {/* Feedback Notices */}
              {successNotice && (
                <div className="bg-[#3F7D58]/10 border border-[#3F7D58] p-3 text-xs text-[#3F7D58] flex items-center gap-2 rounded">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successNotice}</span>
                </div>
              )}

              {error && (
                <div className="bg-[#C1443C]/10 border border-[#C1443C] p-3 text-xs text-[#C1443C] flex items-center gap-2 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Salesman Notice & Quick Auto-Fill */}
              <div className="bg-[#3F7D58]/10 border border-[#3F7D58]/30 p-3.5 rounded text-xs space-y-1 text-[#1F2B3A]">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-[#3F7D58]">
                    <Smartphone className="w-3.5 h-3.5" />
                    Salesman Account Login
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('salesman1');
                      setLoginPassword('sales123');
                    }}
                    className="text-[10px] text-[#3F7D58] hover:underline font-bold cursor-pointer"
                  >
                    [Auto-Fill Counter 1]
                  </button>
                </div>
                <p className="text-[11px] text-[#55606B]">
                  Default Staff: <strong className="text-[#1F2B3A]">salesman1</strong> • Password: <strong className="text-[#1F2B3A]">sales123</strong>
                </p>
                <p className="text-[10px] text-[#55606B] pt-0.5">
                  🔒 <strong>Personalized Workspace:</strong> You will access your own sales counter to book bills, register customer orders, and view your daily cash collection.
                </p>
              </div>

              {/* Salesman Form */}
              <form onSubmit={(e) => handleLogin(e)} className="space-y-3.5">
                <div>
                  <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                    Salesman Username / Staff ID *
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. salesman1"
                      value={loginUsername}
                      onChange={(e) => setLoginUsername(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#3F7D58]"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                    Salesman PIN / Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#3F7D58]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#3F7D58] hover:bg-[#3F7D58]/90 active:scale-[0.99] text-white font-bold text-xs uppercase tracking-widest rounded shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Opening Your Counter POS...' : 'Log In To My Salesman Terminal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              {/* Direct Magic Link Hint */}
              <div className="bg-[#EEF0EC] p-2.5 rounded border border-[#D8DDD4] text-[10px] text-[#55606B] text-center">
                💡 <strong>Direct Access Link:</strong> If the Store Owner gave you a direct WhatsApp / QR link, clicking that link opens your terminal automatically without typing a password.
              </div>

              {/* Dedicated Switcher: Go to Master Owner Admin */}
              <div className="pt-3 border-t border-black/10 text-center space-y-2">
                <div className="text-[11px] text-[#55606B]">
                  Are you the Store Owner / Master Administrator?
                </div>
                <button
                  type="button"
                  onClick={() => switchPortal('owner')}
                  className="w-full py-2.5 px-3 bg-[#D9A441]/15 hover:bg-[#D9A441]/25 border border-[#D9A441]/50 text-[#1F2B3A] rounded font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-[#D9A441]" />
                  <span>← Switch To Master Owner Admin Portal</span>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-[#EEF0EC] border-t border-black/10 text-center font-mono text-[10px] text-[#55606B] flex items-center justify-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-[#3F7D58]" />
              <span>Offline Ready • Real-Time Stock • POS Counter</span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. INITIAL OWNER SETUP / REGISTRATION PORTAL                              */}
        {/* ========================================================================= */}
        {portal === 'register' && (
          <div className="w-full max-w-lg bg-white border-2 border-[#D9A441] rounded-lg shadow-2xl overflow-hidden animate-in fade-in duration-200">
            <div className="bg-[#151D28] text-[#EEF0EC] p-6 text-center border-b-2 border-[#D9A441]">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[#1F2B3A] text-[#D9A441] mb-2.5 shadow-md border-2 border-[#D9A441]">
                <Store className="w-7 h-7" />
              </div>
              <h1 className="slab text-2xl uppercase tracking-wider text-[#D9A441]">
                {currentShopName}
              </h1>
              <p className="text-xs font-mono text-white/70 mt-0.5">
                First Time Setup: Register Master Owner Account
              </p>
            </div>

            <div className="p-6 sm:p-7 space-y-4 font-mono text-xs">
              {error && (
                <div className="bg-[#C1443C]/10 border border-[#C1443C] p-3 text-xs text-[#C1443C] flex items-center gap-2 rounded">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-3">
                <div className="bg-[#3F7D58]/10 border border-[#3F7D58]/30 p-2.5 rounded text-[11px] text-[#3F7D58]">
                  Register your master Owner credentials to manage this wholesale business. This registration will close permanently once created.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Owner Full Name *
                    </label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Master Business Owner"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Shop / Business Name *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="text"
                        placeholder="e.g. UNIVERSAL TRADER"
                        value={regShopName}
                        onChange={(e) => setRegShopName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Choose Username / ID *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. owner or my_store"
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Choose Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="password"
                        required
                        placeholder="Min 4 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider flex items-center justify-between">
                      <span>Google Account / Email</span>
                      <span className="text-[9px] text-[#3F7D58] font-bold">● Verification</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="email"
                        placeholder="e.g. sa6759810@gmail.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Mobile / Phone
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="text"
                        placeholder="e.g. 0300 1234567"
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden focus:border-[#D9A441]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Business Slogan / Tagline
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Grain & Grocery Wholesale"
                      value={regTagline}
                      onChange={(e) => setRegTagline(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="font-bold text-[#1F2B3A] block mb-1 uppercase text-[10px] tracking-wider">
                      Godown & Shop Address
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-[#55606B]" />
                      <input
                        type="text"
                        placeholder="e.g. Plot 45, Grain Market Road"
                        value={regAddress}
                        onChange={(e) => setRegAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-black/20 rounded outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 bg-[#3F7D58] hover:bg-[#3F7D58]/90 text-white font-bold text-xs uppercase tracking-widest rounded shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{loading ? 'Creating Owner Account...' : 'Complete Master Owner Setup'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => switchPortal('owner')}
                  className="text-[#55606B] hover:text-[#1F2B3A] font-bold text-xs cursor-pointer"
                >
                  Already registered? Back to Login
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If logged in: Top Header and View Router
  return (
    <div className="min-h-screen bg-[#EEF0EC] flex flex-col font-sans">
      {/* Global Application Top Bar */}
      <header className="bg-[#151D28] text-[#EEF0EC] px-3 sm:px-6 py-2.5 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-[#D9A441]" />
            <span className="font-bold text-white hidden sm:inline">{currentShopName}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded border border-white/10">
            {currentUser.avatar_url ? (
              <img
                src={currentUser.avatar_url}
                alt={currentUser.name}
                className="w-4 h-4 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="text-white/50">Logged in:</span>
            )}
            <span className="font-bold text-white">{currentUser.name}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                currentUser.role === 'owner'
                  ? 'bg-[#D9A441] text-[#1F2B3A]'
                  : 'bg-[#3F7D58] text-white'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </div>

        {/* View controls & Logout */}
        <div className="flex items-center gap-2">
          {/* Salesman Mobile Simulator Frame Toggle */}
          {currentUser.role === 'salesman' && (
            <div className="flex items-center bg-white/5 rounded p-0.5 border border-white/10">
              <button
                onClick={() => setViewMode('mobile_frame')}
                title="Mobile Phone View Frame"
                className={`p-1.5 rounded transition cursor-pointer ${
                  viewMode === 'mobile_frame'
                    ? 'bg-[#D9A441] text-[#1F2B3A]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('responsive')}
                title="Full Responsive View"
                className={`p-1.5 rounded transition cursor-pointer ${
                  viewMode === 'responsive'
                    ? 'bg-[#D9A441] text-[#1F2B3A]'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1 bg-red-900/60 hover:bg-red-800 text-red-200 rounded border border-red-700/50 transition cursor-pointer text-xs font-mono"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main View Router based on Role */}
      <div className="flex-1 flex flex-col">
        {currentUser.role === 'owner' ? (
          <OwnerDashboard currentUser={currentUser} />
        ) : (
          <div className="flex-1 flex justify-center items-start py-4 sm:py-6 px-2 sm:px-4">
            {viewMode === 'mobile_frame' ? (
              <div className="w-full max-w-sm border-4 border-[#1F2B3A] rounded-2xl shadow-2xl overflow-hidden bg-[#EEF0EC]">
                <div className="bg-[#151D28] text-white py-1 px-4 text-center text-[10px] font-mono border-b border-slate-700">
                  📱 {currentShopName} • Salesman POS Counter
                </div>
                <SalesmanMobileApp currentUser={currentUser} onLogout={handleLogout} />
              </div>
            ) : (
              <div className="w-full max-w-lg">
                <SalesmanMobileApp currentUser={currentUser} onLogout={handleLogout} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
