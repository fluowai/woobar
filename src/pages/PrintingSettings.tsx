import React, { useEffect, useState } from 'react';
import { Printer, Wifi, WifiOff, RefreshCw, KeyRound, CheckCircle, AlertCircle, Copy, Server } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

export default function PrintingSettings() {
  const defaults = { name: 'Impressora principal', host: '', port: 9100, paper_width: 80, auto_print_tokens: true, auto_print_tickets: true, enabled: false, delivery_mode: 'agent' };
  const [data, setData] = useState<any>({ config: defaults, agent: null, jobs: [] });
  const [form, setForm] = useState<any>(defaults);
  const [pairToken, setPairToken] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const result = await api.getPrinting();
    setData(result);
    setForm({ ...defaults, ...result.config, enabled: Boolean(result.config.enabled), auto_print_tokens: Boolean(result.config.auto_print_tokens), auto_print_tickets: Boolean(result.config.auto_print_tickets) });
  };
  useEffect(() => { load().catch((e:any)=>setMessage(e.message)); const timer=setInterval(()=>load().catch(()=>{}),10000); return()=>clearInterval(timer); }, []);
  const save = async () => { setBusy(true); try { await api.updatePrinterConfig(form); setMessage('Configuracao salva.'); await load(); } catch(e:any){setMessage(e.message);} finally{setBusy(false);} };
  const pair = async () => { setBusy(true); try { const result=await api.pairPrintAgent('Agente do estabelecimento'); setPairToken(result.token); setMessage('Chave criada. Ela sera exibida somente agora.'); await load(); } catch(e:any){setMessage(e.message);} finally{setBusy(false);} };
  const test = async () => { setBusy(true); try { const result=await api.testPrint(); setMessage(result.status==='printed'?'Teste impresso.':'Teste colocado na fila do agente.'); await load(); } catch(e:any){setMessage(e.message);} finally{setBusy(false);} };
  const online = data.agent?.last_seen_at && Date.now()-new Date(`${data.agent.last_seen_at}Z`).getTime()<30000;
  const command = pairToken ? `$env:WOOBAR_API_URL='${window.location.origin}/api'; $env:WOOBAR_PRINT_TOKEN='${pairToken}'; $env:PRINTER_HOST='192.168.1.50'; $env:PRINTER_PORT='9100'; npm start` : '';
  const copy = async (value:string) => { await navigator.clipboard.writeText(value); setMessage('Comando copiado.'); };

  return <div className="space-y-6 max-w-6xl mx-auto">
    <div><div className="flex items-center gap-2 text-orange-600 text-sm font-bold"><Printer className="w-4 h-4"/>IMPRESSAO CENTRALIZADA</div><h1 className="text-3xl font-bold mt-2">Impressoras e agente local</h1><p className="text-stone-500">Celulares e tablets enviam para a nuvem; o agente local entrega na impressora do estabelecimento.</p></div>
    {message&&<div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl">{message}</div>}
    <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
      <section className="bg-white rounded-2xl border p-6 space-y-5 shadow-sm">
        <div className="flex justify-between items-center"><div><h2 className="font-bold text-lg">Configuracao</h2><p className="text-sm text-stone-500">Padrao ESC/POS por rede.</p></div><button onClick={()=>setForm({...form,enabled:!form.enabled})} className={cn('px-3 py-1.5 rounded-full text-xs font-bold',form.enabled?'bg-emerald-100 text-emerald-700':'bg-stone-100 text-stone-500')}>{form.enabled?'Ativa':'Desativada'}</button></div>
        <Field label="Nome"><input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})} className={input}/></Field>
        <Field label="Modo"><select value={form.delivery_mode||'agent'} onChange={e=>setForm({...form,delivery_mode:e.target.value})} className={input}><option value="agent">Online com agente local</option><option value="direct">Servidor local na mesma rede</option></select></Field>
        {form.delivery_mode==='direct'&&<div className="grid grid-cols-2 gap-3"><Field label="IP da impressora"><input value={form.host||''} onChange={e=>setForm({...form,host:e.target.value})} placeholder="192.168.1.50" className={input}/></Field><Field label="Porta"><input type="number" value={form.port||9100} onChange={e=>setForm({...form,port:Number(e.target.value)})} className={input}/></Field></div>}
        <Field label="Papel"><select value={form.paper_width||80} onChange={e=>setForm({...form,paper_width:Number(e.target.value)})} className={input}><option value={80}>80 mm</option><option value={58}>58 mm</option></select></Field>
        <label className="flex items-center gap-3"><input type="checkbox" checked={form.auto_print_tokens} onChange={e=>setForm({...form,auto_print_tokens:e.target.checked})}/><span>Imprimir fichas automaticamente</span></label>
        <label className="flex items-center gap-3"><input type="checkbox" checked={form.auto_print_tickets} onChange={e=>setForm({...form,auto_print_tickets:e.target.checked})}/><span>Imprimir ingressos automaticamente</span></label>
        <div className="grid grid-cols-2 gap-3"><button disabled={busy} onClick={save} className="py-3 bg-stone-900 text-white rounded-xl font-bold">Salvar</button><button disabled={busy||!form.enabled} onClick={test} className="py-3 bg-orange-500 text-white rounded-xl font-bold">Imprimir teste</button></div>
      </section>
      <section className="space-y-6">
        <div className="bg-white rounded-2xl border p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3">{online?<Wifi className="text-emerald-600"/>:<WifiOff className="text-stone-400"/>}<div><h2 className="font-bold">Agente local</h2><p className="text-sm text-stone-500">{online?'Online e buscando impressoes':data.agent?.last_seen_at?`Ultimo contato: ${new Date(`${data.agent.last_seen_at}Z`).toLocaleString('pt-BR')}`:'Ainda nao pareado'}</p></div></div><button onClick={pair} className="px-4 py-2 bg-stone-100 rounded-xl font-bold text-sm flex gap-2"><KeyRound className="w-4 h-4"/>Gerar chave</button></div>
          {pairToken&&<div className="mt-5 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3"><p className="font-bold text-amber-900">Instalacao no computador do estabelecimento</p><p className="text-sm text-amber-800">Na pasta <code>print-agent</code>, altere o IP para o IP local da impressora e execute.</p><div className="bg-stone-900 text-stone-100 p-3 rounded-lg text-xs font-mono break-all">{command}</div><button onClick={()=>copy(command)} className="text-sm font-bold flex items-center gap-2"><Copy className="w-4 h-4"/>Copiar comando</button></div>}
        </div>
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden"><div className="p-5 border-b"><h2 className="font-bold">Fila recente</h2></div><div className="divide-y max-h-96 overflow-y-auto">{data.jobs?.map((job:any)=><div key={job.id} className="p-4 flex items-center gap-3"><div>{job.status==='printed'?<CheckCircle className="text-emerald-500"/>:job.status==='failed'?<AlertCircle className="text-red-500"/>:<Server className="text-blue-500"/>}</div><div className="flex-1"><p className="font-bold text-sm">{job.type}</p><p className="text-xs text-stone-400">{new Date(`${job.created_at}Z`).toLocaleString('pt-BR')} · {job.status}</p>{job.error&&<p className="text-xs text-red-500">{job.error}</p>}</div>{job.status==='failed'&&<button onClick={async()=>{await api.retryPrintJob(job.id);await load();}} className="p-2 bg-stone-100 rounded-lg"><RefreshCw className="w-4 h-4"/></button>}</div>)}{!data.jobs?.length&&<p className="p-8 text-center text-stone-400">Nenhum trabalho de impressao.</p>}</div></div>
      </section>
    </div>
  </div>;
}
const input='w-full px-3 py-2.5 border border-stone-200 rounded-xl outline-none focus:border-orange-400';
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="text-xs font-bold text-stone-500 block mb-1.5">{label}</span>{children}</label>}
