const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001/api').replace(/\/+$/, '');
const REFRESH_TOKEN_KEY = 'woobar_refresh_token';
const AUTH_PATHS = ['/auth/login', '/auth/refresh'];

export const API_BASE = API_URL;

let authToken: string | null = localStorage.getItem('woobar_token');

export function setToken(token: string | null) {
  authToken = token;
  if (token) localStorage.setItem('woobar_token', token);
  else localStorage.removeItem('woobar_token');
  window.dispatchEvent(new Event('woobar-auth'));
}

export function getToken() { return authToken; }

export function getApiOrigin(): string {
  if (API_URL.startsWith('http')) return new URL(API_URL).origin;
  return window.location.origin;
}

export function getWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL;
  if (configured) return configured;
  return `${getApiOrigin().replace(/^http/, 'ws')}/ws`;
}

function clearSession() {
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  setToken(null);
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      return false;
    }
    const data = await res.json();
    if (!data?.token) return false;
    setToken(data.token);
    if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function request(path: string, options: RequestInit = {}, retried = false): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && !AUTH_PATHS.includes(path)) {
    if (!retried && (await tryRefreshToken())) {
      return request(path, options, true);
    }
    clearSession();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
    const detail = Array.isArray(err.details) && err.details[0]?.message;
    throw new Error(detail || err.error || `Erro ${res.status}`);
  }

  const data = await res.json();
  if (path === '/auth/login' && data?.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  }
  if (path === '/auth/logout') {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  return data;
}

export const publicApi = {
  getKioskCatalog: () => request('/kiosk/catalog'),
  createKioskOrder: (data: any) => request('/kiosk/orders', { method: 'POST', body: JSON.stringify(data) }),
};

