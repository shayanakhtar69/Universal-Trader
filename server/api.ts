import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { User } from '../src/types';
import { handleGoogleConfig, handleGoogleAuthUrl, handleGoogleCallback } from './googleAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'wholesale-super-secure-secret-key-2026';

export const apiRouter = express.Router();

// Augment Express Request to hold authenticated user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

// ----------------------------------------------------
// AUTH MIDDLEWARES (Stage 2: Auth & Role Isolation)
// ----------------------------------------------------
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    const user = db.getUserById(decoded.id);
    if (!user || !user.active) {
      return res.status(401).json({ error: 'User account is deactivated or invalid', code: 'ACCOUNT_INVALID' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token', code: 'TOKEN_EXPIRED' });
  }
}

export function requireOwner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Access denied: Owner privileges required' });
  }
  next();
}

// ----------------------------------------------------
// 1. AUTHENTICATION & SETUP ENDPOINTS
// ----------------------------------------------------
apiRouter.get('/auth/setup-status', (_req: Request, res: Response) => {
  const hasOwner = db.hasOwner();
  return res.json({
    hasOwner,
    isRegistrationOpen: !hasOwner,
    shopProfile: db.getShopProfile(),
  });
});

apiRouter.post('/auth/register-owner', (req: Request, res: Response) => {
  if (db.hasOwner()) {
    return res.status(403).json({
      error: 'Self-registration is permanently closed: An Owner account already exists. New staff accounts must be created by the Owner in the dashboard.',
      code: 'REGISTRATION_CLOSED',
    });
  }

  const { name, username, password, phone, email, shopName, address, tagline } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Full name, username, and password are required' });
  }

  try {
    const result = db.registerOwner({
      name,
      username,
      password,
      phone,
      email,
      shopName,
      address,
      tagline,
    });

    const token = jwt.sign(
      { id: result.user.id, role: result.user.role, username: result.user.username },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      token,
      user: result.user,
      shopProfile: result.shopProfile,
      message: `Master Owner account "${result.user.name}" registered successfully. Public self-registration is now permanently closed.`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Registration failed' });
  }
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const userRecord = db.getUserByUsername(username);
  if (!userRecord || !userRecord.active) {
    return res.status(401).json({ error: 'Invalid username or inactive account' });
  }

  const isPasswordValid = bcrypt.compareSync(password, userRecord.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const { password_hash, ...user } = userRecord;
  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });

  return res.json({
    token,
    user,
    message: `Logged in successfully as ${user.name} (${user.role.toUpperCase()})`,
  });
});

// Direct Salesman Access Link Authentication (Affiliate-style token portal)
apiRouter.post('/auth/token-login', (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Salesman access link token is required' });
  }

  const userRecord = db.getUserByAccessToken(token.trim());
  if (!userRecord || !userRecord.active) {
    return res.status(401).json({
      error: 'This salesman access link is invalid, expired, or was revoked by the owner.',
      code: 'INVALID_ACCESS_LINK',
    });
  }

  const { password_hash, ...user } = userRecord;
  const jwtToken = jwt.sign(
    { id: user.id, role: user.role, username: user.username },
    JWT_SECRET,
    { expiresIn: '30d' }
  );

  return res.json({
    token: jwtToken,
    user,
    shopProfile: db.getShopProfile(),
    message: `Welcome ${user.name}! Connected to POS Counter via your dedicated access link.`,
  });
});

// Google OAuth Integration Endpoints
apiRouter.get('/auth/google/config', handleGoogleConfig);
apiRouter.get('/auth/google/url', handleGoogleAuthUrl);
apiRouter.get('/auth/google/callback', handleGoogleCallback);

apiRouter.get('/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  return res.json({ user: req.user });
});

// Quick switcher helper for testing role isolation without re-typing passwords
apiRouter.get('/auth/demo-switch/:username', (req: Request, res: Response) => {
  const { username } = req.params;
  const userRecord = db.getUserByUsername(username);
  if (!userRecord) {
    return res.status(404).json({ error: 'Demo user not found' });
  }
  const { password_hash, ...user } = userRecord;
  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  return res.json({ token, user });
});

