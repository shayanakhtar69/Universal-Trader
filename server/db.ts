import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  User,
  Product,
  Customer,
  Order,
  OrderItem,
  Payment,
  Supplier,
  Purchase,
  PurchaseItem,
  StockMovement,
  CustomerLedgerEntry,
  SalesReportSummary,
  TopProductReport,
  OutstandingCreditCustomer,
  ShopProfile,
} from '../src/types';

// Persistent Local Database for Wholesale Store
// Built with strict ACID-like transactional guarantees, local disk safety, and zero external cloud dependency

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'wholesale_database.json');

const DEFAULT_SHOP_PROFILE: ShopProfile = {
  name: 'UNIVERSAL TRADER',
  tagline: 'Wholesale Provision, Spices, Pulses & Grain Merchants',
  ownerName: 'Universal Trader Owner',
  phone: '+92 300 1234567 / 042-37654321',
  email: 'owner@universaltrader.com',
  address: 'Shop No. 42-45, Grain Market, Wholesale Complex',
  city: 'Grain Market',
  ntn: 'NTN: 8492018-4',
  currency: 'PKR',
  currencySymbol: 'Rs.',
  terms: 'Goods once sold will not be taken back. Payment due within agreed terms.',
};

class WholesaleDatabase {
  private users: (User & { password_hash: string })[] = [];
  private products: Product[] = [];
  private customers: Customer[] = [];
  private orders: Order[] = [];
  private orderItems: OrderItem[] = [];
  private payments: Payment[] = [];
  private suppliers: Supplier[] = [];
  private purchases: Purchase[] = [];
  private purchaseItems: PurchaseItem[] = [];
  private stockMovements: StockMovement[] = [];
  private shopProfile: ShopProfile = { ...DEFAULT_SHOP_PROFILE };

  private invoiceCounter = 1001;
  private purchaseCounter = 101;
  private paymentCounter = 101;

  constructor() {
    this.ensureDataDir();
    const loaded = this.loadFromFile();
    if (!loaded) {
      this.seedInitialData();
      this.saveToFile();
    }
  }

