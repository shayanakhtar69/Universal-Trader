import {
  User,
  Product,
  Customer,
  Order,
  Payment,
  Supplier,
  Purchase,
  StockMovement,
  CustomerLedgerEntry,
  SalesReportSummary,
  TopProductReport,
  OutstandingCreditCustomer,
  ShopProfile,
} from './types';

let authToken: string | null = localStorage.getItem('wholesale_auth_token');

export function setToken(token: string | null, user?: User | null) {
  authToken = token;
  if (token) {
    localStorage.setItem('wholesale_auth_token', token);
    if (user) {
      localStorage.setItem('wholesale_auth_user', JSON.stringify(user));
    }
  } else {
    localStorage.removeItem('wholesale_auth_token');
    localStorage.removeItem('wholesale_auth_user');
  }
}

export function getToken(): string | null {
  return authToken || localStorage.getItem('wholesale_auth_token');
}

export function getSavedUser(): User | null {
  const saved = localStorage.getItem('wholesale_auth_user');
  if (!saved) return null;
  try {
    return JSON.parse(saved);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = { error: `HTTP ${response.status}: Request failed` };
  }

  if (!response.ok) {
    // If account is deactivated, invalid, or token expired, cleanly log out
    if (response.status === 401) {
      setToken(null, null);
    }
    throw new Error(data.error || `HTTP ${response.status}: Request failed`);
  }

  return data;
}

