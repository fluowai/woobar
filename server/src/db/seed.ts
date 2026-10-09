import 'dotenv/config';
import { initDatabase } from './schema.js';
import db from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

initDatabase();

const EST_ID = uuid();

const existing = db.prepare('SELECT id FROM establishments WHERE slug = ?').get('woobar');
if (existing) {
  console.log('Dados já existentes. Pulando seed.');
  process.exit(0);
}

// AVISO: Altere esta senha imediatamente após o primeiro login!
// Use: https://www.random.org/passwords/?num=1&len=16&format=html&rnd=new
const adminPass = bcrypt.hashSync('admin123', 10);
const userPass = bcrypt.hashSync('123456', 10);

const insertEst = db.prepare(`INSERT INTO establishments (id, name, slug, address, phone) VALUES (?,?,?,?,?)`);
insertEst.run(EST_ID, 'Woobar Unit 1', 'woobar', 'Rua Augusta, 1500 - Consolação, São Paulo', '(11) 99999-0000');

db.prepare(`INSERT INTO establishment_settings (establishment_id, name, tax_rate, service_fee, delivery_fee, free_delivery_min, opening_hours) VALUES (?,?,?,?,?,?,?)`)
  .run(EST_ID, 'Woobar', 0.08, 0.10, 5.00, 50.00, JSON.stringify({
    mon: '17:00-23:59', tue: '17:00-23:59', wed: '17:00-23:59',
    thu: '17:00-23:59', fri: '17:00-02:00', sat: '12:00-02:00', sun: '12:00-22:00'
  }));

const users = [
  { id: uuid(), name: 'Admin', email: 'admin@woobar.com', pass: adminPass, role: 'admin' },
  { id: uuid(), name: 'Carlos Cozinha', email: 'carlos@woobar.com', pass: userPass, role: 'kitchen' },
  { id: uuid(), name: 'Marcos Entregas', email: 'marcos@woobar.com', pass: userPass, role: 'courier', lat: -23.550520, lng: -46.633308 },
  { id: uuid(), name: 'Julia Entregas', email: 'julia@woobar.com', pass: userPass, role: 'courier', lat: -23.555520, lng: -46.638308, avail: 0 },
  { id: uuid(), name: 'Ana Atendente', email: 'ana@woobar.com', pass: userPass, role: 'attendant' },
];

const insUser = db.prepare(`INSERT INTO users (id, establishment_id, name, email, password_hash, role, current_location_lat, current_location_lng, is_available) VALUES (?,?,?,?,?,?,?,?,?)`);
for (const u of users) {
  insUser.run(u.id, EST_ID, u.name, u.email, u.pass, u.role, u.lat || null, u.lng || null, u.avail ?? 1);
}

const categories = [
  { id: uuid(), name: 'Burgers', sort: 1 },
  { id: uuid(), name: 'Porções', sort: 2 },
  { id: uuid(), name: 'Bebidas', sort: 3 },
  { id: uuid(), name: 'Drinks', sort: 4 },
  { id: uuid(), name: 'Sobremesas', sort: 5 },
];
const insCat = db.prepare(`INSERT INTO categories (id, establishment_id, name, sort_order) VALUES (?,?,?,?)`);
for (const c of categories) insCat.run(c.id, EST_ID, c.name, c.sort);