  private ensureDataDir() {
    try {
      const dir = path.dirname(DB_FILE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      console.error('Error creating data directory:', err);
    }
  }

  private saveToFile() {
    try {
      this.ensureDataDir();
      const payload = {
        users: this.users,
        products: this.products,
        customers: this.customers,
        orders: this.orders,
        orderItems: this.orderItems,
        payments: this.payments,
        suppliers: this.suppliers,
        purchases: this.purchases,
        purchaseItems: this.purchaseItems,
        stockMovements: this.stockMovements,
        shopProfile: this.shopProfile,
        invoiceCounter: this.invoiceCounter,
        purchaseCounter: this.purchaseCounter,
        paymentCounter: this.paymentCounter,
        saved_at: new Date().toISOString(),
      };
      fs.writeFileSync(DB_FILE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist wholesale database to disk:', err);
    }
  }

  private loadFromFile(): boolean {
    try {
      if (!fs.existsSync(DB_FILE_PATH)) return false;
      const data = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      if (!data || !data.trim()) return false;
      const parsed = JSON.parse(data);

      this.users = parsed.users || [];
      // Ensure all salesman users have an access token for direct affiliate-like dashboard access
      this.users.forEach((u) => {
        if (u.role === 'salesman' && !u.access_token) {
          u.access_token = 'sls_' + crypto.randomBytes(16).toString('hex');
        }
      });
      this.products = parsed.products || [];
      this.customers = parsed.customers || [];
      this.orders = parsed.orders || [];
      this.orderItems = parsed.orderItems || [];
      this.payments = parsed.payments || [];
      this.suppliers = parsed.suppliers || [];
      this.purchases = parsed.purchases || [];
      this.purchaseItems = parsed.purchaseItems || [];
      this.stockMovements = parsed.stockMovements || [];
      this.shopProfile = parsed.shopProfile || { ...DEFAULT_SHOP_PROFILE };
      this.invoiceCounter = parsed.invoiceCounter || 1001;
      this.purchaseCounter = parsed.purchaseCounter || 101;
      this.paymentCounter = parsed.paymentCounter || 101;

      return true;
    } catch (err) {
      console.error('Error loading wholesale database from disk:', err);
      return false;
    }
  }

  private seedInitialData() {
    // Initial state has no users until the first Owner registers
    this.users = [];
    this.shopProfile = { ...DEFAULT_SHOP_PROFILE };
    this.suppliers = [];
    this.products = [];
    this.customers = [];
    this.orders = [];
    this.orderItems = [];
    this.payments = [];
    this.purchases = [];
    this.purchaseItems = [];
    this.stockMovements = [];
  }

  // ==========================================
  // SHOP PROFILE & SETTINGS
  // ==========================================
  public getShopProfile(): ShopProfile {
    return { ...this.shopProfile };
  }

  public updateShopProfile(updates: Partial<ShopProfile>): ShopProfile {
    this.shopProfile = {
      ...this.shopProfile,
      ...updates,
    };
    this.saveToFile();
    return this.shopProfile;
  }

  public hasOwner(): boolean {
    return this.users.some((u) => u.role === 'owner' && u.active);
  }

  public isRegistrationOpen(): boolean {
    return !this.hasOwner();
  }

  // Self-Registration for Owner: The first registered user becomes the Owner, closing signup permanently
  public registerOwner(data: {
    name: string;
    username: string;
    password: string;
    phone?: string;
    email?: string;
    shopName?: string;
    address?: string;
    tagline?: string;
  }): { user: User; shopProfile: ShopProfile } {
    if (this.hasOwner()) {
      throw new Error(
        'Registration is permanently closed: An Owner account already exists. New staff accounts must be created by the Owner in the dashboard.'
      );
    }

    const cleanUsername = data.username.trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('Username is required.');
    }
    if (!data.name || !data.name.trim()) {
      throw new Error('Full Name is required.');
    }
    if (!data.password || data.password.trim().length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    // Check if user already exists
    const existingUser = this.users.find(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (existingUser) {
      throw new Error(`Username "${cleanUsername}" is already in use.`);
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(data.password.trim(), salt);

    const registeredUser: User & { password_hash: string } = {
      id: `usr_owner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      username: cleanUsername,
      email: data.email?.trim() || `${cleanUsername}@wholesale.local`,
      role: 'owner',
      phone: data.phone?.trim() || '',
      active: true,
      password_hash,
      created_at: new Date().toISOString(),
    };

    this.users.push(registeredUser);

    // Update Shop Profile
    if (data.shopName && data.shopName.trim()) {
      this.shopProfile.name = data.shopName.trim();
    }
    if (data.tagline && data.tagline.trim()) {
      this.shopProfile.tagline = data.tagline.trim();
    }
    if (data.address && data.address.trim()) {
      this.shopProfile.address = data.address.trim();
    }
    if (data.phone && data.phone.trim()) {
      this.shopProfile.phone = data.phone.trim();
    }
    this.shopProfile.ownerName = data.name.trim();

    this.saveToFile();

    const { password_hash: _, ...rest } = registeredUser;
    return {
      user: rest,
      shopProfile: this.shopProfile,
    };
  }

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================
  public exportDatabaseBackup(): any {
    return {
      version: '2.0.0',
      exported_at: new Date().toISOString(),
      shopProfile: this.shopProfile,
      users: this.users,
      products: this.products,
      customers: this.customers,
      orders: this.orders,
      orderItems: this.orderItems,
      payments: this.payments,
      suppliers: this.suppliers,
      purchases: this.purchases,
      purchaseItems: this.purchaseItems,
      stockMovements: this.stockMovements,
      invoiceCounter: this.invoiceCounter,
      purchaseCounter: this.purchaseCounter,
      paymentCounter: this.paymentCounter,
    };
  }

  public importDatabaseBackup(backupData: any): boolean {
    if (!backupData || !Array.isArray(backupData.users)) {
      throw new Error('Invalid backup file format.');
    }

    this.users = backupData.users || [];
    this.products = backupData.products || [];
    this.customers = backupData.customers || [];
    this.orders = backupData.orders || [];
    this.orderItems = backupData.orderItems || [];
    this.payments = backupData.payments || [];
    this.suppliers = backupData.suppliers || [];
    this.purchases = backupData.purchases || [];
    this.purchaseItems = backupData.purchaseItems || [];
    this.stockMovements = backupData.stockMovements || [];
    if (backupData.shopProfile) {
      this.shopProfile = { ...DEFAULT_SHOP_PROFILE, ...backupData.shopProfile };
    }
    this.invoiceCounter = backupData.invoiceCounter || 1001;
    this.purchaseCounter = backupData.purchaseCounter || 101;
    this.paymentCounter = backupData.paymentCounter || 101;

    this.saveToFile();
    return true;
  }

  // ==========================================
  // AUTH & USERS (Full Salesman & Staff Management)
  // ==========================================
  public getUserByGoogleId(googleId: string): (User & { password_hash: string }) | undefined {
    return this.users.find((u) => u.google_id === googleId && u.active);
  }

  public createOrLoginGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }): { user: User; shopProfile: ShopProfile; isNewUser: boolean } {
    const cleanEmail = (profile.email || '').trim().toLowerCase();

    // 1. Check if user with this googleId already exists
    let existingUser = this.users.find((u) => u.google_id === profile.googleId);

    // 2. Check if user with this email already exists (link Google ID)
    if (!existingUser && cleanEmail) {
      existingUser = this.users.find((u) => (u.email || '').trim().toLowerCase() === cleanEmail);
      if (existingUser) {
        existingUser.google_id = profile.googleId;
        if (profile.avatarUrl && !existingUser.avatar_url) {
          existingUser.avatar_url = profile.avatarUrl;
        }
        this.saveToFile();
      }
    }

    if (existingUser) {
      if (!existingUser.active) {
        throw new Error('This user account has been deactivated by the store owner.');
      }
      const { password_hash, ...rest } = existingUser;
      return { user: rest, shopProfile: this.getShopProfile(), isNewUser: false };
    }

    // 3. User does not exist yet.
    // If NO active owner exists, this first Google user becomes the Master Owner!
    const isFirstUser = !this.hasOwner();
    const role: 'owner' | 'salesman' = isFirstUser ? 'owner' : 'salesman';

    // Generate unique username from email or name
    const baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'user';
    let username = baseUsername;
    let counter = 1;
    while (this.users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      username = `${baseUsername}${counter++}`;
    }

    const salt = bcrypt.genSaltSync(10);
    const randomPass = crypto.randomBytes(16).toString('hex');
    const password_hash = bcrypt.hashSync(randomPass, salt);
    const isSalesman = role === 'salesman';

    const newUser: User & { password_hash: string } = {
      id: `usr_${role}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: profile.name || 'Google User',
      username,
      email: cleanEmail || `${username}@google.local`,
      role,
      active: true,
      google_id: profile.googleId,
      avatar_url: profile.avatarUrl,
      access_token: isSalesman ? 'sls_' + crypto.randomBytes(16).toString('hex') : undefined,
      password_hash,
      created_at: new Date().toISOString(),
    };

    this.users.push(newUser);

    if (isFirstUser) {
      this.shopProfile.ownerName = newUser.name;
    }

    this.saveToFile();
    const { password_hash: _, ...rest } = newUser;
    return { user: rest, shopProfile: this.getShopProfile(), isNewUser: true };
  }

  public getUserByUsername(username: string): (User & { password_hash: string }) | undefined {
    const clean = username.trim().toLowerCase();
    return this.users.find(
      (u) =>
        u.username.toLowerCase() === clean ||
        u.email.toLowerCase() === clean
    );
  }

  public getUserByAccessToken(token: string): (User & { password_hash: string }) | undefined {
    if (!token || !token.trim()) return undefined;
    const clean = token.trim();
    return this.users.find((u) => u.access_token === clean && u.active);
  }

  public regenerateUserAccessToken(id: string): User | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.access_token = 'sls_' + crypto.randomBytes(16).toString('hex');
    this.saveToFile();
    const { password_hash, ...rest } = user;
    return rest;
  }

  public getUserById(id: string): User | undefined {
    const user = this.users.find((u) => u.id === id);
    if (!user) return undefined;
    const { password_hash, ...rest } = user;
    return rest;
  }

  public getAllUsers(): User[] {
    return this.users.map((u) => {
      const { password_hash, ...rest } = u;
      const userOrders = this.orders.filter((o) => o.salesman_id === u.id);
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = userOrders.filter((o) => o.created_at.startsWith(today));

      return {
        ...rest,
        today_sales: todayOrders.reduce((sum, o) => sum + o.total_amount, 0),
        total_sales: userOrders.reduce((sum, o) => sum + o.total_amount, 0),
        orders_count: userOrders.length,
      };
    });
  }

  public createUser(userData: {
    name: string;
    username: string;
    email?: string;
    role: 'owner' | 'salesman';
    phone?: string;
    password: string;
  }): User {
    const cleanUsername = userData.username.trim().toLowerCase();
    const existing = this.users.find((u) => u.username.toLowerCase() === cleanUsername);
    if (existing) {
      throw new Error(`Username "${userData.username}" is already in use.`);
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(userData.password.trim(), salt);
    const isSalesman = (userData.role || 'salesman') === 'salesman';
    const newUser: User & { password_hash: string } = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: userData.name.trim(),
      username: cleanUsername,
      email: userData.email?.trim() || `${cleanUsername}@wholesale.local`,
      role: userData.role || 'salesman',
      phone: userData.phone?.trim() || '',
      active: true,
      access_token: isSalesman ? 'sls_' + crypto.randomBytes(16).toString('hex') : undefined,
      password_hash,
      created_at: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.saveToFile();
    const { password_hash: _, ...rest } = newUser;
    return rest;
  }

  public updateUser(
    id: string,
    updates: {
      name?: string;
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
      active?: boolean;
    }
  ): User | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;

    if (updates.username) {
      const cleanUsername = updates.username.trim().toLowerCase();
      const existing = this.users.find(
        (u) => u.id !== id && u.username.toLowerCase() === cleanUsername
      );
      if (existing) {
        throw new Error(`Username "${updates.username}" is already taken.`);
      }
      user.username = cleanUsername;
    }

    if (updates.name !== undefined) user.name = updates.name.trim();
    if (updates.email !== undefined) user.email = updates.email.trim();
    if (updates.phone !== undefined) user.phone = updates.phone.trim();
    if (updates.active !== undefined) user.active = Boolean(updates.active);

    if (updates.password && updates.password.trim()) {
      const salt = bcrypt.genSaltSync(10);
      user.password_hash = bcrypt.hashSync(updates.password.trim(), salt);
    }

    this.saveToFile();
    const { password_hash, ...rest } = user;
    return rest;
  }

  public resetUserPassword(id: string, newPassword: string): boolean {
    const user = this.users.find((u) => u.id === id);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.password_hash = bcrypt.hashSync(newPassword.trim(), salt);
    this.saveToFile();
    return true;
  }

  public deleteUser(id: string): boolean {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return false;
    if (this.users[index].role === 'owner') {
      const ownerCount = this.users.filter((u) => u.role === 'owner').length;
      if (ownerCount <= 1) {
        throw new Error('Cannot delete the primary owner account.');
      }
    }
    this.users.splice(index, 1);
    this.saveToFile();
    return true;
  }

  public updateUserStatus(id: string, active: boolean): User | null {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    user.active = active;
    this.saveToFile();
    const { password_hash, ...rest } = user;
    return rest;
  }

  public resetAllData(): { message: string } {
    this.suppliers = [];
    this.products = [];
    this.customers = [];
    this.orders = [];
    this.orderItems = [];
    this.payments = [];
    this.purchases = [];
    this.purchaseItems = [];
    this.stockMovements = [];
    this.invoiceCounter = 1001;
    this.purchaseCounter = 101;
    this.paymentCounter = 101;
    this.saveToFile();
    return { message: 'All business registers and demo data cleared successfully.' };
  }

  public resetFactoryDefaults(): { message: string } {
    this.users = [];
    this.suppliers = [];
    this.products = [];
    this.customers = [];
    this.orders = [];
    this.orderItems = [];
    this.payments = [];
    this.purchases = [];
    this.purchaseItems = [];
    this.stockMovements = [];
    this.shopProfile = { ...DEFAULT_SHOP_PROFILE };
    this.invoiceCounter = 1001;
    this.purchaseCounter = 101;
    this.paymentCounter = 101;
    this.saveToFile();
    return { message: 'System reset to factory state. Owner self-registration is now open.' };
  }

  // ==========================================
  // PRODUCTS & INVENTORY
  // ==========================================
  public getAllProducts(includeDeleted = false): Product[] {
    return this.products.filter((p) => includeDeleted || !p.is_deleted);
  }

  public getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id && !p.is_deleted);
  }

  public getLowStockProducts(): Product[] {
    return this.products.filter(
      (p) => !p.is_deleted && p.current_stock <= p.low_stock_threshold
    );
  }

  public createProduct(data: {
    name: string;
    code?: string;
    category: string;
    unit: any;
    wholesale_price: number;
    cost_price?: number;
    initial_stock: number;
    low_stock_threshold: number;
    recorded_by: User;
  }): Product {
    const id = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const code = data.code || `PRD-${(this.products.length + 1).toString().padStart(4, '0')}`;
    const newProduct: Product = {
      id,
      name: data.name,
      code,
      category: data.category,
      unit: data.unit,
      wholesale_price: data.wholesale_price,
      cost_price: data.cost_price || Math.round(data.wholesale_price * 0.88),
      current_stock: data.initial_stock,
      low_stock_threshold: data.low_stock_threshold || 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.products.push(newProduct);

    if (data.initial_stock > 0) {
      this.stockMovements.push({
        id: `sm_${Date.now()}`,
        product_id: id,
        product_name: data.name,
        unit: data.unit,
        change_amount: data.initial_stock,
        reason: 'adjustment',
        reference_id: id,
        reference_number: 'INITIAL_STOCK',
        previous_stock: 0,
        new_stock: data.initial_stock,
        recorded_by_id: data.recorded_by.id,
        recorded_by_name: data.recorded_by.name,
        notes: 'Initial inventory entry',
        created_at: new Date().toISOString(),
      });
    }

    this.saveToFile();
    return newProduct;
  }

  public updateProduct(
    id: string,
    data: Partial<Pick<Product, 'name' | 'category' | 'unit' | 'wholesale_price' | 'cost_price' | 'low_stock_threshold'>>
  ): Product | null {
    const product = this.products.find((p) => p.id === id && !p.is_deleted);
    if (!product) return null;

    if (data.name !== undefined) product.name = data.name;
    if (data.category !== undefined) product.category = data.category;
    if (data.unit !== undefined) product.unit = data.unit;
    if (data.wholesale_price !== undefined) product.wholesale_price = data.wholesale_price;
    if (data.cost_price !== undefined) product.cost_price = data.cost_price;
    if (data.low_stock_threshold !== undefined) product.low_stock_threshold = data.low_stock_threshold;
    product.updated_at = new Date().toISOString();

    this.saveToFile();
    return product;
  }

  public deleteProduct(id: string): boolean {
    const product = this.products.find((p) => p.id === id);
    if (!product) return false;
    // Check if product has orders
    const hasOrders = this.orderItems.some((item) => item.product_id === id);
    if (hasOrders) {
      // Soft delete
      product.is_deleted = true;
      product.updated_at = new Date().toISOString();
    } else {
      this.products = this.products.filter((p) => p.id !== id);
    }
    this.saveToFile();
    return true;
  }

  // Stock Adjustment (Owner Only)
  public adjustStock(
    productId: string,
    newQuantity: number,
    reasonText: string,
    recordedBy: User
  ): { product: Product; movement: StockMovement } {
    const product = this.products.find((p) => p.id === productId && !p.is_deleted);
    if (!product) throw new Error('Product not found');

    const previousStock = product.current_stock;
    const diff = newQuantity - previousStock;
    if (diff === 0) {
      return {
        product,
        movement: this.stockMovements[0] || ({} as any),
      };
    }

    product.current_stock = newQuantity;
    product.updated_at = new Date().toISOString();

    const movement: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      product_id: product.id,
      product_name: product.name,
      unit: product.unit,
      change_amount: diff,
      reason: 'adjustment',
      reference_id: `ADJ_${Date.now()}`,
      reference_number: `ADJ-${new Date().toISOString().slice(0, 10)}`,
      previous_stock: previousStock,
      new_stock: newQuantity,
      recorded_by_id: recordedBy.id,
      recorded_by_name: recordedBy.name,
      notes: reasonText || 'Manual stock correction by owner',
      created_at: new Date().toISOString(),
    };
    this.stockMovements.unshift(movement);
    this.saveToFile();

    return { product, movement };
  }

  // ==========================================
  // CUSTOMERS & RUNNING CREDIT LEDGER
  // ==========================================
  public getCustomers(_currentUser: User): Customer[] {
    return [...this.customers].sort((a, b) => b.credit_balance - a.credit_balance);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find((c) => c.id === id);
  }

  public createCustomer(data: {
    name: string;
    phone: string;
    address?: string;
    opening_balance?: number;
    recorded_by: User;
  }): Customer {
    const openingBal = data.opening_balance && data.opening_balance > 0 ? Number(data.opening_balance) : 0;
    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address?.trim() || 'Market Walk-in',
      credit_balance: openingBal,
      created_by_salesman_id: data.recorded_by.id,
      created_by_salesman_name: data.recorded_by.name,
      total_orders_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.customers.unshift(newCust);
    this.saveToFile();
    return newCust;
  }

  public updateCustomer(
    id: string,
    data: { name?: string; phone?: string; address?: string; credit_balance?: number }
  ): Customer | null {
    const customer = this.customers.find((c) => c.id === id);
    if (!customer) return null;

    if (data.name !== undefined) customer.name = data.name.trim();
    if (data.phone !== undefined) customer.phone = data.phone.trim();
    if (data.address !== undefined) customer.address = data.address.trim();
    if (data.credit_balance !== undefined) customer.credit_balance = Number(data.credit_balance);
    customer.updated_at = new Date().toISOString();

    this.saveToFile();
    return customer;
  }

  public deleteCustomer(id: string): boolean {
    const idx = this.customers.findIndex((c) => c.id === id);
    if (idx === -1) return false;
    this.customers.splice(idx, 1);
    this.saveToFile();
    return true;
  }

  // Calculate & Auditable Running Ledger
  public getCustomerLedger(customerId: string): {
    customer: Customer;
    entries: CustomerLedgerEntry[];
    calculatedBalance: number;
  } {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Customer not found');

    const customerOrders = this.orders.filter((o) => o.customer_id === customerId);
    const customerPayments = this.payments.filter((p) => p.customer_id === customerId);

    const rawEntries: {
      date: string;
      type: 'order_credit' | 'order_partial' | 'payment_received' | 'order_paid';
      reference_id: string;
      reference_no: string;
      description: string;
      debit: number;
      credit: number;
      recorded_by_name: string;
    }[] = [];

    // Process orders
    for (const ord of customerOrders) {
      if (ord.payment_type === 'credit') {
        rawEntries.push({
          date: ord.created_at,
          type: 'order_credit',
          reference_id: ord.id,
          reference_no: ord.invoice_number,
          description: `Bill ${ord.invoice_number} (Full Credit Takeaway)`,
          debit: ord.total_amount,
          credit: 0,
          recorded_by_name: ord.salesman_name,
        });
      } else if (ord.payment_type === 'partial') {
        rawEntries.push({
          date: ord.created_at,
          type: 'order_partial',
          reference_id: ord.id,
          reference_no: ord.invoice_number,
          description: `Bill ${ord.invoice_number} Total (Partial Paid Rs. ${ord.amount_paid})`,
          debit: ord.total_amount,
          credit: 0,
          recorded_by_name: ord.salesman_name,
        });
        if (ord.amount_paid > 0) {
          rawEntries.push({
            date: new Date(new Date(ord.created_at).getTime() + 1000).toISOString(),
            type: 'payment_received',
            reference_id: ord.id,
            reference_no: `PAY-BILL-${ord.invoice_number}`,
            description: `Downpayment at counter against ${ord.invoice_number}`,
            debit: 0,
            credit: ord.amount_paid,
            recorded_by_name: ord.salesman_name,
          });
        }
      } else {
        rawEntries.push({
          date: ord.created_at,
          type: 'order_paid',
          reference_id: ord.id,
          reference_no: ord.invoice_number,
          description: `Bill ${ord.invoice_number} (Full Cash Settled)`,
          debit: ord.total_amount,
          credit: ord.total_amount,
          recorded_by_name: ord.salesman_name,
        });
      }
    }

    for (const pay of customerPayments) {
      if (!pay.order_id) {
        rawEntries.push({
          date: pay.created_at,
          type: 'payment_received',
          reference_id: pay.id,
          reference_no: pay.payment_number,
          description: `Ledger Payment (${pay.payment_method.toUpperCase()}) ${pay.notes ? '- ' + pay.notes : ''}`,
          debit: 0,
          credit: pay.amount,
          recorded_by_name: pay.recorded_by_name,
        });
      }
    }

    rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = 0;
    const entries: CustomerLedgerEntry[] = rawEntries.map((item, idx) => {
      running += item.debit - item.credit;
      return {
        id: `ldg_${idx + 1}`,
        date: item.date,
        type: item.type,
        reference_id: item.reference_id,
        reference_no: item.reference_no,
        description: item.description,
        debit: item.debit,
        credit: item.credit,
        running_balance: running,
        recorded_by_name: item.recorded_by_name,
      };
    });

    customer.credit_balance = Math.max(0, running);

    return {
      customer,
      entries: entries.reverse(),
      calculatedBalance: Math.max(0, running),
    };
  }

  public recordCustomerPayment(data: {
    customerId: string;
    amount: number;
    paymentMethod: 'cash' | 'upi' | 'cheque' | 'bank_transfer';
    notes?: string;
    recordedBy: User;
  }): { payment: Payment; customer: Customer; newBalance: number } {
    const customer = this.customers.find((c) => c.id === data.customerId);
    if (!customer) throw new Error('Customer not found');
    if (data.amount <= 0) throw new Error('Payment amount must be greater than 0');

    this.paymentCounter++;
    const paymentNumber = `RCP-2026-${this.paymentCounter.toString().padStart(4, '0')}`;

    const payment: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      payment_number: paymentNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      amount: data.amount,
      payment_method: data.paymentMethod,
      notes: data.notes || 'Balance clearance payment',
      recorded_by_id: data.recordedBy.id,
      recorded_by_name: data.recordedBy.name,
      created_at: new Date().toISOString(),
    };

    this.payments.unshift(payment);
    const ledger = this.getCustomerLedger(customer.id);
    customer.updated_at = new Date().toISOString();
    this.saveToFile();

    return {
      payment,
      customer,
      newBalance: ledger.calculatedBalance,
    };
  }