export const api = {
  // Auth
  login: (email: string, password: string) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || undefined }),
  }),

  // Users
  getUsers: () => request('/users'),
  getCouriers: () => request('/users/couriers'),
  createUser: (data: any) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: any) => request(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  updateLocation: (id: string, lat: number, lng: number) => request(`/users/${id}/location`, { method: 'PATCH', body: JSON.stringify({ lat, lng }) }),

  // Products
  getProducts: () => request('/products'),
  getCategories: () => request('/products/categories'),
  createProduct: (data: any) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: any) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id: string) => request(`/products/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (status?: string) => request(`/orders?status=${status || 'all'}`),
  getOrder: (id: string) => request(`/orders/${id}`),
  createOrder: (data: any) => request('/orders', { method: 'POST', body: JSON.stringify(data) }),
  updateOrderStatus: (id: string, status: string, courier_id?: string) => request(`/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, courier_id }) }),
  sendMessage: (orderId: string, text: string, sender = 'store') => request(`/orders/${orderId}/messages`, { method: 'POST', body: JSON.stringify({ text, sender }) }),

  // Tables & Comanda
  getTables: () => request('/tables'),
  updateTableStatus: (id: string, status: string) => request(`/tables/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  getTableOrders: () => request('/tables/orders'),
  getTableOrder: (id: string) => request(`/tables/orders/${id}`),
  createTableOrder: (data: any) => request('/tables/orders', { method: 'POST', body: JSON.stringify(data) }),
  addTableOrderItem: (orderId: string, data: any) => request(`/tables/orders/${orderId}/items`, { method: 'POST', body: JSON.stringify(data) }),
  updateOrderItemStatus: (itemId: string, status: string) => request(`/tables/orders/items/${itemId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  closeTableOrder: (orderId: string, payment_method: string) => request(`/tables/orders/${orderId}/close`, { method: 'POST', body: JSON.stringify({ payment_method }) }),

  // Bar Tokens
  getTokens: (status?: string) => request(`/tokens?status=${status || ''}`),
  sellTokens: (data: any) => request('/tokens/sell', { method: 'POST', body: JSON.stringify(data) }),
  validateToken: (code: string) => request('/tokens/validate', { method: 'POST', body: JSON.stringify({ code }) }),

  // Events
  getEvents: () => request('/events'),
  createEvent: (data: any) => request('/events', { method: 'POST', body: JSON.stringify(data) }),
  createTicketType: (eventId: string, data: any) => request(`/events/${eventId}/tickets`, { method: 'POST', body: JSON.stringify(data) }),
  sellTickets: (data: any) => request('/events/sell', { method: 'POST', body: JSON.stringify(data) }),
  validateTicket: (code: string) => request('/events/validate', { method: 'POST', body: JSON.stringify({ code }) }),

  // Cover Charge
  getCoverConfig: () => request('/cover/config'),
  updateCoverConfig: (data: any) => request('/cover/config', { method: 'PUT', body: JSON.stringify(data) }),
  getCoverCount: () => request('/cover/count'),
  coverEntry: (amount?: number, method?: string) => request('/cover/entry', { method: 'POST', body: JSON.stringify({ amount, method }) }),
  coverExit: () => request('/cover/exit', { method: 'POST' }),
  getCoverTransactions: () => request('/cover/transactions'),

  // Inventory
  getInventory: () => request('/inventory'),
  getInventoryAlerts: () => request('/inventory/alerts'),
  createInventoryItem: (data: any) => request('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  addMovement: (data: any) => request('/inventory/movement', { method: 'POST', body: JSON.stringify(data) }),
  getMovements: (itemId: string) => request(`/inventory/movements/${itemId}`),
  getRecipes: () => request('/inventory/recipes'),
  createRecipe: (data: any) => request('/inventory/recipes', { method: 'POST', body: JSON.stringify(data) }),
  getRecipeCost: (id: string) => request(`/inventory/recipes/${id}/cost`),

  // Financial
  getCashRegister: () => request('/financial/cash-register'),
  openCashRegister: (opening_balance: number) => request('/financial/cash-register/open', { method: 'POST', body: JSON.stringify({ opening_balance }) }),
  closeCashRegister: (notes?: string) => request('/financial/cash-register/close', { method: 'POST', body: JSON.stringify({ notes }) }),
  getDashboard: () => request('/financial/dashboard'),
  getDRE: (start_date?: string, end_date?: string) => request(`/financial/dre?start_date=${start_date || ''}&end_date=${end_date || ''}`),
  getTopProducts: (start_date?: string, end_date?: string, limit?: number) => request(`/financial/top-products?start_date=${start_date || ''}&end_date=${end_date || ''}&limit=${limit || 10}`),

  // Customers
  getCustomers: (search?: string) => request(`/customers?search=${search || ''}`),
  getCustomer: (id: string) => request(`/customers/${id}`),
  createCustomer: (data: any) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (id: string, data: any) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Marketing & Growth
  getMarketingOverview: () => request('/marketing/overview'),
  getMarketingAudience: (segment: string) => request(`/marketing/audience/${segment}`),
  createCampaign: (data: any) => request('/marketing/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaignStatus: (id: string, status: string) => request(`/marketing/campaigns/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  createCoupon: (data: any) => request('/marketing/coupons', { method: 'POST', body: JSON.stringify(data) }),
  toggleCoupon: (id: string) => request(`/marketing/coupons/${id}/toggle`, { method: 'PATCH' }),

  // Channels
  getChannels: () => request('/channels'),
  createChannel: (data: any) => request('/channels', { method: 'POST', body: JSON.stringify(data) }),
  updateChannel: (id: string, data: any) => request(`/channels/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleChannel: (id: string) => request(`/channels/${id}/toggle`, { method: 'PATCH' }),
  deleteChannel: (id: string) => request(`/channels/${id}`, { method: 'DELETE' }),
  getChannelOrders: () => request('/channels/orders'),
  getChannelEvents: () => request('/channels/events'),

  // Establishments
  getEstablishments: () => request('/establishments'),
  getSettings: () => request('/establishments/settings'),
  updateSettings: (data: any) => request('/establishments/settings', { method: 'PUT', body: JSON.stringify(data) }),

  // Printing
  getPrinting: () => request('/printing'),
  updatePrinterConfig: (data: any) => request('/printing/config', { method: 'PUT', body: JSON.stringify(data) }),
  pairPrintAgent: (name?: string) => request('/printing/agent/pair', { method: 'POST', body: JSON.stringify({ name }) }),
  testPrint: () => request('/printing/test', { method: 'POST' }),
  retryPrintJob: (id: string) => request(`/printing/jobs/${id}/retry`, { method: 'POST' }),
  printToken: (code: string) => request(`/printing/token/${code}`, { method: 'POST' }),
  printTicket: (code: string) => request(`/printing/ticket/${code}`, { method: 'POST' }),
};
