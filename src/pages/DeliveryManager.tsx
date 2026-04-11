import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  ChefHat, 
  Truck, 
  MapPin, 
  Phone,
  MoreVertical,
  AlertCircle,
  Bike,
  Navigation,
  RefreshCw,
  ChevronDown,
  MessageSquare,
  Filter,
  ArrowUpDown,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import DeliveryMap from '../components/DeliveryMap';
import GoogleDeliveryMap from '../components/GoogleDeliveryMap';
import OrderChat from '../components/OrderChat';
import { MOCK_USERS, User } from '../data/users';
import { autoDispatch, getDistanceFromLatLonInKm } from '../lib/dispatchSystem';

type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered';
type SortOption = 'time' | 'value';

interface Order {
  id: string;
  customer: string;
  items: string[];
  total: number;
  status: OrderStatus;
  time: string;
  address: string;
  courierId?: string;
  location?: { lat: number; lng: number };
}

const MOCK_ORDERS: Order[] = [
  {
    id: '#2021',
    customer: 'Ana Silva',
    items: ['2x Woobar Classic', '1x Coca-Cola'],
    total: 78.80,
    status: 'pending',
    time: '10 min',
    address: 'Rua das Flores, 123 - Centro',
    location: { lat: -23.5489, lng: -46.6388 }
  },
  {
    id: '#2020',
    customer: 'Carlos Oliveira',
    items: ['1x Smash Duplo', '1x Batata Rústica'],
    total: 47.80,
    status: 'preparing',
    time: '25 min',
    address: 'Av. Paulista, 1000 - Apt 45',
    location: { lat: -23.5615, lng: -46.6559 }
  },
  {
    id: '#2019',
    customer: 'Beatriz Santos',
    items: ['3x Gin Tônica', '1x Coxinha da Asa'],
    total: 108.90,
    status: 'ready',
    time: '40 min',
    address: 'Rua Augusta, 500',
    location: { lat: -23.5531, lng: -46.6543 }
  },
  {
    id: '#2018',
    customer: 'João Souza',
    items: ['1x Veggie Supreme'],
    total: 30.90,
    status: 'delivering',
    time: '55 min',
    address: 'Rua Bela Cintra, 200',
    courierId: '3', // Assigned to Marcos
    location: { lat: -23.5567, lng: -46.6623 }
  }
];

interface OrderCardProps {
  order: Order;
  couriers: User[];
  moveStatus: (id: string, status: OrderStatus) => void;
  status: OrderStatus;
  onChatClick: (orderId: string) => void;
}

const getOrderPriority = (timeStr: string): 'normal' | 'warning' | 'late' => {
  const minutes = parseInt(timeStr.replace(/\D/g, '')) || 0;
  if (minutes >= 50) return 'late';
  if (minutes >= 30) return 'warning';
  return 'normal';
};

const calculateETA = (order: Order, courier?: User) => {
  if (order.status === 'delivered') return 'Entregue';
  if (!order.location) return '--';

  const STORE_LOCATION = { lat: -23.550520, lng: -46.633308 };
  let remainingTime = 0;

  // Prep time estimation
  if (order.status === 'pending') remainingTime += 25;
  if (order.status === 'preparing') remainingTime += 15;
  if (order.status === 'ready') remainingTime += 5; // buffer for pickup

  // Travel time estimation
  let startLocation = STORE_LOCATION;
  if (order.status === 'delivering' && courier?.currentLocation) {
    startLocation = courier.currentLocation;
  }

  const distance = getDistanceFromLatLonInKm(
    startLocation.lat,
    startLocation.lng,
    order.location.lat,
    order.location.lng
  );
  
  // Assume 20km/h average speed in city = ~3 mins per km
  const travelTime = Math.ceil(distance * 3);
  remainingTime += travelTime;

  return `~${remainingTime} min`;
};