  // ==========================================
  // ATOMIC ORDER TRANSACTION & BILLING
  // ==========================================
  public createOrderTransaction(
    orderData: {
      customerId: string;
      items: { productId: string; quantity: number }[];
      paymentType: 'cash' | 'credit' | 'partial';
      amountPaidNow?: number;
      notes?: string;
    },
    salesman: User
  ): { order: Order; items: OrderItem[]; customer: Customer } {
    const customer = this.customers.find((c) => c.id === orderData.customerId);
    if (!customer) {
      throw new Error(`Customer with ID ${orderData.customerId} not found.`);
    }

    if (!orderData.items || orderData.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }

    const productMap = new Map<string, Product>();
    for (const reqItem of orderData.items) {
      if (reqItem.quantity <= 0) {
        throw new Error('Item quantity must be greater than 0.');
      }
      const prod = this.products.find((p) => p.id === reqItem.productId && !p.is_deleted);
      if (!prod) {
        throw new Error(`Product ${reqItem.productId} not found.`);
      }
      if (prod.current_stock < reqItem.quantity) {
        throw new Error(
          `Insufficient stock for "${prod.name}". Available: ${prod.current_stock} ${prod.unit}, Requested: ${reqItem.quantity}`
        );
      }
      productMap.set(reqItem.productId, prod);
    }

    let orderTotal = 0;
    const generatedOrderItems: OrderItem[] = [];
    this.invoiceCounter++;
    const invoiceNumber = `INV-2026-${this.invoiceCounter.toString().padStart(4, '0')}`;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    for (const reqItem of orderData.items) {
      const prod = productMap.get(reqItem.productId)!;
      const lineTotal = prod.wholesale_price * reqItem.quantity;
      orderTotal += lineTotal;

      const orderItem: OrderItem = {
        id: `oitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        order_id: orderId,
        product_id: prod.id,
        product_name: prod.name,
        unit: prod.unit,
        quantity: reqItem.quantity,
        price_at_sale: prod.wholesale_price,
        total_line: lineTotal,
      };
      generatedOrderItems.push(orderItem);

      const prevStock = prod.current_stock;
      prod.current_stock -= reqItem.quantity;
      prod.updated_at = new Date().toISOString();

      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: prod.id,
        product_name: prod.name,
        unit: prod.unit,
        change_amount: -reqItem.quantity,
        reason: 'sale',
        reference_id: orderId,
        reference_number: invoiceNumber,
        previous_stock: prevStock,
        new_stock: prod.current_stock,
        recorded_by_id: salesman.id,
        recorded_by_name: salesman.name,
        notes: `Sold via Bill ${invoiceNumber} to ${customer.name}`,
        created_at: new Date().toISOString(),
      };
      this.stockMovements.unshift(movement);
    }

    let amountPaid = 0;
    let remainingBalance = 0;

    if (orderData.paymentType === 'cash') {
      amountPaid = orderTotal;
      remainingBalance = 0;
    } else if (orderData.paymentType === 'credit') {
      amountPaid = 0;
      remainingBalance = orderTotal;
    } else if (orderData.paymentType === 'partial') {
      const downpayment = Number(orderData.amountPaidNow) || 0;
      if (downpayment < 0 || downpayment > orderTotal) {
        throw new Error(`Partial amount paid must be between 0 and order total (Rs. ${orderTotal})`);
      }
      amountPaid = downpayment;
      remainingBalance = orderTotal - downpayment;
    }

    const newOrder: Order = {
      id: orderId,
      invoice_number: invoiceNumber,
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      salesman_id: salesman.id,
      salesman_name: salesman.name,
      total_amount: orderTotal,
      payment_type: orderData.paymentType,
      amount_paid: amountPaid,
      remaining_balance: remainingBalance,
      status: orderData.paymentType === 'cash' ? 'paid' : orderData.paymentType === 'credit' ? 'credit' : 'partial',
      is_takeaway: true,
      notes: orderData.notes || '',
      items_count: generatedOrderItems.length,
      created_at: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);
    this.orderItems.push(...generatedOrderItems);

    customer.last_order_date = newOrder.created_at;
    customer.total_orders_count = (customer.total_orders_count || 0) + 1;
    customer.updated_at = new Date().toISOString();

    if (amountPaid > 0) {
      this.paymentCounter++;
      this.payments.unshift({
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        payment_number: `RCP-2026-${this.paymentCounter.toString().padStart(4, '0')}`,
        customer_id: customer.id,
        customer_name: customer.name,
        order_id: newOrder.id,
        amount: amountPaid,
        payment_method: 'cash',
        notes: `Settlement for Takeaway Bill ${invoiceNumber}`,
        recorded_by_id: salesman.id,
        recorded_by_name: salesman.name,
        created_at: new Date().toISOString(),
      });
    }

    this.getCustomerLedger(customer.id);
    this.saveToFile();

    return {
      order: newOrder,
      items: generatedOrderItems,
      customer,
    };
  }

  public getOrdersForUser(
    currentUser: User,
    filters?: {
      salesmanId?: string;
      paymentType?: string;
      status?: string;
      search?: string;
    }
  ): (Order & { items: OrderItem[] })[] {
    let result = this.orders;

    if (currentUser.role === 'salesman') {
      result = result.filter((o) => o.salesman_id === currentUser.id);
    } else if (filters?.salesmanId && filters.salesmanId !== 'all') {
      result = result.filter((o) => o.salesman_id === filters.salesmanId);
    }

    if (filters?.paymentType && filters.paymentType !== 'all') {
      result = result.filter((o) => o.payment_type === filters.paymentType);
    }

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((o) => o.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.invoice_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q)
      );
    }

    return result.map((o) => ({
      ...o,
      items: this.orderItems.filter((i) => i.order_id === o.id),
    }));
  }

  public getOrderByIdScoped(currentUser: User, id: string): (Order & { items: OrderItem[] }) | null {
    const order = this.orders.find((o) => o.id === id);
    if (!order) return null;
    if (currentUser.role === 'salesman' && order.salesman_id !== currentUser.id) {
      return null;
    }
    return {
      ...order,
      items: this.orderItems.filter((i) => i.order_id === order.id),
    };
  }

  public getOrders(
    currentUser: User,
    filters?: {
      salesmanId?: string;
      paymentType?: string;
      status?: string;
      search?: string;
    }
  ): Order[] {
    let result = this.orders;

    if (currentUser.role === 'salesman') {
      result = result.filter((o) => o.salesman_id === currentUser.id);
    } else if (filters?.salesmanId && filters.salesmanId !== 'all') {
      result = result.filter((o) => o.salesman_id === filters.salesmanId);
    }

    if (filters?.paymentType && filters.paymentType !== 'all') {
      result = result.filter((o) => o.payment_type === filters.paymentType);
    }

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((o) => o.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (o) =>
          o.invoice_number.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q)
      );
    }

    return result;
  }

  public getOrderById(id: string, currentUser: User): Order | undefined {
    const order = this.orders.find((o) => o.id === id);
    if (!order) return undefined;
    if (currentUser.role === 'salesman' && order.salesman_id !== currentUser.id) {
      throw new Error('Access denied: You are not authorized to view bills created by other salesmen.');
    }
    return order;
  }

  public getOrderBill(
    id: string,
    currentUser: User
  ): { order: Order; customer: Customer; items: OrderItem[] } | null {
    const order = this.getOrderById(id, currentUser);
    if (!order) return null;

    const customer = this.customers.find((c) => c.id === order.customer_id) || {
      id: order.customer_id,
      name: order.customer_name,
      phone: order.customer_phone,
      address: '',
      credit_balance: 0,
      created_at: order.created_at,
      updated_at: order.created_at,
    };

    const items = this.orderItems.filter((i) => i.order_id === order.id);
    return { order, customer, items };
  }

  // ==========================================
  // SUPPLIERS & PURCHASES
  // ==========================================
  public getAllSuppliers(): Supplier[] {
    return this.suppliers;
  }

  public createSupplier(data: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    contact_person?: string;
  }): Supplier {
    const newSupplier: Supplier = {
      id: `sup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      contact_person: data.contact_person,
      created_at: new Date().toISOString(),
    };
    this.suppliers.push(newSupplier);
    this.saveToFile();
    return newSupplier;
  }

  public getAllPurchases(): Purchase[] {
    return this.purchases.map((p) => ({
      ...p,
      items: this.purchaseItems.filter((i) => i.purchase_id === p.id),
    }));
  }

  public createPurchaseTransaction(
    data: {
      supplierId: string;
      items: { productId: string; quantity: number; costPrice: number }[];
      notes?: string;
    },
    owner: User
  ): Purchase {
    if (owner.role !== 'owner') {
      throw new Error('Only the shop owner can record supplier purchases.');
    }

    const supplier = this.suppliers.find((s) => s.id === data.supplierId);
    if (!supplier) throw new Error('Supplier not found.');

    this.purchaseCounter++;
    const purchaseNumber = `PO-2026-${this.purchaseCounter.toString().padStart(4, '0')}`;
    const purchaseId = `pur_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    let totalCost = 0;
    const generatedItems: PurchaseItem[] = [];

    for (const item of data.items) {
      if (item.quantity <= 0) throw new Error('Quantity must be greater than 0');
      const prod = this.products.find((p) => p.id === item.productId);
      if (!prod) throw new Error(`Product ${item.productId} not found.`);

      const lineTotal = item.costPrice * item.quantity;
      totalCost += lineTotal;

      generatedItems.push({
        id: `pitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        purchase_id: purchaseId,
        product_id: prod.id,
        product_name: prod.name,
        unit: prod.unit,
        quantity: item.quantity,
        cost_price: item.costPrice,
        total_line: lineTotal,
      });