// ----------------------------------------------------
// 2. USERS MANAGEMENT (Owner Only)
// ----------------------------------------------------
apiRouter.get('/users', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const users = db.getAllUsers();
  return res.json({ users });
});

apiRouter.post('/users', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { name, username, email, role, phone, password } = req.body;
  if (!name || !username || !password) {
    return res.status(400).json({ error: 'Name, username, and password are required' });
  }
  try {
    const newUser = db.createUser({
      name,
      username,
      email: email || `${username}@wholesale.com`,
      role: role || 'salesman',
      phone,
      password,
    });
    return res.status(201).json({ user: newUser });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/users/:id/status', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { active } = req.body;
  const updated = db.updateUserStatus(id, Boolean(active));
  if (!updated) return res.status(404).json({ error: 'User not found' });
  return res.json({ user: updated });
});

apiRouter.put('/users/:id', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const updated = db.updateUser(id, req.body);
    if (!updated) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/users/:id/reset-password', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;
  if (!password || !password.trim()) {
    return res.status(400).json({ error: 'New password is required' });
  }
  const ok = db.resetUserPassword(id, password.trim());
  if (!ok) return res.status(404).json({ error: 'User not found' });
  return res.json({ success: true, message: 'Password reset successfully' });
});

apiRouter.post('/users/:id/regenerate-token', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updated = db.regenerateUserAccessToken(id);
  if (!updated) return res.status(404).json({ error: 'User not found' });
  return res.json({
    user: updated,
    message: `Generated a fresh direct access link for ${updated.name}. Any old links are now deactivated.`,
  });
});

apiRouter.delete('/users/:id', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ok = db.deleteUser(id);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.post('/settings/reset-all', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const result = db.resetAllData();
  return res.json(result);
});

apiRouter.post('/settings/factory-reset', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const result = db.resetFactoryDefaults();
  return res.json(result);
});

apiRouter.get('/settings/shop-profile', (_req: Request, res: Response) => {
  return res.json({ shopProfile: db.getShopProfile() });
});

apiRouter.put('/settings/shop-profile', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = db.updateShopProfile(req.body);
    return res.json({ shopProfile: updated, message: 'Shop profile updated successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update shop profile' });
  }
});

apiRouter.get('/settings/export-backup', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  try {
    const backup = db.exportDatabaseBackup();
    return res.json({ backup });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Export failed' });
  }
});

apiRouter.post('/settings/import-backup', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { backup } = req.body;
    if (!backup) return res.status(400).json({ error: 'No backup data provided' });
    db.importDatabaseBackup(backup);
    return res.json({ success: true, message: 'Database backup restored successfully.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Restore failed' });
  }
});

// ----------------------------------------------------
// 3. PRODUCTS & INVENTORY (Stage 3)
// ----------------------------------------------------
apiRouter.get('/products', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const products = db.getAllProducts();
  return res.json({ products });
});

apiRouter.get('/products/low-stock', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const lowStock = db.getLowStockProducts();
  return res.json({ products: lowStock });
});

apiRouter.post('/products', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { name, code, category, unit, wholesale_price, cost_price, initial_stock, low_stock_threshold } = req.body;
  if (!name || !unit || wholesale_price === undefined) {
    return res.status(400).json({ error: 'Product name, unit, and wholesale price are required' });
  }
  try {
    const product = db.createProduct({
      name,
      code,
      category: category || 'General Wholesale',
      unit,
      wholesale_price: Number(wholesale_price),
      cost_price: cost_price ? Number(cost_price) : undefined,
      initial_stock: Number(initial_stock || 0),
      low_stock_threshold: Number(low_stock_threshold || 10),
      recorded_by: req.user!,
    });
    return res.status(201).json({ product });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

apiRouter.put('/products/:id', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const updated = db.updateProduct(id, req.body);
  if (!updated) return res.status(404).json({ error: 'Product not found' });
  return res.json({ product: updated });
});

apiRouter.delete('/products/:id', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = db.deleteProduct(id);
  if (!success) return res.status(404).json({ error: 'Product not found' });
  return res.json({ message: 'Product deleted/archived successfully' });
});