const OrderCard: React.FC<OrderCardProps> = ({ 
  order, 
  couriers, 
  moveStatus, 
  status,
  onChatClick
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const priority = getOrderPriority(order.time);
  
  const assignedCourier = order.courierId ? couriers.find(c => c.id === order.courierId) : undefined;
  const eta = calculateETA(order, assignedCourier);

  const priorityStyles = {
    normal: 'border-stone-100 hover:border-orange-200',
    warning: 'border-yellow-200 bg-yellow-50/30 hover:border-yellow-400',
    late: 'border-red-200 bg-red-50/30 hover:border-red-400'
  };

  const timeStyles = {
    normal: 'text-stone-400',
    warning: 'text-yellow-600 font-medium',
    late: 'text-red-600 font-bold'
  };

  return (
    <motion.div
      layoutId={order.id}
      className={cn(
        "bg-white p-4 rounded-xl shadow-sm border transition-all duration-200 group",
        priorityStyles[priority]
      )}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-500">{order.id}</span>
            {priority === 'late' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase tracking-wide">
                Atrasado
              </span>
            )}
            {priority === 'warning' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase tracking-wide">
                Atenção
              </span>
            )}
          </div>
          <h4 className="font-bold text-stone-900">{order.customer}</h4>
        </div>
        <div className="flex gap-2">
          {order.courierId && (
            <div className="flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-1 rounded-md text-xs font-bold h-fit">
              <Bike className="w-3 h-3" />
              {couriers.find(c => c.id === order.courierId)?.name.split(' ')[0]}
            </div>
          )}
          <button 
            onClick={(e) => { e.stopPropagation(); onChatClick(order.id); }}
            className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors"
            title="Chat com cliente"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex items-center gap-2 text-xs", timeStyles[priority])}>
          <Clock className={cn("w-3 h-3", priority === 'late' && "animate-pulse")} />
          <span>{order.time}</span>
        </div>
        {order.status !== 'delivered' && (
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium bg-stone-50 px-2 py-1 rounded-md border border-stone-100">
             <Navigation className="w-3 h-3 text-stone-400" />
             <span>Chegada: {eta}</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-1 mb-4 border-t border-stone-100 pt-3">
              {order.items.map((item, idx) => (
                <p key={idx} className="text-sm text-stone-600">{item}</p>
              ))}
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-stone-900 mb-4">
                <span>Total</span>
                <span>R$ {order.total.toFixed(2)}</span>
            </div>

            {/* Embedded Map for Order */}
            {order.location && (
              <div className="mb-4 h-32 w-full rounded-lg overflow-hidden border border-stone-200 relative">
                 <DeliveryMap 
                    locations={[
                      { lat: order.location.lat, lng: order.location.lng, type: 'delivery', label: 'Cliente', id: order.id },
                      ...(order.courierId && couriers.find(c => c.id === order.courierId)?.currentLocation ? [{
                        lat: couriers.find(c => c.id === order.courierId)!.currentLocation!.lat,
                        lng: couriers.find(c => c.id === order.courierId)!.currentLocation!.lng,
                        type: 'courier' as const,
                        label: 'Entregador',
                        id: order.courierId
                      }] : [])
                    ]}
                    routes={order.status === 'delivering' && order.courierId && couriers.find(c => c.id === order.courierId)?.currentLocation ? [{
                      from: couriers.find(c => c.id === order.courierId)!.currentLocation!,
                      to: order.location,
                      color: 'purple'
                    }] : []}
                 />
                 {/* Overlay to prevent interaction if desired, or keep interactive */}
                 <div className="absolute top-1 right-1 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold text-stone-500 pointer-events-none z-[1000]">
                    {order.address}
                 </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-1.5 mb-3 text-xs font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors flex items-center justify-center gap-1"
      >
        {isExpanded ? 'Ocultar Detalhes' : 'Ver Detalhes'}
        <ChevronDown className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-180")} />
      </button>

      <div className="flex gap-2 mt-2">
        {status === 'pending' && (
          <button 
            onClick={() => moveStatus(order.id, 'preparing')}
            className="flex-1 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800"
          >
            Aceitar
          </button>
        )}
        {status === 'preparing' && (
          <button 
            onClick={() => moveStatus(order.id, 'ready')}
            className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Pronto
          </button>
        )}
        {status === 'ready' && !order.courierId && (
          <div className="text-xs text-stone-400 text-center w-full py-2 bg-stone-50 rounded-lg">
            Aguardando Entregador
          </div>
        )}
        {status === 'delivering' && (
          <button 
            onClick={() => moveStatus(order.id, 'delivered')}
            className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            Entregue
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default function DeliveryManager() {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [couriers, setCouriers] = useState<User[]>(MOCK_USERS.filter(u => u.role === 'courier'));
  const [autoDispatchEnabled, setAutoDispatchEnabled] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [selectedOrderForChat, setSelectedOrderForChat] = useState<Order | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('time');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  
  // Use environment variable for API key
  const googleMapsApiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  // Simulate courier movement - Updated to 15 seconds as requested
  useEffect(() => {
    const interval = setInterval(() => {
      setCouriers(prev => prev.map(c => {
        if (c.status === 'active' && c.currentLocation) {
          // Random walk simulation
          return {
            ...c,
            currentLocation: {
              lat: c.currentLocation.lat + (Math.random() - 0.5) * 0.002, // Slightly larger movement for longer interval
              lng: c.currentLocation.lng + (Math.random() - 0.5) * 0.002
            }
          };
        }
        return c;
      }));
    }, 15000); // 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Auto-dispatch logic
  useEffect(() => {
    if (autoDispatchEnabled) {
      const assignments = autoDispatch(orders, couriers);
      if (assignments.length > 0) {
        setOrders(prev => prev.map(o => {
          const assignment = assignments.find(a => a.orderId === o.id);
          if (assignment) {
            return { ...o, courierId: assignment.courierId, status: 'delivering' };
          }
          return o;
        }));
        
        // Mark couriers as busy
        setCouriers(prev => prev.map(c => {
          if (assignments.find(a => a.courierId === c.id)) {
            return { ...c, isAvailable: false };
          }
          return c;
        }));
      }
    }
  }, [autoDispatchEnabled, orders, couriers]);

  const moveStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  const toggleCourierAvailability = (courierId: string) => {
    setCouriers(prev => prev.map(c => 
      c.id === courierId ? { ...c, isAvailable: !c.isAvailable } : c
    ));
  };

  const handleChatClick = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrderForChat(order);
      setIsChatOpen(true);
    }
  };

  // Map Data Preparation
  const mapLocations = [
    { lat: -23.550520, lng: -46.633308, type: 'store' as const, label: 'Woobar' },
    ...couriers.filter(c => c.currentLocation).map(c => ({
      lat: c.currentLocation!.lat,
      lng: c.currentLocation!.lng,
      type: 'courier' as const,
      label: c.name.split(' ')[0],
      id: c.id
    })),
    ...orders.filter(o => o.location && o.status !== 'delivered').map(o => ({
      lat: o.location!.lat,
      lng: o.location!.lng,
      type: 'delivery' as const,
      label: `Pedido ${o.id}`,
      id: o.id
    }))
  ];

  const mapRoutes = orders
    .filter(o => o.status === 'delivering' && o.courierId && o.location)
    .map(o => {
      const courier = couriers.find(c => c.id === o.courierId);
      if (courier && courier.currentLocation) {
        return {
          from: courier.currentLocation,
          to: o.location!
        };
      }
      return null;
    })
    .filter(Boolean) as any[];


  const KanbanColumn = ({ title, status, icon: Icon }: { title: string, status: OrderStatus, icon: any }) => {
    // Filter and Sort Logic
    const columnOrders = orders
      .filter(o => o.status === status)
      .sort((a, b) => {
        if (sortBy === 'time') {
          // Sort by time (descending - longest wait first)
          const timeA = parseInt(a.time.replace(/\D/g, '')) || 0;
          const timeB = parseInt(b.time.replace(/\D/g, '')) || 0;
          return timeB - timeA;
        } else {
          // Sort by value (descending - highest value first)
          return b.total - a.total;
        }
      });

    return (
      <div className="flex-1 min-w-[300px] bg-stone-50 rounded-2xl p-4 flex flex-col h-full border border-stone-100">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Icon className="w-5 h-5 text-stone-400" />
          <h3 className="font-bold text-stone-700">{title}</h3>
          <span className="ml-auto bg-white px-2 py-0.5 rounded-md text-xs font-bold text-stone-400 border border-stone-100">
            {columnOrders.length}
          </span>
        </div>
        
        <div className="space-y-3 overflow-y-auto flex-1 pr-2">
          {columnOrders.map(order => (
            <OrderCard 
              key={order.id} 
              order={order} 
              couriers={couriers} 
              moveStatus={moveStatus} 
              status={status} 
              onChatClick={handleChatClick}
            />
          ))}
        </div>
      </div>
    );
  };

  const preparingCount = orders.filter(o => o.status === 'preparing').length;
  const isOverloaded = preparingCount >= 2; // Threshold for demo purposes

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-stone-900">Gestão de Pedidos & Logística</h2>
          <p className="text-stone-500">Monitoramento em tempo real da frota e entregas</p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 bg-stone-100 rounded-xl p-1 border border-stone-200">
            <button
              onClick={() => setSortBy('time')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                sortBy === 'time' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <Clock className="w-3 h-3" />
              Tempo
            </button>
            <button
              onClick={() => setSortBy('value')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all",
                sortBy === 'value' ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-900"
              )}
            >
              <DollarSign className="w-3 h-3" />
              Valor
            </button>
          </div>

          <div className="relative group">
            <button className="px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 transition-all">
              <Filter className="w-4 h-4" />
              {filterStatus === 'all' ? 'Todos Status' : 
               filterStatus === 'pending' ? 'Pendentes' :
               filterStatus === 'preparing' ? 'Em Preparo' :
               filterStatus === 'ready' ? 'Prontos' :
               filterStatus === 'delivering' ? 'Em Trânsito' : 'Entregues'}
              <ChevronDown className="w-3 h-3" />
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-stone-100 overflow-hidden hidden group-hover:block z-50">
              {[
                { label: 'Todos', value: 'all' },
                { label: 'Pendentes', value: 'pending' },
                { label: 'Em Preparo', value: 'preparing' },
                { label: 'Prontos', value: 'ready' },
                { label: 'Em Trânsito', value: 'delivering' },
                { label: 'Entregues', value: 'delivered' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value as any)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm hover:bg-stone-50 transition-colors",
                    filterStatus === opt.value ? "font-bold text-stone-900 bg-stone-50" : "text-stone-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border transition-all",
            isOverloaded 
              ? "bg-red-100 text-red-700 border-red-200 animate-pulse" 
              : "bg-emerald-100 text-emerald-700 border-emerald-200"
          )}>
            <ChefHat className="w-4 h-4" />
            {isOverloaded ? 'Cozinha Sobrecarregada' : 'Cozinha Operando Normal'}
          </div>
          <button 
            onClick={() => setAutoDispatchEnabled(!autoDispatchEnabled)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border transition-all",
              autoDispatchEnabled 
                ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                : "bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200"
            )}
          >
            <RefreshCw className={cn("w-4 h-4", autoDispatchEnabled && "animate-spin")} />
            {autoDispatchEnabled ? 'Despacho Auto' : 'Despacho Auto'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isOverloaded && filterStatus === 'all' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border border-red-100 rounded-2xl p-4 overflow-hidden flex flex-col gap-3"
          >
            <div className="flex items-center gap-2 text-red-800 font-bold">
              <AlertCircle className="w-5 h-5" />
              <h3>Pedidos em Espera (Prioridade)</h3>
              <span className="text-xs font-normal bg-red-200 text-red-800 px-2 py-0.5 rounded-full">
                {orders.filter(o => o.status === 'pending').length} aguardando
              </span>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {orders.filter(o => o.status === 'pending').map(order => (
                <div key={order.id} className="min-w-[280px]">
                  <OrderCard 
                    order={order} 
                    couriers={couriers} 
                    moveStatus={moveStatus} 
                    status="pending" 
                    onChatClick={handleChatClick}
                  />
                </div>
              ))}
              {orders.filter(o => o.status === 'pending').length === 0 && (
                <p className="text-sm text-red-400 italic">Nenhum pedido em espera no momento.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        {/* Left: Kanban Board */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="flex-1 overflow-x-auto pb-4">
            <div className="flex gap-4 h-full min-w-[1500px]">
              {(!isOverloaded || filterStatus !== 'all') && (filterStatus === 'all' || filterStatus === 'pending') && (
                <KanbanColumn title="Novos Pedidos" status="pending" icon={AlertCircle} />
              )}
              {(filterStatus === 'all' || filterStatus === 'preparing') && (
                <KanbanColumn title="Em Preparo" status="preparing" icon={ChefHat} />
              )}
              {(filterStatus === 'all' || filterStatus === 'ready') && (
                <KanbanColumn title="Pronto p/ Entrega" status="ready" icon={CheckCircle} />
              )}
              {(filterStatus === 'all' || filterStatus === 'delivering') && (
                <KanbanColumn title="Em Trânsito" status="delivering" icon={Bike} />
              )}
              {(filterStatus === 'all' || filterStatus === 'delivered') && (
                <KanbanColumn title="Entregue" status="delivered" icon={Truck} />
              )}
            </div>
          </div>
        </div>

        {/* Right: Map & Couriers */}
        <div className="flex flex-col gap-6 min-h-0">
          {/* Map */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-stone-100 p-1 min-h-[300px] relative">
            {googleMapsApiKey ? (
              <GoogleDeliveryMap 
                locations={mapLocations} 
                routes={mapRoutes} 
                apiKey={googleMapsApiKey} 
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-stone-50 rounded-xl p-6 text-center">
                <MapPin className="w-10 h-10 text-stone-300 mb-3" />
                <h3 className="font-bold text-stone-700">Google Maps não configurado</h3>
                <p className="text-sm text-stone-500 mb-4">Adicione VITE_GOOGLE_MAPS_API_KEY ao seu arquivo .env para habilitar o mapa.</p>
                <div className="w-full h-48 rounded-lg overflow-hidden border border-stone-200">
                   <DeliveryMap locations={mapLocations} routes={mapRoutes.map((r: any) => ({...r, color: 'purple'}))} />
                </div>
                <p className="text-xs text-stone-400 mt-2">Usando OpenStreetMap como fallback</p>
              </div>
            )}
          </div>

          {/* Courier Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 h-64 overflow-y-auto">
            <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
              <Bike className="w-4 h-4" />
              Entregadores
            </h3>
            <div className="space-y-3">
              {couriers.map(courier => (
                <div key={courier.id} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={courier.avatar} alt={courier.name} className="w-8 h-8 rounded-full bg-stone-200" referrerPolicy="no-referrer" />
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white",
                        courier.isAvailable ? "bg-emerald-500" : "bg-red-500"
                      )} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{courier.name}</p>
                      <p className="text-xs text-stone-500">
                        {courier.isAvailable ? 'Disponível' : 'Em entrega'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => toggleCourierAvailability(courier.id)}
                    className={cn(
                      "px-2 py-1 rounded text-xs font-bold transition-colors",
                      courier.isAvailable 
                        ? "bg-red-50 text-red-600 hover:bg-red-100" 
                        : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    )}
                  >
                    {courier.isAvailable ? 'Ocupar' : 'Liberar'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isChatOpen && selectedOrderForChat && (
          <OrderChat 
            orderId={selectedOrderForChat.id}
            customerName={selectedOrderForChat.customer}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
