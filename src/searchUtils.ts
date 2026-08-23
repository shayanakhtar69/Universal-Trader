import { Customer, Product, Order, Supplier } from './types';

/**
 * Robust multi-token, case-insensitive, space-tolerant search matcher for shopkeepers/customers.
 * Supports:
 * - Search by store name: "saleem", "drink corner", "saleem corner"
 * - Search by owner name in parenthesis: "Haji", "saleem super"
 * - Search by phone number (with or without dashes, spaces, +92 etc.): "0300", "0300123"
 * - Search by address / market location: "market", "shop 12"
 */
export function searchMatchesCustomer(customer: Customer, search: string): boolean {
  if (!search || !search.trim()) return true;
  if (!customer) return false;

  const cleanQuery = search.trim().toLowerCase();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const name = (customer.name || '').toLowerCase();
  const phone = (customer.phone || '').toLowerCase();
  const phoneDigits = phone.replace(/\D/g, '');
  const address = (customer.address || '').toLowerCase();
  const creditBalance = String(customer.credit_balance || 0);

  const searchableString = `${name} ${phone} ${phoneDigits} ${address} ${creditBalance}`.toLowerCase();

  return queryTokens.every((token) => {
    const tokenDigits = token.replace(/\D/g, '');
    if (tokenDigits.length >= 3 && phoneDigits.includes(tokenDigits)) {
      return true;
    }
    return searchableString.includes(token);
  });
}

/**
 * Robust multi-token, space-tolerant search matcher for products.
 */
export function searchMatchesProduct(product: Product, search: string): boolean {
  if (!search || !search.trim()) return true;
  if (!product) return false;

  const cleanQuery = search.trim().toLowerCase();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const name = (product.name || '').toLowerCase();
  const code = (product.code || '').toLowerCase();
  const category = (product.category || '').toLowerCase();
  const unit = (product.unit || '').replace(/_/g, ' ').toLowerCase();

  const searchableString = `${name} ${code} ${category} ${unit}`.toLowerCase();

  return queryTokens.every((token) => searchableString.includes(token));
}

/**
 * Robust multi-token search for orders (invoice number, customer name, salesman name).
 */
export function searchMatchesOrder(order: Order, search: string): boolean {
  if (!search || !search.trim()) return true;
  if (!order) return false;

  const cleanQuery = search.trim().toLowerCase();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const invoice = (order.invoice_number || '').toLowerCase();
  const customerName = (order.customer_name || '').toLowerCase();
  const salesmanName = (order.salesman_name || '').toLowerCase();
  const paymentType = (order.payment_type || '').toLowerCase();
  const status = (order.status || '').toLowerCase();

  const searchableString = `${invoice} ${customerName} ${salesmanName} ${paymentType} ${status}`.toLowerCase();

  return queryTokens.every((token) => searchableString.includes(token));
}

/**
 * Robust search for suppliers.
 */
export function searchMatchesSupplier(supplier: Supplier, search: string): boolean {
  if (!search || !search.trim()) return true;
  if (!supplier) return false;

  const cleanQuery = search.trim().toLowerCase();
  const queryTokens = cleanQuery.split(/\s+/).filter(Boolean);

  const name = (supplier.name || '').toLowerCase();
  const contact = (supplier.contact_person || '').toLowerCase();
  const phone = (supplier.phone || '').toLowerCase();
  const phoneDigits = phone.replace(/\D/g, '');
  const address = (supplier.address || '').toLowerCase();

  const searchableString = `${name} ${contact} ${phone} ${phoneDigits} ${address}`.toLowerCase();

  return queryTokens.every((token) => {
    const tokenDigits = token.replace(/\D/g, '');
    if (tokenDigits.length >= 3 && phoneDigits.includes(tokenDigits)) {
      return true;
    }
    return searchableString.includes(token);
  });
}