// Explicit stock adjustment (Owner only, with audit trail)
apiRouter.post('/products/:id/adjust-stock', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newQuantity, reason } = req.body;
  if (newQuantity === undefined || newQuantity < 0) {
    return res.status(400).json({ error: 'Valid newQuantity is required' });
  }
  try {
    const result = db.adjustStock(id, Number(newQuantity), reason, req.user!);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. CUSTOMERS & CREDIT LEDGER (Stage 4)
// ----------------------------------------------------
apiRouter.get('/customers', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const customers = db.getCustomers(req.user!);
  return res.json({ customers });
});

apiRouter.post('/customers', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, address, opening_balance } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Shopkeeper / Customer name and phone number are required' });
  }
  const customer = db.createCustomer({
    name,
    phone,
    address,
    opening_balance: opening_balance ? Number(opening_balance) : 0,
    recorded_by: req.user!,
  });
  return res.status(201).json({ customer });
});

apiRouter.put('/customers/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, address, credit_balance } = req.body;
  const customer = db.updateCustomer(id, { name, phone, address, credit_balance });
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  return res.json({ customer });
});

apiRouter.delete('/customers/:id', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const success = db.deleteCustomer(id);
  if (!success) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  return res.json({ message: 'Customer deleted successfully' });
});

apiRouter.get('/customers/:id/ledger', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  try {
    const ledger = db.getCustomerLedger(id);
    return res.json(ledger);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

apiRouter.post('/customers/:id/payments', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { amount, paymentMethod, notes } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Valid payment amount is required' });
  }
  try {
    const result = db.recordCustomerPayment({
      customerId: id,
      amount: Number(amount),
      paymentMethod: paymentMethod || 'cash',
      notes,
      recordedBy: req.user!,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. ORDERS & BILLING (Core Workflow)
// ----------------------------------------------------
// Atomic order creation & takeaway billing
apiRouter.post('/orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { customerId, items, paymentType, amountPaidNow, notes } = req.body;
  if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Customer ID and at least one item are required' });
  }

  try {
    const result = db.createOrderTransaction(
      {
        customerId,
        items,
        paymentType: paymentType || 'cash',
        amountPaidNow: amountPaidNow !== undefined ? Number(amountPaidNow) : undefined,
        notes,
      },
      req.user!
    );
    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Salesman's OWN orders only (Strictly scoped via JWT token)
apiRouter.get('/orders/mine', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const orders = db.getOrdersForUser(req.user!);
  return res.json({ orders });
});

// Owner all orders view
apiRouter.get('/orders', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { salesmanId, paymentType, status, search } = req.query;
  const orders = db.getOrdersForUser(req.user!, {
    salesmanId: salesmanId as string,
    paymentType: paymentType as string,
    status: status as string,
    search: search as string,
  });
  return res.json({ orders });
});

// Specific order bill details (Strictly isolated for salesmen)
apiRouter.get('/orders/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const order = db.getOrderByIdScoped(req.user!, id);
  if (!order) {
    // If order belongs to another salesman or does not exist
    return res.status(403).json({ error: 'Forbidden: You do not have permission to access this order.' });
  }
  return res.json({ order });
});

apiRouter.get('/orders/:id/bill', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const order = db.getOrderByIdScoped(req.user!, id);
  if (!order) {
    return res.status(403).json({ error: 'Forbidden: You cannot access or print this bill.' });
  }
  const customer = db.getCustomerById(order.customer_id);
  return res.json({
    bill: {
      order,
      customer,
      items: order.items,
    },
  });
});

// ----------------------------------------------------
// 6. PURCHASES & SUPPLIERS (Stage 5)
// ----------------------------------------------------
apiRouter.get('/suppliers', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const suppliers = db.getAllSuppliers();
  return res.json({ suppliers });
});

apiRouter.post('/suppliers', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { name, phone, email, address, contact_person } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Supplier name and phone are required' });
  }
  const supplier = db.createSupplier({ name, phone, email, address, contact_person });
  return res.status(201).json({ supplier });
});

