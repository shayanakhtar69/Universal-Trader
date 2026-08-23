import React from 'react';
import { Order, Customer } from '../types';
import { THEME, formatCurrency, formatDate } from '../theme';
import { Printer, Share2, Copy, Check, Download, ArrowLeft, Store } from 'lucide-react';

interface BillReceiptProps {
  order: Order;
  customer?: Customer | null;
  onClose?: () => void;
  showBack?: boolean;
}

export const BillReceipt: React.FC<BillReceiptProps> = ({
  order,
  customer,
  onClose,
  showBack = true,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const itemsText = order.items
      ?.map(
        (i, idx) =>
          `${idx + 1}. ${i.product_name} (${i.quantity} ${i.unit}) @ Rs.${i.price_at_sale} = Rs.${i.total_line}`
      )
      .join('\n');

    const message = `*${THEME.shopInfo.name}*
*Wholesale Bill: ${order.invoice_number}*
Date: ${formatDate(order.created_at)}
Customer: ${order.customer_name} (${order.customer_phone})
Served by: ${order.salesman_name}

*ITEMS:*
${itemsText}

----------------------------
*Total Amount: Rs. ${order.total_amount.toLocaleString('en-PK')}*
*Amount Paid: Rs. ${order.amount_paid.toLocaleString('en-PK')}*
*Balance Due: Rs. ${order.remaining_balance.toLocaleString('en-PK')}*
Payment Status: ${order.status.toUpperCase()}
----------------------------
Thank you for your business!`;

    const cleanPhone = (customer?.phone || order.customer_phone).replace(/[^0-9]/g, '');
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone.startsWith('92') ? cleanPhone : (cleanPhone.startsWith('0') ? '92' + cleanPhone.slice(1) : '92' + cleanPhone)}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleCopy = () => {
    const summary = `${THEME.shopInfo.name} | Bill: ${order.invoice_number} | Customer: ${order.customer_name} | Total: Rs.${order.total_amount} | Paid: Rs.${order.amount_paid} | Balance: Rs.${order.remaining_balance}`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPaid = order.status === 'paid';
  const isCredit = order.status === 'credit';
  const isPartial = order.status === 'partial';

  return (
    <div id="printable-bill-wrapper" className="flex flex-col items-center w-full max-w-xl mx-auto my-2">
      {/* Actions Toolbar - Hidden in Print */}
      <div className="w-full flex items-center justify-between gap-2 mb-3 px-1 print:hidden">
        {showBack && onClose && (
          <button
            id="bill-btn-back"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1F2B3A] text-[#EEF0EC] hover:bg-[#1F2B3A]/90 text-sm font-medium rounded transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            id="bill-btn-copy"
            onClick={handleCopy}
            title="Copy Bill Summary"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-[#D8DDD4] text-[#1F2B3A] hover:bg-slate-50 text-xs font-mono font-medium rounded shadow-sm transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#55606B]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            id="bill-btn-whatsapp"
            onClick={handleWhatsAppShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#3F7D58] hover:bg-[#3F7D58]/90 text-white text-xs font-semibold rounded shadow-sm transition"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            id="bill-btn-print"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#D9A441] hover:bg-[#D9A441]/90 text-[#1F2B3A] text-xs font-bold rounded shadow-sm transition"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Bill</span>
          </button>
        </div>
      </div>

      {/* Carbon Copy Bill Pad Visual Container */}
      <div
        id="printable-bill"
        className="w-full bg-white text-[#1F2B3A] border border-black/10 ledger-bill p-6 sm:p-8 relative font-sans"
        style={{
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
        }}
      >
        {/* Top Header / Shop Title */}
        <div className="flex justify-between items-start mb-4 border-b border-black/10 pb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <Store className="w-4 h-4 text-[#D9A441]" />
              <h1 className="slab text-xl sm:text-2xl leading-tight text-[#1F2B3A]">
                {THEME.shopInfo.name}
              </h1>
            </div>
            <p className="text-[10px] uppercase font-mono tracking-widest text-[#55606B] mt-0.5">
              {THEME.shopInfo.tagline}
            </p>
            <p className="text-[11px] text-[#55606B] mt-0.5 leading-tight">
              {THEME.shopInfo.address}
            </p>
            <p className="text-[10px] text-[#55606B] font-mono mt-0.5">
              Ph: {THEME.shopInfo.phone} | GSTIN: {THEME.shopInfo.gstin}
            </p>
          </div>

          <div className="text-right">
            <p className="mono text-xs font-bold text-[#1F2B3A]">
              #{order.invoice_number}
            </p>
            <p className="mono text-[10px] text-[#55606B] mt-0.5">
              {formatDate(order.created_at)}
            </p>
            <div className="inline-block mt-1 px-2 py-0.5 bg-[#1F2B3A] text-white text-[9px] font-mono font-bold uppercase rounded">
              TAKEAWAY ORDER
            </div>
          </div>
        </div>

        {/* Customer & Counter Salesman Info */}
        <div className="border-y border-black/10 py-2.5 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="font-bold uppercase text-[10px] text-[#55606B] font-mono">CUST:</span>
              <span className="font-bold text-[#1F2B3A]">{order.customer_name}</span>
            </div>
            <div className="text-[10px] font-mono text-[#55606B] pl-10">Ph: {order.customer_phone}</div>
          </div>
          <div className="sm:text-right text-[11px]">
            <span className="font-bold uppercase text-[10px] text-[#55606B] font-mono">SALESMAN: </span>
            <span className="font-medium text-[#1F2B3A]">{order.salesman_name}</span>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-4">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-t border-black/10 bg-[#EEF0EC]/60 text-[#1F2B3A] font-mono text-[10px] uppercase tracking-wider">
                <th className="py-2 px-2 text-left w-6">#</th>
                <th className="py-2 px-2 text-left">ITEM PARTICULARS</th>
                <th className="py-2 px-2 text-right">QTY</th>
                <th className="py-2 px-2 text-right">RATE (Rs.)</th>
                <th className="py-2 px-2 text-right">TOTAL (Rs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 font-mono text-xs">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-[#EEF0EC]/30">
                    <td className="py-2 px-2 text-left text-[#55606B]">{idx + 1}</td>
                    <td className="py-2 px-2 text-left font-sans font-medium text-[#1F2B3A]">
                      <div>{item.product_name}</div>
                      <span className="text-[10px] font-mono text-[#55606B] capitalize">
                        Unit: {item.unit.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-[#1F2B3A]">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-2 text-right text-[#55606B]">
                      {item.price_at_sale.toFixed(2)}
                    </td>
                    <td className="py-2 px-2 text-right font-bold text-[#1F2B3A]">
                      {item.total_line.toFixed(2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[#55606B]">
                    No items in record
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals & Signature Stamps Section */}
        <div className="border-t-2 border-black/10 pt-3 relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Rubber Stamp mark */}
            <div className="flex justify-center sm:justify-start items-center py-3">
              {isPaid && (
                <div
                  id="stamp-paid"
                  className="stamp border-[#3F7D58] text-[#3F7D58] bg-[#3F7D58]/10 text-center"
                >
                  <div className="text-sm font-extrabold tracking-widest leading-none">PAID IN FULL</div>
                  <div className="text-[8px] tracking-wider font-mono mt-0.5 font-bold">CASH RECEIVED</div>
                </div>
              )}

              {isCredit && (
                <div
                  id="stamp-credit"
                  className="stamp border-[#C1443C] text-[#C1443C] bg-[#C1443C]/10 text-center"
                >
                  <div className="text-sm font-extrabold tracking-widest leading-none">CREDIT DUE</div>
                  <div className="text-[9px] tracking-wider font-mono mt-0.5 font-bold">
                    DUE: Rs. {order.remaining_balance.toFixed(2)}
                  </div>
                </div>
              )}

              {isPartial && (
                <div
                  id="stamp-partial"
                  className="stamp border-[#C1443C] text-[#C1443C] bg-[#C1443C]/10 text-center"
                >
                  <div className="text-sm font-extrabold tracking-widest leading-none">PARTIAL PAYMENT</div>
                  <div className="text-[8px] tracking-wider font-mono mt-0.5 font-bold">
                    BAL: Rs. {order.remaining_balance.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="bg-[#EEF0EC]/60 border border-black/10 p-3 rounded font-mono text-xs space-y-1.5">
              <div className="flex justify-between items-center text-[#55606B]">
                <span>BILL TOTAL:</span>
                <span className="font-bold text-[#1F2B3A] text-sm">
                  Rs. {order.total_amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[#55606B]">
                <span>CASH PAID:</span>
                <span className="font-bold text-[#3F7D58]">
                  Rs. {order.amount_paid.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-black/10 pt-1.5 flex justify-between items-center font-bold">
                <span className={order.remaining_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'}>
                  {order.remaining_balance > 0 ? 'LEDGER BALANCE DUE:' : 'AMOUNT DUE:'}
                </span>
                <span className={`text-sm ${order.remaining_balance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'}`}>
                  Rs. {order.remaining_balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Terms */}
        <div className="mt-6 pt-3 border-t border-dashed border-black/20 text-[9px] text-[#55606B] flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-center sm:text-left max-w-xs">
            <p className="italic opacity-70">{THEME.shopInfo.terms}</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="font-mono font-semibold opacity-80">
              For {THEME.shopInfo.name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
