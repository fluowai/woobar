import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import { Users, History, Ticket, CreditCard, ShoppingBag } from 'lucide-react';

export default function CRM() {
  const { tenantId } = useTenant();
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [history, setHistory] = useState<any>({ orders: [], tickets: [], wallet: [] });

  useEffect(() => {
    if (!tenantId) return;
    const fetchCustomers = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('role', 'customer');
      setCustomers(data || []);
    };
    fetchCustomers();
  }, [tenantId]);

  const loadHistory = async (customerId: string) => {
    // Mocking consolidated fetch
    const { data: orders } = await supabase.from('orders').select('*').eq('customer_id', customerId);
    const { data: tickets } = await supabase.from('sold_items').select('*').eq('user_id', customerId);
    const { data: wallet } = await supabase.from('cashless_wallets').select('*').eq('user_id', customerId);
    
    setHistory({ orders: orders || [], tickets: tickets || [], wallet: wallet || [] });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="text-blue-600" /> CRM 360 Client Intelligence
          </h1>
          <p className="text-slate-500">View customer behavior, history and loyalty across all modules.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700">Customers</div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCustomer(c); loadHistory(c.id); }}
                  className={`w-full p-4 text-left hover:bg-blue-50 transition-colors ${selectedCustomer?.id === c.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}
                >
                  <p className="font-bold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.email}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            {selectedCustomer ? (
              <>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                      {selectedCustomer.name[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900">{selectedCustomer.name}</h2>
                      <p className="text-slate-500">{selectedCustomer.email} • Member since {new Date(selectedCustomer.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total Spent</p>
                      <p className="text-2xl font-black text-slate-900">R$ 1.250,00</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Visits</p>
                      <p className="text-2xl font-black text-slate-900">12</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Loyalty Points</p>
                      <p className="text-2xl font-black text-blue-600">450 pts</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><History size={18} /> Order History</h3>
                    <div className="space-y-3">
                      {history.orders.length > 0 ? history.orders.map((o: any) => (
                        <div key={o.id} className="text-sm p-3 bg-slate-50 rounded border border-slate-100 flex justify-between">
                          <span>{new Date(o.created_at).toLocaleDateString()}</span>
                          <span className="font-bold">R$ {o.total.toFixed(2)}</span>
                        </div>
                      )) : <p className="text-slate-400 text-sm">No orders found.</p>}
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><Ticket size={18} /> Tickets & Events</h3>
                    <div className="space-y-3">
                      {history.tickets.length > 0 ? history.tickets.map((t: any) => (
                        <div key={t.id} className="text-sm p-3 bg-slate-50 rounded border border-slate-100 flex justify-between">
                          <span>{t.item_name}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${t.status === 'used' ? 'bg-slate-200' : 'bg-green-100 text-green-700'}`}>
                            {t.status.toUpperCase()}
                          </span>
                        </div>
                      )) : <p className="text-slate-400 text-sm">No tickets found.</p>}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white h-[400px] rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                <Users size={48} className="mb-4 opacity-20" />
                <p>Select a customer to view their 360° profile</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