apiRouter.get('/purchases', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const purchases = db.getAllPurchases();
  return res.json({ purchases });
});

apiRouter.post('/purchases', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { supplierId, items, notes } = req.body;
  if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Supplier and items are required' });
  }
  try {
    const purchase = db.createPurchaseTransaction(
      {
        supplierId,
        items,
        notes,
      },
      req.user!
    );
    return res.status(201).json({ purchase });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. STOCK AUDIT TRAIL
// ----------------------------------------------------
apiRouter.get('/stock-movements', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { productId } = req.query;
  const movements = db.getStockMovements(productId as string);
  return res.json({ movements });
});

// ----------------------------------------------------
// 8. REPORTS (Owner Only - Stage 5)
// ----------------------------------------------------
apiRouter.get('/reports/sales-summary', authenticateToken, requireOwner, (req: AuthenticatedRequest, res: Response) => {
  const { from, to } = req.query;
  const summary = db.getSalesReport(from as string, to as string);
  return res.json(summary);
});

apiRouter.get('/reports/top-products', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const topProducts = db.getTopProductsReport();
  return res.json({ topProducts });
});

apiRouter.get('/reports/outstanding-credit', authenticateToken, requireOwner, (_req: AuthenticatedRequest, res: Response) => {
  const debtors = db.getOutstandingCreditReport();
  return res.json({ debtors });
});

// ----------------------------------------------------
// 9. AUTOMATED ROLE ISOLATION VERIFICATION (Stage 2 Test)
// ----------------------------------------------------
apiRouter.post('/test-role-isolation', async (_req: Request, res: Response) => {
  try {
    // 1. Get Salesman A & Salesman B
    const salesmanA = db.getUserByUsername('rajesh');
    const salesmanB = db.getUserByUsername('vikram');
    if (!salesmanA || !salesmanB) {
      return res.status(500).json({ success: false, error: 'Salesmen seed accounts missing' });
    }

    // 2. Create test order under Salesman A
    const allProds = db.getAllProducts();
    const prod = allProds[0];
    const custs = db.getCustomers(salesmanA);
    const testCust = custs[0];

    const testOrder = db.createOrderTransaction(
      {
        customerId: testCust.id,
        items: [{ productId: prod.id, quantity: 1 }],
        paymentType: 'cash',
        notes: 'Automated Isolation Test Order',
      },
      salesmanA
    );

    // 3. Try to access Salesman A's order as Salesman B
    const accessAttempt = db.getOrderByIdScoped(salesmanB, testOrder.order.id);

    // 4. Salesman B order query
    const salesmanBOrders = db.getOrdersForUser(salesmanB);
    const isLeakPresent = salesmanBOrders.some((o) => o.id === testOrder.order.id);

    const testPassed = accessAttempt === null && !isLeakPresent;

    return res.json({
      success: testPassed,
      testName: 'Salesman Data Isolation Test (Stage 2 Requirement)',
      details: {
        createdOrder: {
          id: testOrder.order.id,
          invoice: testOrder.order.invoice_number,
          ownerSalesman: salesmanA.name,
        },
        directAccessBySalesmanB: accessAttempt === null ? 'BLOCKED (HTTP 403 / Null)' : 'LEAK DETECTED',
        listQueryLeakCheck: isLeakPresent ? 'FAILED (Order leaked in list)' : 'PASSED (Zero leaks)',
        verdict: testPassed
          ? 'VERIFIED: Salesman B cannot read Salesman A orders either by direct ID lookup or via list queries.'
          : 'FAILED: Isolation breach detected.',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
