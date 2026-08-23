import React, { useEffect, useState } from 'react';
import { Customer, CustomerLedgerEntry, Payment } from '../types';
import { api } from '../api';
import { THEME, formatCurrency, formatDate } from '../theme';
import { X, PlusCircle, CheckCircle2, History, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface CustomerLedgerModalProps {
  customer: Customer;
  onClose: () => void;
  onPaymentRecorded?: () => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  onClose,
  onPaymentRecorded,
}) => {
  const [ledgerEntries, setLedgerEntries] = useState<CustomerLedgerEntry[]>([]);
  const [calculatedBalance, setCalculatedBalance] = useState(customer.credit_balance);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'cheque' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState<string | null>(null);

  const loadLedger = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomerLedger(customer.id);
      setLedgerEntries(data.entries);
      setCalculatedBalance(data.calculatedBalance);
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [customer.id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid positive payment amount.');
      return;
    }

    try {
      setSubmittingPayment(true);
      const res = await api.recordPayment(customer.id, amount, paymentMethod, paymentNotes);
      setPaymentSuccess(`Payment of Rs. ${amount.toLocaleString('en-PK')} recorded successfully!`);
      setPaymentAmount('');
      setPaymentNotes('');
      setShowPaymentForm(false);
      await loadLedger();
      if (onPaymentRecorded) onPaymentRecorded();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-[#FCFDF9] text-[#1F2B3A] border-2 border-[#1F2B3A] w-full max-w-3xl rounded-none shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#1F2B3A] text-[#EEF0EC] p-4 flex items-center justify-between border-b border-[#1F2B3A]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#D9A441]" />
            <div>
              <h2 className="font-display font-bold text-lg text-white">
                Customer Khata / Ledger Statement
              </h2>
              <p className="text-xs text-slate-300 font-mono">
                {customer.name} • Ph: {customer.phone}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Balance Summary Bar */}
        <div className="bg-[#EEF0EC] border-b border-[#D8DDD4] p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <span className="text-[11px] uppercase font-mono text-[#55606B] block">Current Running Balance</span>
            <div
              className={`font-mono text-xl sm:text-2xl font-bold ${
                calculatedBalance > 0 ? 'text-[#C1443C]' : 'text-[#3F7D58]'
              }`}
            >
              Rs. {calculatedBalance.toLocaleString('en-PK')}
              <span className="text-xs ml-1.5 font-normal text-[#55606B]">
                {calculatedBalance > 0 ? '(Owed to Shop)' : '(All Settled)'}
              </span>
            </div>
          </div>

          <div className="text-xs text-[#55606B] font-mono">
            <div>Address: <span className="text-[#1F2B3A]">{customer.address || 'Walk-in'}</span></div>
            <div>Account Created: <span className="text-[#1F2B3A]">{formatDate(customer.created_at)}</span></div>
          </div>

          <div className="sm:text-right">
            {!showPaymentForm && (
              <button
                id="btn-open-payment-form"
                onClick={() => setShowPaymentForm(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#3F7D58] hover:bg-[#3F7D58]/90 text-white text-xs font-bold font-mono uppercase tracking-wider rounded transition shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Receive Payment</span>
              </button>
            )}
          </div>
        </div>

        {/* Payment Form Expansion */}
        {showPaymentForm && (
          <form
            onSubmit={handleRecordPayment}
            className="bg-[#E7EBE4] border-b-2 border-[#D9A441] p-4 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-xs font-mono uppercase text-[#1F2B3A] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#3F7D58]" />
                Record Cash/Bank Payment Against Ledger
              </span>
              <button
                type="button"
                onClick={() => setShowPaymentForm(false)}
                className="text-xs text-[#55606B] hover:text-[#1F2B3A] font-mono underline"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-mono text-[#55606B] block mb-1">
                  Amount Received (Rs.)*
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={calculatedBalance > 0 ? calculatedBalance * 2 : 1000000}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`e.g. ${calculatedBalance || 5000}`}
                  className="w-full bg-white border border-[#55606B] px-3 py-1.5 text-sm font-mono font-bold text-[#1F2B3A] rounded focus:ring-1 focus:ring-[#D9A441] outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#55606B] block mb-1">
                  Payment Method*
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e: any) => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-[#55606B] px-3 py-1.5 text-xs font-mono text-[#1F2B3A] rounded outline-hidden"
                >
                  <option value="cash">Cash Counter</option>
                  <option value="upi">JazzCash / EasyPaisa / Raast</option>
                  <option value="bank_transfer">Bank Online Transfer / IBFT</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#55606B] block mb-1">
                  Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Raast Ref #9042"
                  className="w-full bg-white border border-[#55606B] px-3 py-1.5 text-xs font-sans text-[#1F2B3A] rounded outline-hidden"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <button
                type="submit"
                disabled={submittingPayment}
                className="px-4 py-1.5 bg-[#3F7D58] hover:bg-[#3F7D58]/90 text-white font-mono font-bold text-xs rounded transition shadow-sm"
              >
                {submittingPayment ? 'Recording...' : 'Submit Payment Voucher'}
              </button>
            </div>
          </form>
        )}

        {paymentSuccess && (
          <div className="bg-[#3F7D58]/15 border-b border-[#3F7D58] px-4 py-2 text-xs font-mono text-[#3F7D58] font-bold">
            ✓ {paymentSuccess}
          </div>
        )}

        {/* Ledger Transactions Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#55606B]">
              Detailed Ledger Activity (Debits & Credits)
            </span>
            <span className="text-[11px] font-mono text-[#55606B]">
              {ledgerEntries.length} Records Found
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm font-mono text-[#55606B]">
              Loading ledger statement...
            </div>
          ) : error ? (
            <div className="py-8 text-center text-sm text-[#C1443C] font-mono">
              <AlertCircle className="w-5 h-5 mx-auto mb-1" />
              {error}
            </div>
          ) : ledgerEntries.length === 0 ? (
            <div className="py-12 text-center text-sm font-mono text-[#55606B] bg-[#EEF0EC] border border-dashed border-[#D8DDD4]">
              No past bills or payments recorded for this customer.
            </div>
          ) : (
            <div className="border border-[#1F2B3A] overflow-x-auto">
              <table className="w-full text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#EEF0EC] border-b border-[#1F2B3A] text-[#1F2B3A]">
                    <th className="py-2 px-2 text-left">Date</th>
                    <th className="py-2 px-2 text-left">Voucher / Ref #</th>
                    <th className="py-2 px-2 text-left">Description</th>
                    <th className="py-2 px-2 text-right text-[#C1443C]">Debit (+)</th>
                    <th className="py-2 px-2 text-right text-[#3F7D58]">Credit (-)</th>
                    <th className="py-2 px-2 text-right font-bold">Balance</th>
                    <th className="py-2 px-2 text-left">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DDD4] bg-white">
                  {ledgerEntries.map((entry) => {
                    const isDebit = entry.debit > 0;
                    return (
                      <tr key={entry.id} className="hover:bg-amber-50/50">
                        <td className="py-2 px-2 text-[#55606B] whitespace-nowrap">
                          {formatDate(entry.date)}
                        </td>
                        <td className="py-2 px-2 font-bold text-[#1F2B3A] whitespace-nowrap">
                          {entry.reference_no}
                        </td>
                        <td className="py-2 px-2 font-sans font-medium text-[#1F2B3A]">
                          {entry.description}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[#C1443C]">
                          {entry.debit > 0 ? `Rs. ${entry.debit.toLocaleString('en-PK')}` : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[#3F7D58]">
                          {entry.credit > 0 ? `Rs. ${entry.credit.toLocaleString('en-PK')}` : '-'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-[#1F2B3A]">
                          Rs. {entry.running_balance.toLocaleString('en-PK')}
                        </td>
                        <td className="py-2 px-2 text-[#55606B] text-[11px] whitespace-nowrap">
                          {entry.recorded_by_name}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-[#EEF0EC] border-t border-[#1F2B3A] p-3 flex justify-between items-center text-xs font-mono">
          <span className="text-[#55606B]">
            All transactions are audit-logged and verifiable against physical counter bills.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1F2B3A] text-white hover:bg-[#1F2B3A]/90 font-mono text-xs rounded transition"
          >
            Close Statement
          </button>
        </div>
      </div>
    </div>
  );
};
