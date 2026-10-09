import React, { useEffect, useMemo, useState } from 'react';
import { Megaphone, Users, UserRoundCheck, Cake, UserX, Plus, TicketPercent, Send, Pause, Play, WalletCards } from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';

type Overview = {
  segments: Record<'all' | 'inactive' | 'vip' | 'birthday', number>;
  campaigns: any[];
  coupons: any[];
};

const emptyOverview: Overview = { segments: { all: 0, inactive: 0, vip: 0, birthday: 0 }, campaigns: [], coupons: [] };

export default function MarketingGrowth() {
  const [data, setData] = useState<Overview>(emptyOverview);
  const [tab, setTab] = useState<'campaigns' | 'coupons'>('campaigns');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [campaign, setCampaign] = useState({ name: '', channel: 'whatsapp', segment: 'inactive', message: '', scheduled_at: '' });
  const [coupon, setCoupon] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: 10, min_order: 0, cashback_percent: 0, valid_until: '' });

  const load = async () => {
    try { setData(await api.getMarketingOverview()); setError(''); }
    catch (e: any) { setError(e.message || 'Nao foi possivel carregar o modulo.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const selectedAudience = data.segments[campaign.segment as keyof Overview['segments']] || 0;
  const activeCoupons = useMemo(() => data.coupons.filter(c => Number(c.active) === 1).length, [data.coupons]);

  const createCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCampaign({ ...campaign, scheduled_at: campaign.scheduled_at || undefined });
      setCampaign({ name: '', channel: 'whatsapp', segment: 'inactive', message: '', scheduled_at: '' });
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCoupon({ ...coupon, valid_until: coupon.valid_until || undefined });
      setCoupon({ code: '', description: '', discount_type: 'percentage', discount_value: 10, min_order: 0, cashback_percent: 0, valid_until: '' });
      await load();
    } catch (e: any) { setError(e.message); }
  };

  const changeCampaignStatus = async (id: string, status: string) => { await api.updateCampaignStatus(id, status); await load(); };
  const toggleCoupon = async (id: string) => { await api.toggleCoupon(id); await load(); };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 text-sm font-bold mb-2"><Megaphone className="w-4 h-4" /> CENTRAL DE CRESCIMENTO</div>
          <h1 className="text-3xl font-bold text-stone-900">Marketing & Fidelizacao</h1>
          <p className="text-stone-500 mt-1">Recupere clientes, automatize campanhas e aumente a recorrencia sem depender de marketplaces.</p>
        </div>
        <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
          <button onClick={() => setTab('campaigns')} className={tabClass(tab === 'campaigns')}><Megaphone className="w-4 h-4" /> Campanhas</button>
          <button onClick={() => setTab('coupons')} className={tabClass(tab === 'coupons')}><TicketPercent className="w-4 h-4" /> Cupons</button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric icon={Users} label="Base total" value={data.segments.all} color="blue" />
        <Metric icon={UserX} label="Inativos 30+ dias" value={data.segments.inactive} color="red" />
        <Metric icon={UserRoundCheck} label="Clientes VIP" value={data.segments.vip} color="purple" />
        <Metric icon={Cake} label="Aniversariantes" value={data.segments.birthday} color="amber" />
        <Metric icon={WalletCards} label="Cupons ativos" value={activeCoupons} color="emerald" />
      </div>

      {loading ? <div className="text-center py-16 text-stone-400">Carregando...</div> : tab === 'campaigns' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <form onSubmit={createCampaign} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4 h-fit">
            <div><h2 className="text-lg font-bold">Nova campanha</h2><p className="text-sm text-stone-500">Crie uma acao segmentada e acompanhe seu alcance.</p></div>
            <Field label="Nome"><input required value={campaign.name} onChange={e => setCampaign({ ...campaign, name: e.target.value })} placeholder="Ex.: Volte para o Woobar" className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Publico"><select value={campaign.segment} onChange={e => setCampaign({ ...campaign, segment: e.target.value })} className={inputClass}><option value="inactive">Inativos</option><option value="vip">VIP</option><option value="birthday">Aniversariantes</option><option value="all">Todos</option></select></Field>
              <Field label="Canal"><select value={campaign.channel} onChange={e => setCampaign({ ...campaign, channel: e.target.value })} className={inputClass}><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option><option value="sms">SMS</option></select></Field>
            </div>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 text-sm text-orange-800"><strong>{selectedAudience}</strong> clientes fazem parte deste segmento agora.</div>
            <Field label="Mensagem"><textarea required rows={5} value={campaign.message} onChange={e => setCampaign({ ...campaign, message: e.target.value })} placeholder="Ola {nome}, sentimos sua falta..." className={inputClass} /></Field>
            <Field label="Agendar (opcional)"><input type="datetime-local" value={campaign.scheduled_at} onChange={e => setCampaign({ ...campaign, scheduled_at: e.target.value })} className={inputClass} /></Field>
            <button className="w-full bg-stone-900 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-stone-800"><Plus className="w-4 h-4" /> Criar campanha</button>
          </form>

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-stone-100"><h2 className="text-lg font-bold">Campanhas</h2><p className="text-sm text-stone-500">Rascunhos, agendamentos e envios da sua base.</p></div>
            <div className="divide-y divide-stone-100">
              {data.campaigns.length === 0 && <Empty text="Nenhuma campanha criada." />}
              {data.campaigns.map(c => (
                <div key={c.id} className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0"><div className="flex items-center gap-2 mb-1"><h3 className="font-bold truncate">{c.name}</h3><Status status={c.status} /></div><p className="text-sm text-stone-500 line-clamp-1">{c.message}</p><p className="text-xs text-stone-400 mt-2">{segmentName(c.segment)} · {c.channel} · {c.audience_count} contatos</p></div>
                  <div className="flex gap-2">
                    {c.status !== 'sent' && <button onClick={() => changeCampaignStatus(c.id, 'sent')} title="Marcar como enviada" className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"><Send className="w-4 h-4" /></button>}
                    {c.status === 'paused' ? <button onClick={() => changeCampaignStatus(c.id, 'scheduled')} className="p-2.5 rounded-lg bg-blue-50 text-blue-700"><Play className="w-4 h-4" /></button> : c.status !== 'sent' && <button onClick={() => changeCampaignStatus(c.id, 'paused')} className="p-2.5 rounded-lg bg-amber-50 text-amber-700"><Pause className="w-4 h-4" /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <form onSubmit={createCoupon} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-4 h-fit">
            <div><h2 className="text-lg font-bold">Novo incentivo</h2><p className="text-sm text-stone-500">Combine desconto e cashback para estimular a proxima compra.</p></div>
            <Field label="Codigo"><input required value={coupon.code} onChange={e => setCoupon({ ...coupon, code: e.target.value.toUpperCase() })} placeholder="VOLTE10" className={inputClass} /></Field>
            <Field label="Descricao"><input value={coupon.description} onChange={e => setCoupon({ ...coupon, description: e.target.value })} placeholder="Campanha de reativacao" className={inputClass} /></Field>
            <div className="grid grid-cols-2 gap-3"><Field label="Tipo"><select value={coupon.discount_type} onChange={e => setCoupon({ ...coupon, discount_type: e.target.value })} className={inputClass}><option value="percentage">Percentual</option><option value="fixed">Valor fixo</option></select></Field><Field label="Desconto"><input required type="number" min="0.01" step="0.01" value={coupon.discount_value} onChange={e => setCoupon({ ...coupon, discount_value: Number(e.target.value) })} className={inputClass} /></Field></div>
            <div className="grid grid-cols-2 gap-3"><Field label="Pedido minimo"><input type="number" min="0" step="0.01" value={coupon.min_order} onChange={e => setCoupon({ ...coupon, min_order: Number(e.target.value) })} className={inputClass} /></Field><Field label="Cashback %"><input type="number" min="0" max="100" value={coupon.cashback_percent} onChange={e => setCoupon({ ...coupon, cashback_percent: Number(e.target.value) })} className={inputClass} /></Field></div>
            <Field label="Valido ate"><input type="date" value={coupon.valid_until} onChange={e => setCoupon({ ...coupon, valid_until: e.target.value })} className={inputClass} /></Field>
            <button className="w-full bg-stone-900 text-white rounded-xl py-3 font-bold flex items-center justify-center gap-2 hover:bg-stone-800"><Plus className="w-4 h-4" /> Criar incentivo</button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
            {data.coupons.length === 0 && <div className="md:col-span-2 bg-white rounded-2xl border border-stone-100"><Empty text="Nenhum cupom criado." /></div>}
            {data.coupons.map(c => <div key={c.id} className={cn('bg-white rounded-2xl border shadow-sm p-5', Number(c.active) ? 'border-stone-100' : 'border-stone-200 opacity-60')}><div className="flex justify-between gap-3"><div><div className="font-mono font-bold text-lg text-orange-600">{c.code}</div><p className="text-sm text-stone-500 mt-1">{c.description || 'Incentivo promocional'}</p></div><button onClick={() => toggleCoupon(c.id)} className={cn('h-7 px-3 rounded-full text-xs font-bold', Number(c.active) ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-500')}>{Number(c.active) ? 'Ativo' : 'Inativo'}</button></div><div className="grid grid-cols-3 gap-2 mt-5 text-center"><SmallMetric label="Desconto" value={c.discount_type === 'percentage' ? `${c.discount_value}%` : `R$ ${Number(c.discount_value).toFixed(0)}`} /><SmallMetric label="Cashback" value={`${c.cashback_percent}%`} /><SmallMetric label="Usos" value={c.used_count} /></div>{c.valid_until && <p className="text-xs text-stone-400 mt-4">Valido ate {new Date(`${c.valid_until}T12:00:00`).toLocaleDateString('pt-BR')}</p>}</div>)}
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = 'w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 bg-white';
const tabClass = (active: boolean) => cn('px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all', active ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500');
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="block text-xs font-bold text-stone-500 mb-1.5">{label}</span>{children}</label>; }
function Metric({ icon: Icon, label, value, color }: any) { const colors: any = { blue: 'bg-blue-50 text-blue-600', red: 'bg-red-50 text-red-600', purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600' }; return <div className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm"><div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', colors[color])}><Icon className="w-4 h-4" /></div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-stone-500">{label}</p></div>; }
function SmallMetric({ label, value }: any) { return <div className="bg-stone-50 rounded-xl p-2"><p className="font-bold text-sm">{value}</p><p className="text-[10px] text-stone-400 uppercase">{label}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="p-12 text-center text-stone-400"><Megaphone className="w-8 h-8 mx-auto mb-3 opacity-40" /><p>{text}</p></div>; }
function Status({ status }: { status: string }) { const styles: any = { draft: 'bg-stone-100 text-stone-600', scheduled: 'bg-blue-100 text-blue-700', sent: 'bg-emerald-100 text-emerald-700', paused: 'bg-amber-100 text-amber-700' }; const names: any = { draft: 'Rascunho', scheduled: 'Agendada', sent: 'Enviada', paused: 'Pausada' }; return <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', styles[status])}>{names[status] || status}</span>; }
function segmentName(segment: string) { return ({ all: 'Todos', inactive: 'Inativos 30+ dias', vip: 'Clientes VIP', birthday: 'Aniversariantes' } as any)[segment] || segment; }
