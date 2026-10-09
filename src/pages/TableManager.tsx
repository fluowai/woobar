import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Coffee, Clock, DollarSign, X, Plus, Loader2, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type TableStatus = 'free' | 'occupied' | 'reserved' | 'dirty';
type Table = { id: string; name: string; seats: number; status: TableStatus };

export default function TableManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<Table | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [payment, setPayment] = useState('pix');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [tableData, orderData, productData] = await Promise.all([api.getTables(), api.getTableOrders(), api.getProducts()]);
      setTables(tableData); setOpenOrders(orderData); setProducts(productData); setError('');
    } catch (e: any) { setError(e.message || 'Falha ao carregar mesas.'); }
  };
  useEffect(() => { load(); }, []);

  const orderByTable = useMemo(() => new Map(openOrders.map(o => [o.table_id, o])), [openOrders]);
  const currentOrder = selected ? orderByTable.get(selected.id) : null;

  const selectTable = async (table: Table) => {
    setSelected(table); setDetail(null); setShowProducts(false);
    const order = orderByTable.get(table.id);
    if (order) { try { setDetail(await api.getTableOrder(order.id)); } catch {} }
  };

  const openTable = async () => {
    if (!selected) return; setBusy(true);
    try { const order = await api.createTableOrder({ table_id: selected.id }); await load(); setDetail(await api.getTableOrder(order.id)); setSelected({ ...selected, status: 'occupied' }); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const addItem = async (product: any) => {
    const order = currentOrder || orderByTable.get(selected?.id); if (!order) return;
    setBusy(true);
    try { await api.addTableOrderItem(order.id, { product_id: product.id, product_name: product.name, quantity: 1, price: Number(product.price) }); setDetail(await api.getTableOrder(order.id)); await load(); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const closeAccount = async () => {
    const order = currentOrder || orderByTable.get(selected?.id); if (!order) return;
    setBusy(true);
    try { await api.closeTableOrder(order.id, payment); await load(); setSelected(null); setDetail(null); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const releaseTable = async () => {
    if (!selected) return; setBusy(true);
    try { await api.updateTableStatus(selected.id, 'free'); await load(); setSelected(null); }
    catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };

  const statusColors: Record<TableStatus, string> = { free: 'bg-emerald-50 text-emerald-700 border-emerald-200', occupied: 'bg-orange-50 text-orange-700 border-orange-200', reserved: 'bg-blue-50 text-blue-700 border-blue-200', dirty: 'bg-red-50 text-red-700 border-red-200' };
  const labels: Record<TableStatus, string> = { free: 'Livre', occupied: 'Ocupada', reserved: 'Reservada', dirty: 'Limpeza' };

  return <div className="space-y-5">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
      <div><h1 className="text-2xl md:text-3xl font-bold">Gestao de Mesas</h1><p className="text-stone-500">Comandas reais, cozinha e fechamento de conta integrados.</p></div>
      <div className="flex gap-3 overflow-x-auto pb-1">{Object.entries(labels).map(([key,label]) => <div key={key} className="flex items-center gap-2 whitespace-nowrap text-sm"><span className={cn('w-3 h-3 rounded-full', key==='free'?'bg-emerald-500':key==='occupied'?'bg-orange-500':key==='reserved'?'bg-blue-500':'bg-red-500')} />{label}</div>)}</div>
    </div>
    {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm">{error}</div>}
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
      {tables.map(table => { const order = orderByTable.get(table.id); return <motion.button key={table.id} layout onClick={() => selectTable(table)} className={cn('relative min-h-36 md:aspect-square p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-center shadow-sm active:scale-95', statusColors[table.status], table.status==='free'&&'border-dashed')}>
        <span className="absolute top-3 right-3 text-[10px] font-bold opacity-60">{table.seats} lug.</span><div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white/70 flex items-center justify-center text-xl font-bold">{table.name.replace(/\D/g,'') || table.name.slice(0,2)}</div><strong className="text-sm uppercase">{table.name}</strong><span className="text-xs">{labels[table.status]}</span>{order && <span className="font-mono font-bold">R$ {Number(order.total).toFixed(2)}</span>}
      </motion.button>; })}
    </div>

    <AnimatePresence>{selected && <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center md:p-4" onClick={() => setSelected(null)}><motion.div initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}} onClick={e=>e.stopPropagation()} className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
      <div className={cn('p-5 md:p-6 flex justify-between', statusColors[selected.status])}><div><h2 className="text-2xl font-bold">{selected.name}</h2><p className="flex items-center gap-2 text-sm"><Users className="w-4 h-4" />{selected.seats} lugares · {labels[selected.status]}</p></div><button onClick={()=>setSelected(null)} className="p-2"><X /></button></div>
      <div className="p-4 md:p-6 space-y-5">
        {selected.status==='free' && <button disabled={busy} onClick={openTable} className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold">{busy?'Abrindo...':'Abrir mesa e comanda'}</button>}
        {selected.status==='dirty' && <button disabled={busy} onClick={releaseTable} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex justify-center gap-2"><Sparkles className="w-5 h-5" />Liberar mesa apos limpeza</button>}
        {selected.status==='occupied' && <>
          <div className="flex gap-3"><button onClick={()=>setShowProducts(!showProducts)} className="flex-1 p-3 md:p-4 rounded-xl bg-stone-100 font-bold flex items-center justify-center gap-2"><Coffee className="w-5 h-5" />Adicionar pedido</button></div>
          {showProducts && <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-2xl p-2">{products.map(p=><button disabled={busy} key={p.id} onClick={()=>addItem(p)} className="p-3 text-left rounded-xl hover:bg-orange-50 border border-stone-100 flex justify-between gap-2"><span><strong className="block text-sm">{p.name}</strong><small className="text-stone-500">R$ {Number(p.price).toFixed(2)}</small></span><Plus className="w-4 h-4 text-orange-500" /></button>)}</div>}
          <div className="bg-stone-50 rounded-2xl p-4"><h3 className="font-bold mb-3 flex gap-2"><Clock className="w-4 h-4" />Resumo da comanda</h3><div className="space-y-2 max-h-48 overflow-y-auto">{detail?.items?.map((item:any)=><div key={item.id} className="flex justify-between text-sm"><span>{item.quantity}x {item.product_name}</span><span>R$ {(item.quantity*item.price).toFixed(2)}</span></div>)}{!detail?.items?.length&&<p className="text-sm text-stone-400">Nenhum item adicionado.</p>}</div><div className="border-t mt-3 pt-3 flex justify-between font-bold text-lg"><span>Total</span><span>R$ {Number(detail?.total || currentOrder?.total || 0).toFixed(2)}</span></div></div>
          <div><label className="text-xs font-bold text-stone-500">FORMA DE PAGAMENTO</label><div className="grid grid-cols-3 gap-2 mt-2">{[['pix','PIX'],['card','Cartao'],['cash','Dinheiro']].map(([v,l])=><button key={v} onClick={()=>setPayment(v)} className={cn('py-3 rounded-xl border font-bold text-sm',payment===v?'bg-stone-900 text-white border-stone-900':'bg-white')}>{l}</button>)}</div></div>
          <button disabled={busy} onClick={closeAccount} className="w-full py-4 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">{busy?<Loader2 className="animate-spin"/>:<DollarSign className="w-5 h-5"/>}Fechar conta</button>
        </>}
      </div>
    </motion.div></div>}</AnimatePresence>
  </div>;
}
