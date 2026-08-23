// Shared design tokens matching Clean Minimalism specifications
export const THEME = {
  colors: {
    inkNavy: '#1F2B3A',
    registerWhite: '#EEF0EC',
    mustard: '#D9A441',
    bazaarGreen: '#3F7D58',
    chalkRed: '#C1443C',
    slate: '#55606B',
    paperLight: '#F7F8F5',
    paperDark: '#E4E7E1',
    border: '#D8DDD4',
  },
  fonts: {
    display: "'Roboto Slab', Georgia, serif",
    sans: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'IBM Plex Mono', monospace",
  },
  shopInfo: {
    name: 'UNIVERSAL TRADER',
    tagline: 'Wholesale Provision, Spices, Pulses & Grain Merchants',
    address: 'Shop No. 42-45, Grain Market, Wholesale Complex',
    phone: '+92 300 1234567 / 042-37654321',
    ntn: 'NTN: 8492018-4',
    gstin: 'NTN: 8492018-4',
    currency: 'PKR',
    currencySymbol: 'Rs.',
    terms: 'Goods once sold will not be taken back. Payment due within agreed terms.',
  },
};

export function formatCurrency(amount: number): string {
  const formatted = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount || 0);
  return `Rs. ${formatted}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-PK').format(num || 0);
}

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateString;
  }
}

export function formatShortDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  } catch {
    return dateString;
  }
}