export const api = {
  // Auth & Token helper
  setToken,
  getToken,
  getSavedUser,

  // Auth & Setup
  getSetupStatus: () =>
    request<{ hasOwner: boolean; isRegistrationOpen: boolean; shopProfile: ShopProfile }>('/auth/setup-status'),

  registerOwner: async (data: {
    name: string;
    username: string;
    password: string;
    phone?: string;
    email?: string;
    shopName?: string;
    address?: string;
    tagline?: string;
  }) => {
    const res = await request<{
      token: string;
      user: User;
      shopProfile: ShopProfile;
      message: string;
    }>('/auth/register-owner', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setToken(res.token, res.user);
    return res;
  },

  login: async (username: string, password: string) => {
    const res = await request<{ token: string; user: User; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token, res.user);
    return res;
  },

  tokenLogin: async (token: string) => {
    const res = await request<{
      token: string;
      user: User;
      shopProfile: ShopProfile;
      message: string;
    }>('/auth/token-login', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    setToken(res.token, res.user);
    return res;
  },

  logout: () => {
    setToken(null, null);
  },

  getCurrentUser: () => request<{ user: User }>('/auth/me'),

  switchDemoUser: (username: string) =>
    request<{ token: string; user: User }>(`/auth/demo-switch/${username}`),

  getGoogleAuthConfig: () =>
    request<{
      configured: boolean;
      clientId: string | null;
      supportedRedirectUris: string[];
    }>('/auth/google/config'),

  getGoogleAuthUrl: (redirectUri?: string) => {
    const params = new URLSearchParams();
    if (redirectUri) params.append('redirect_uri', redirectUri);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<{ configured: boolean; url: string; redirectUri: string }>(`/auth/google/url${qs}`);
  },

  // Shop Profile & Settings
  getShopProfile: () => request<{ shopProfile: ShopProfile }>('/settings/shop-profile'),
  updateShopProfile: (profile: Partial<ShopProfile>) =>
    request<{ shopProfile: ShopProfile; message: string }>('/settings/shop-profile', {
      method: 'PUT',
      body: JSON.stringify(profile),
    }),
  exportBackup: () => request<{ backup: any }>('/settings/export-backup'),
  importBackup: (backup: any) =>
    request<{ success: boolean; message: string }>('/settings/import-backup', {
      method: 'POST',
      body: JSON.stringify({ backup }),
    }),
  resetAllData: () =>
    request<{ message: string }>('/settings/reset-all', {
      method: 'POST',
    }),
  factoryReset: () =>
    request<{ message: string }>('/settings/factory-reset', {
      method: 'POST',
    }),

  // Users (Owner Only)
  getUsers: () => request<{ users: User[] }>('/users'),
  createUser: (user: Partial<User> & { password: string }) =>
    request<{ user: User }>('/users', {
      method: 'POST',
      body: JSON.stringify(user),
    }),
  updateUser: (id: string, updates: Partial<User> & { password?: string }) =>
    request<{ user: User }>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  updateUserStatus: (id: string, active: boolean) =>
    request<{ user: User }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  resetSalesmanPassword: (id: string, password: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  regenerateSalesmanToken: (id: string) =>
    request<{ user: User; message: string }>(`/users/${id}/regenerate-token`, {
      method: 'POST',
    }),
  deleteUser: (id: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE',
    }),

  // Products
  getProducts: () => request<{ products: Product[] }>('/products'),
  getLowStockProducts: () => request<{ products: Product[] }>('/products/low-stock'),
  createProduct: (product: Partial<Product> & { initial_stock: number }) =>
    request<{ product: Product }>('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    }),
  updateProduct: (id: string, updates: Partial<Product>) =>
    request<{ product: Product }>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),
  deleteProduct: (id: string) =>
    request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    }),
  adjustStock: (id: string, newQuantity: number, reason: string) =>
    request<{ product: Product; movement: StockMovement }>(`/products/${id}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ newQuantity, reason }),
    }),

  // Customers & Shopkeepers Ledger
  getCustomers: () => request<{ customers: Customer[] }>('/customers'),
  createCustomer: (customer: { name: string; phone: string; address?: string; opening_balance?: number }) =>
    request<{ customer: Customer }>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    }),
  updateCustomer: (id: string, customer: { name?: string; phone?: string; address?: string; credit_balance?: number }) =>
    request<{ customer: Customer }>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customer),
    }),
  deleteCustomer: (id: string) =>
    request<{ message: string }>(`/customers/${id}`, {
      method: 'DELETE',
    }),
  getCustomerLedger: (id: string) =>
    request<{ customer: Customer; entries: CustomerLedgerEntry[]; calculatedBalance: number }>(
      `/customers/${id}/ledger`
    ),
  recordPayment: (id: string, amount: number, paymentMethod: string, notes?: string) =>
    request<{ payment: Payment; customer: Customer; newBalance: number }>(
      `/customers/${id}/payments`,
      {
        method: 'POST',
        body: JSON.stringify({ amount, paymentMethod, notes }),
      }
    ),

  // Orders
  createOrder: (orderData: {
    customerId: string;
    items: { productId: string; quantity: number }[];
    paymentType: 'cash' | 'credit' | 'partial';
    amountPaidNow?: number;
    notes?: string;
  }) =>
    request<{ order: Order; items: any[]; customer: Customer }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  getMyOrders: () => request<{ orders: Order[] }>('/orders/mine'),

  getAllOrders: (filters?: { salesmanId?: string; paymentType?: string; status?: string; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.salesmanId) params.append('salesmanId', filters.salesmanId);
    if (filters?.paymentType) params.append('paymentType', filters.paymentType);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<{ orders: Order[] }>(`/orders${query}`);
  },

  getOrderById: (id: string) => request<{ order: Order }>(`/orders/${id}`),

  getOrderBill: (id: string) =>
    request<{ bill: { order: Order; customer: Customer; items: any[] } }>(`/orders/${id}/bill`),

  // Purchases & Suppliers
  getSuppliers: () => request<{ suppliers: Supplier[] }>('/suppliers'),
  createSupplier: (supplier: Partial<Supplier>) =>
    request<{ supplier: Supplier }>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier),
    }),
  getPurchases: () => request<{ purchases: Purchase[] }>('/purchases'),
  createPurchase: (purchaseData: {
    supplierId: string;
    items: { productId: string; quantity: number; costPrice: number }[];
    notes?: string;
  }) =>
    request<{ purchase: Purchase }>('/purchases', {
      method: 'POST',
      body: JSON.stringify(purchaseData),
    }),

  // Stock Movements Audit Trail
  getStockMovements: (productId?: string) => {
    const query = productId ? `?productId=${productId}` : '';
    return request<{ movements: StockMovement[] }>(`/stock-movements${query}`);
  },

  // Reports
  getSalesReport: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<SalesReportSummary>(`/reports/sales-summary${query}`);
  },
  getTopProducts: () => request<{ topProducts: TopProductReport[] }>('/reports/top-products'),
  getOutstandingCredit: () =>
    request<{ debtors: OutstandingCreditCustomer[] }>('/reports/outstanding-credit'),

  // Role Isolation Test
  testRoleIsolation: () =>
    request<{
      success: boolean;
      testName: string;
      details: {
        createdOrder: { id: string; invoice: string; ownerSalesman: string };
        directAccessBySalesmanB: string;
        listQueryLeakCheck: string;
        verdict: string;
      };
    }>('/test-role-isolation', { method: 'POST' }),
};