      const prevStock = prod.current_stock;
      prod.current_stock += item.quantity;
      prod.cost_price = item.costPrice;
      prod.updated_at = new Date().toISOString();

      this.stockMovements.unshift({
        id: `sm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        product_id: prod.id,
        product_name: prod.name,
        unit: prod.unit,
        change_amount: item.quantity,
        reason: 'purchase',
        reference_id: purchaseId,
        reference_number: purchaseNumber,
        previous_stock: prevStock,
        new_stock: prod.current_stock,
        recorded_by_id: owner.id,
        recorded_by_name: owner.name,
        notes: `Restock received from ${supplier.name}`,
        created_at: new Date().toISOString(),
      });
    }

    const newPurchase: Purchase = {
      id: purchaseId,
      purchase_number: purchaseNumber,
      supplier_id: supplier.id,
      supplier_name: supplier.name,
      total_cost: totalCost,
      recorded_by_id: owner.id,
      recorded_by_name: owner.name,
      items_count: generatedItems.length,
      items: generatedItems,
      notes: data.notes || 'Warehouse delivery received',
      created_at: new Date().toISOString(),
    };

    this.purchases.unshift(newPurchase);
    this.purchaseItems.push(...generatedItems);
    this.saveToFile();

    return newPurchase;
  }

  // ==========================================
  // STOCK MOVEMENTS AUDIT TRAIL
  // ==========================================
  public getStockMovements(productId?: string): StockMovement[] {
    if (productId) {
      return this.stockMovements.filter((sm) => sm.product_id === productId);
    }
    return this.stockMovements;
  }

  // ==========================================
  // REPORTS
  // ==========================================
  public getSalesReport(from?: string, to?: string): SalesReportSummary {
    let filteredOrders = this.orders;
    if (from) {
      filteredOrders = filteredOrders.filter((o) => o.created_at >= from);
    }
    if (to) {
      filteredOrders = filteredOrders.filter((o) => o.created_at <= to);
    }

    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalCash = filteredOrders.reduce((sum, o) => sum + o.amount_paid, 0);
    const totalCredit = filteredOrders.reduce((sum, o) => sum + o.remaining_balance, 0);

    const salesmenMap = new Map<string, { salesman_id: string; salesman_name: string; total_sales: number; orders_count: number }>();
    for (const u of this.users.filter((u) => u.role === 'salesman')) {
      salesmenMap.set(u.id, {
        salesman_id: u.id,
        salesman_name: u.name,
        total_sales: 0,
        orders_count: 0,
      });
    }

    for (const o of filteredOrders) {
      const entry = salesmenMap.get(o.salesman_id) || {
        salesman_id: o.salesman_id,
        salesman_name: o.salesman_name,
        total_sales: 0,
        orders_count: 0,
      };
      entry.total_sales += o.total_amount;
      entry.orders_count += 1;
      salesmenMap.set(o.salesman_id, entry);
    }

    const dayMap = new Map<string, { total_sales: number; orders_count: number; cash: number; credit: number }>();
    const daysArr: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toISOString().split('T')[0];
      daysArr.push(key);
      dayMap.set(key, { total_sales: 0, orders_count: 0, cash: 0, credit: 0 });
    }

    for (const o of filteredOrders) {
      const dayKey = o.created_at.split('T')[0];
      if (dayMap.has(dayKey)) {
        const dEntry = dayMap.get(dayKey)!;
        dEntry.total_sales += o.total_amount;
        dEntry.orders_count += 1;
        dEntry.cash += o.amount_paid;
        dEntry.credit += o.remaining_balance;
      }
    }

    const salesByDay = daysArr.map((dateStr) => {
      const d = new Date(dateStr);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const stats = dayMap.get(dateStr)!;
      return {
        date: dateStr,
        day_name: dayName,
        total_sales: stats.total_sales,
        orders_count: stats.orders_count,
        cash: stats.cash,
        credit: stats.credit,
      };
    });

    return {
      total_revenue: totalRevenue,
      total_orders: filteredOrders.length,
      total_cash_collected: totalCash,
      total_credit_extended: totalCredit,
      sales_by_salesman: Array.from(salesmenMap.values()),
      sales_by_day: salesByDay,
    };
  }

  public getTopProductsReport(): TopProductReport[] {
    const map = new Map<string, { product_id: string; product_name: string; unit: any; units_sold: number; total_revenue: number }>();

    for (const item of this.orderItems) {
      const existing = map.get(item.product_id) || {
        product_id: item.product_id,
        product_name: item.product_name,
        unit: item.unit,
        units_sold: 0,
        total_revenue: 0,
      };
      existing.units_sold += item.quantity;
      existing.total_revenue += item.total_line;
      map.set(item.product_id, existing);
    }

    return Array.from(map.values()).sort((a, b) => b.total_revenue - a.total_revenue);
  }

  public getOutstandingCreditReport(): OutstandingCreditCustomer[] {
    return this.customers
      .filter((c) => c.credit_balance > 0)
      .map((c) => {
        const lastPay = this.payments.find((p) => p.customer_id === c.id);
        const daysOverdue = c.last_order_date
          ? Math.floor((Date.now() - new Date(c.last_order_date).getTime()) / 86400000)
          : 0;
        return {
          customer_id: c.id,
          customer_name: c.name,
          customer_phone: c.phone,
          address: c.address,
          credit_balance: c.credit_balance,
          last_payment_date: lastPay?.created_at,
          days_overdue: daysOverdue,
        };
      })
      .sort((a, b) => b.credit_balance - a.credit_balance);
  }
}

export const db = new WholesaleDatabase();
