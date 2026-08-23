export type UserRole = 'owner' | 'salesman';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  phone?: string;
  active: boolean;
  access_token?: string;
  google_id?: string;
  avatar_url?: string;
  created_at: string;
  today_sales?: number;
  total_sales?: number;
  orders_count?: number;
}

export type UnitType = 'carton' | 'box' | 'dozen' | 'bag_50kg' | 'bag_25kg' | 'kg' | 'liter' | 'packet' | 'tin' | 'piece';

export interface Product {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: UnitType;
  wholesale_price: number;
  cost_price?: number;
  current_stock: number;
  low_stock_threshold: number;
  is_deleted?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  credit_balance: number; // Positive means customer owes money
  created_by_salesman_id?: string;
  created_by_salesman_name?: string;
  last_order_date?: string;
  total_orders_count?: number;
  created_at: string;
  updated_at: string;
}

export type PaymentType = 'cash' | 'credit' | 'partial';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit: UnitType;
  quantity: number;
  price_at_sale: number;
  total_line: number;
}

export interface Order {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  salesman_id: string;
  salesman_name: string;
  status: 'paid' | 'credit' | 'partial';
  payment_type: PaymentType;
  total_amount: number;
  amount_paid: number;
  remaining_balance: number;
  is_takeaway: boolean;
  items_count: number;
  items?: OrderItem[];
  notes?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  payment_number: string;
  customer_id: string;
  customer_name: string;
  order_id?: string;
  order_invoice_number?: string;
  amount: number;
  payment_method: 'cash' | 'upi' | 'cheque' | 'bank_transfer';
  notes?: string;
  recorded_by_id: string;
  recorded_by_name: string;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  contact_person?: string;
  created_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product_name: string;
  unit: UnitType;
  quantity: number;
  cost_price: number;
  total_line: number;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name: string;
  total_cost: number;
  recorded_by_id: string;
  recorded_by_name: string;
  items_count: number;
  items?: PurchaseItem[];
  notes?: string;
  created_at: string;
}

export type StockMovementReason = 'sale' | 'purchase' | 'adjustment';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  unit: UnitType;
  change_amount: number; // negative for sales, positive for purchase/increase
  reason: StockMovementReason;
  reference_id: string;
  reference_number: string;
  previous_stock: number;
  new_stock: number;
  recorded_by_id: string;
  recorded_by_name: string;
  notes?: string;
  created_at: string;
}

export interface CustomerLedgerEntry {
  id: string;
  date: string;
  type: 'order_credit' | 'order_partial' | 'payment_received' | 'order_paid';
  reference_id: string;
  reference_no: string;
  description: string;
  debit: number; // Increases amount owed by customer (e.g. unpaid order)
  credit: number; // Reduces amount owed by customer (e.g. payment made)
  running_balance: number;
  recorded_by_name: string;
}

export interface SalesReportSummary {
  total_revenue: number;
  total_orders: number;
  total_cash_collected: number;
  total_credit_extended: number;
  sales_by_salesman: {
    salesman_id: string;
    salesman_name: string;
    total_sales: number;
    orders_count: number;
  }[];
  sales_by_day: {
    date: string;
    day_name: string;
    total_sales: number;
    orders_count: number;
    cash: number;
    credit: number;
  }[];
}

export interface TopProductReport {
  product_id: string;
  product_name: string;
  unit: UnitType;
  units_sold: number;
  total_revenue: number;
}

export interface ShopProfile {
  name: string;
  tagline: string;
  ownerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  ntn: string;
  currency: string;
  currencySymbol: string;
  terms: string;
}

export interface OutstandingCreditCustomer {
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  credit_balance: number;
  last_payment_date?: string;
  days_overdue?: number;
}