const products = [
  { cat: 1, name: 'Woobar Classic', desc: 'Burger artesanal 180g, queijo cheddar, bacon crocante e molho especial.', price: 32.90, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80' },
  { cat: 1, name: 'Smash Duplo', desc: 'Dois smashes de 90g, queijo prato, cebola caramelizada e picles.', price: 28.90, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80' },
  { cat: 1, name: 'Veggie Supreme', desc: 'Burger de grão de bico, rúcula, tomate seco e maionese de ervas.', price: 30.90, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80' },
  { cat: 2, name: 'Batata Rústica', desc: 'Batatas cortadas à mão com alecrim e alho.', price: 18.90, img: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?auto=format&fit=crop&w=800&q=80' },
  { cat: 2, name: 'Coxinha da Asa', desc: 'Porção com 10 unidades, acompanha molho barbecue.', price: 24.90, img: 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?auto=format&fit=crop&w=800&q=80' },
  { cat: 2, name: 'Anéis de Cebola', desc: 'Anéis de cebola empanados, servidos com molho ranch.', price: 22.90, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?auto=format&fit=crop&w=800&q=80' },
  { cat: 3, name: 'Heineken Long Neck', desc: '330ml, gelada.', price: 12.00, img: 'https://images.unsplash.com/photo-1618885472179-5e474019f2a9?auto=format&fit=crop&w=800&q=80' },
  { cat: 3, name: 'Coca-Cola', desc: 'Lata 350ml.', price: 6.00, img: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?auto=format&fit=crop&w=800&q=80' },
  { cat: 3, name: 'Água s/ Gás', desc: '500ml.', price: 5.00, img: 'https://images.unsplash.com/photo-1616118132534-7315e7e0c2c8?auto=format&fit=crop&w=800&q=80' },
  { cat: 3, name: 'Suco Natural', desc: 'Laranja ou limão 400ml.', price: 10.00, img: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=800&q=80' },
  { cat: 4, name: 'Gin Tônica', desc: 'Gin importado, tônica, limão siciliano e alecrim.', price: 28.00, img: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?auto=format&fit=crop&w=800&q=80' },
  { cat: 4, name: 'Moscow Mule', desc: 'Vodka, ginger beer e espuma de gengibre.', price: 30.00, img: 'https://images.unsplash.com/photo-1530991037531-51f5568d93cd?auto=format&fit=crop&w=800&q=80' },
  { cat: 4, name: 'Caipirinha', desc: 'Limão, cachaça, açúcar e gelo.', price: 22.00, img: 'https://images.unsplash.com/photo-1514361892635-6b07e31e75f9?auto=format&fit=crop&w=800&q=80' },
  { cat: 5, name: 'Petit Gâteau', desc: 'Bolo de chocolate com sorvete de creme.', price: 26.00, img: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&w=800&q=80' },
  { cat: 5, name: 'Pudim', desc: 'Pudim de leite condensado com calda de caramelo.', price: 18.00, img: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?auto=format&fit=crop&w=800&q=80' },
];

const insProd = db.prepare(`INSERT INTO products (id, establishment_id, category_id, name, description, price, image) VALUES (?,?,?,?,?,?,?)`);
const prodMap: Record<string, string> = {};
for (const p of products) {
  const id = uuid();
  prodMap[p.name] = id;
  insProd.run(id, EST_ID, categories[p.cat - 1].id, p.name, p.desc, p.price, p.img);
}

const tables = [
  { name: 'Mesa 1', seats: 2, x: 0, y: 0 },
  { name: 'Mesa 2', seats: 4, x: 1, y: 0, status: 'occupied' },
  { name: 'Mesa 3', seats: 4, x: 2, y: 0 },
  { name: 'Mesa 4', seats: 6, x: 0, y: 1 },
  { name: 'Mesa 5', seats: 4, x: 1, y: 1, status: 'occupied' },
  { name: 'Mesa 6', seats: 2, x: 2, y: 1 },
  { name: 'Mesa 7', seats: 4, x: 0, y: 2, status: 'reserved' },
  { name: 'Mesa 8', seats: 4, x: 1, y: 2, status: 'dirty' },
  { name: 'Mesa 9', seats: 6, x: 2, y: 2 },
  { name: 'Mesa 10', seats: 2, x: 1.5, y: 3 },
  { name: 'Balcão 1', seats: 1, x: 3, y: 0 },
  { name: 'Balcão 2', seats: 1, x: 3, y: 1 },
  { name: 'VIP 1', seats: 8, x: 3, y: 2 },
  { name: 'VIP 2', seats: 8, x: 3, y: 3 },
  { name: 'Área Externa 1', seats: 6, x: 0, y: 3.5 },
  { name: 'Área Externa 2', seats: 6, x: 1.5, y: 3.5 },
];
const insTable = db.prepare(`INSERT INTO tables (id, establishment_id, name, seats, status, x_position, y_position) VALUES (?,?,?,?,?,?,?)`);
for (const t of tables) insTable.run(uuid(), EST_ID, t.name, t.seats, (t as any).status || 'free', t.x, t.y);

const events = [
  { id: uuid(), title: 'Samba de Domingo', date: '2026-06-01', time: '16:00', loc: 'Palco Principal', img: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80' },
  { id: uuid(), title: 'Noite de Jazz', date: '2026-06-15', time: '20:00', loc: 'Lounge Bar', img: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80' },
  { id: uuid(), title: 'Rock Classics', date: '2026-06-20', time: '21:00', loc: 'Palco Principal', img: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80' },
];
const insEv = db.prepare(`INSERT INTO events (id, establishment_id, title, date, time, location, image) VALUES (?,?,?,?,?,?,?)`);
for (const e of events) insEv.run(e.id, EST_ID, e.title, e.date, e.time, e.loc, e.img);

const tickets = [
  { ev: 0, name: 'Pista', price: 30.00, avail: 120 },
  { ev: 0, name: 'Área VIP', price: 80.00, avail: 45 },
  { ev: 1, name: 'Entrada', price: 50.00, avail: 80 },
  { ev: 1, name: 'Mesa (4 lugares)', price: 250.00, avail: 10 },
  { ev: 2, name: 'Pista', price: 40.00, avail: 200 },
  { ev: 2, name: 'Camarote', price: 100.00, avail: 30 },
];
const insTick = db.prepare(`INSERT INTO event_tickets (id, event_id, name, price, available, sold) VALUES (?,?,?,?,?,0)`);
for (const t of tickets) insTick.run(uuid(), events[t.ev].id, t.name, t.price, t.avail);

const inventoryItems = [
  { name: 'Pão de hambúrguer', unit: 'un', stock: 200, min: 50, cost: 1.50, cat: 'Padaria' },
  { name: 'Carne bovina 180g', unit: 'un', stock: 100, min: 30, cost: 8.00, cat: 'Carnes' },
  { name: 'Queijo cheddar', unit: 'fatia', stock: 300, min: 80, cost: 0.80, cat: 'Laticínios' },
  { name: 'Bacon', unit: 'kg', stock: 10, min: 3, cost: 35.00, cat: 'Carnes' },
  { name: 'Batata', unit: 'kg', stock: 50, min: 15, cost: 6.00, cat: 'Hortifrúti' },
  { name: 'Heineken 330ml', unit: 'un', stock: 500, min: 100, cost: 4.50, cat: 'Bebidas' },
  { name: 'Coca-Cola 350ml', unit: 'un', stock: 400, min: 80, cost: 2.50, cat: 'Bebidas' },
  { name: 'Gin importado', unit: 'garrafa', stock: 20, min: 5, cost: 85.00, cat: 'Bebidas' },
  { name: 'Vodka', unit: 'garrafa', stock: 15, min: 5, cost: 45.00, cat: 'Bebidas' },
  { name: 'Limão', unit: 'kg', stock: 15, min: 5, cost: 4.00, cat: 'Hortifrúti' },
  { name: 'Tomate seco', unit: 'kg', stock: 5, min: 2, cost: 30.00, cat: 'Hortifrúti' },
  { name: 'Rúcula', unit: 'maço', stock: 20, min: 8, cost: 3.50, cat: 'Hortifrúti' },
  { name: 'Molho especial', unit: 'l', stock: 10, min: 3, cost: 12.00, cat: 'Molhos' },
  { name: 'Gengibre', unit: 'kg', stock: 5, min: 2, cost: 8.00, cat: 'Hortifrúti' },
  { name: 'Alecrim', unit: 'maço', stock: 10, min: 3, cost: 2.50, cat: 'Hortifrúti' },
  { name: 'Ginger beer', unit: 'un', stock: 60, min: 20, cost: 3.00, cat: 'Bebidas' },
  { name: 'Água s/ Gás 500ml', unit: 'un', stock: 300, min: 60, cost: 1.50, cat: 'Bebidas' },
  { name: 'Laranja', unit: 'kg', stock: 20, min: 5, cost: 3.00, cat: 'Hortifrúti' },
  { name: 'Chocolate 70%', unit: 'kg', stock: 8, min: 3, cost: 45.00, cat: 'Doces' },
  { name: 'Leite condensado', unit: 'lata', stock: 30, min: 10, cost: 5.00, cat: 'Doces' },
];
const invIds: Record<string, string> = {};
const insInv = db.prepare(`INSERT INTO inventory_items (id, establishment_id, name, unit, current_stock, min_stock, cost_price, category) VALUES (?,?,?,?,?,?,?,?)`);
for (const i of inventoryItems) {
  const id = uuid();
  invIds[i.name] = id;
  insInv.run(id, EST_ID, i.name, i.unit, i.stock, i.min, i.cost, i.cat);
}

const insCashier = db.prepare(`INSERT INTO cash_registers (id, establishment_id, user_id, status, opening_balance, opened_at) VALUES (?,?,?,'open',200,datetime('now','-4 hours'))`);
insCashier.run(uuid(), EST_ID, users[0].id);

const insCust = db.prepare(`INSERT INTO customers (id, establishment_id, name, email, phone, total_visits, total_spent, last_visit) VALUES (?,?,?,?,?,?,?,?)`);
insCust.run(uuid(), EST_ID, 'Ana Silva', 'ana@email.com', '(11) 91234-5678', 12, 845.50, '2026-05-18');
insCust.run(uuid(), EST_ID, 'Carlos Oliveira', 'carlos@email.com', '(11) 98765-4321', 5, 320.00, '2026-05-10');
insCust.run(uuid(), EST_ID, 'Beatriz Santos', 'beatriz@email.com', '(11) 99876-5432', 8, 1230.00, '2026-05-20');

const insChan = db.prepare(`INSERT INTO channels (id, establishment_id, name, type, active, config_json) VALUES (?,?,?,?,?,?)`);
insChan.run(uuid(), EST_ID, 'Site Woobar', 'website', 1, '{}');
insChan.run(uuid(), EST_ID, 'WhatsApp', 'whatsapp', 1, JSON.stringify({ phone: '5511999990000', template: 'Olá {customer}, seu pedido {order_id} está a caminho!' }));
insChan.run(uuid(), EST_ID, 'iFood', 'ifood', 0, '{}');
insChan.run(uuid(), EST_ID, 'Uber Eats', 'uber', 0, '{}');

db.prepare(`INSERT OR REPLACE INTO cover_config (establishment_id, price, capacity) VALUES (?, ?, ?)`)
  .run(EST_ID, 25.00, 250);

console.log('Seed concluído com sucesso!');
process.exit(0);
