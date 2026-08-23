import React, { useState } from 'react';
import { api } from '../api';
import { ShieldCheck, ShieldAlert, Play, CheckCircle2, XCircle, RefreshCw, Lock } from 'lucide-react';

export const RoleIsolationTester: React.FC = () => {
  const [running, setRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runTest = async () => {
    try {
      setRunning(true);
      setError(null);
      const res = await api.testRoleIsolation();
      setTestResult(res);
    } catch (err: any) {
      setError(err.message || 'Test execution failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#1F2B3A] p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8DDD4] pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#D9A441]" />
            <h3 className="font-display font-bold text-base text-[#1F2B3A]">
              Stage 2 Role Isolation & Data Boundary Verifier
            </h3>
          </div>
          <p className="text-xs text-[#55606B] font-mono mt-0.5">
            Automated backend verification ensuring Salesman B can never read or query Salesman A's orders.
          </p>
        </div>

        <button
          id="btn-run-isolation-test"
          onClick={runTest}
          disabled={running}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-[#1F2B3A] hover:bg-slate-800 text-white font-mono text-xs font-bold rounded transition shrink-0 shadow-sm"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-[#D9A441]" />}
          <span>{running ? 'Executing DB Test...' : 'Run Role Isolation Test'}</span>
        </button>
      </div>

      {/* Security Architecture Explainer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs font-mono">
        <div className="bg-[#EEF0EC] p-3 border border-[#D8DDD4] rounded">
          <span className="font-bold text-[#1F2B3A] block mb-1">1. JWT Injected Scoping</span>
          <p className="text-[11px] text-[#55606B]">
            Salesman user_id is extracted strictly from the verified JWT server-side, completely ignoring any client request overrides.
          </p>
        </div>
        <div className="bg-[#EEF0EC] p-3 border border-[#D8DDD4] rounded">
          <span className="font-bold text-[#1F2B3A] block mb-1">2. Database-Level Filters</span>
          <p className="text-[11px] text-[#55606B]">
            All queries automatically enforce <code className="bg-white px-1 border border-slate-300">WHERE salesman_id = auth.user.id</code> before data serialization.
          </p>
        </div>
        <div className="bg-[#EEF0EC] p-3 border border-[#D8DDD4] rounded">
          <span className="font-bold text-[#1F2B3A] block mb-1">3. Direct ID Lookups Blocked</span>
          <p className="text-[11px] text-[#55606B]">
            Attempting to access <code className="bg-white px-1 border border-slate-300">/orders/:id</code> belonging to another salesman instantly triggers HTTP 403 Forbidden.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-[#C1443C]/10 border border-[#C1443C] p-3 text-xs font-mono text-[#C1443C] flex items-center gap-2 mb-4">
          <XCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {testResult && (
        <div
          className={`border-2 p-4 font-mono text-xs ${
            testResult.success
              ? 'bg-[#3F7D58]/10 border-[#3F7D58] text-[#1F2B3A]'
              : 'bg-[#C1443C]/10 border-[#C1443C] text-[#C1443C]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm mb-3">
            {testResult.success ? (
              <ShieldCheck className="w-5 h-5 text-[#3F7D58]" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-[#C1443C]" />
            )}
            <span>{testResult.details.verdict}</span>
          </div>

          <div className="bg-white p-3 border border-[#D8DDD4] rounded space-y-2 text-[11px]">
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-[#55606B]">Test Order Created Under:</span>
              <span className="font-bold text-[#1F2B3A]">
                {testResult.details.createdOrder.ownerSalesman} (Invoice #{testResult.details.createdOrder.invoice})
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1">
              <span className="text-[#55606B]">Direct Access by Salesman B (/orders/{testResult.details.createdOrder.id}):</span>
              <span className="font-bold text-[#3F7D58]">
                {testResult.details.directAccessBySalesmanB}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#55606B]">List Scoping Query (/orders/mine as Salesman B):</span>
              <span className="font-bold text-[#3F7D58]">
                {testResult.details.listQueryLeakCheck}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
