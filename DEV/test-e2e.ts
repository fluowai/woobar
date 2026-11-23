const BASE = 'http://localhost:3001/api';

async function req(path: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  try {
    return { status: res.status, ok: res.ok, data: JSON.parse(text) };
  } catch {
    return { status: res.status, ok: res.ok, data: text };
  }
}

async function run() {
  console.log('🚀 Iniciando Teste Completo de Ponta a Ponta no Woobar...\n');
  const results: { test: string; status: 'OK' | 'FAIL'; details?: any }[] = [];

  const assert = (name: string, ok: boolean, details?: any) => {
    if (ok) {
      console.log(`  ✅ ${name}`);
      results.push({ test: name, status: 'OK' });
    } else {
      console.error(`  ❌ ${name}:`, details);
      results.push({ test: name, status: 'FAIL', details });
    }
  };

  // 1. LOGIN
  console.log('1. Autenticação & Papéis');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@woobar.com', password: 'admin123' })
  });
  assert('Login de Admin', adminLogin.status === 200 && !!adminLogin.data.token);
  const adminToken = adminLogin.data.token;

  const waiterLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'pedro@woobar.com', password: '123456' })
  });
  assert('Login de Garçom', waiterLogin.status === 200 && !!waiterLogin.data.token);
  const waiterToken = waiterLogin.data.token;

  // 2. PRODUTOS & CATEGORIAS
  console.log('\n2. Produtos & Cardápio');
  const productsRes = await req('/products', {}, adminToken);
  assert('Listagem de produtos do cardápio', productsRes.status === 200 && Array.isArray(productsRes.data));
  const testProduct = productsRes.data[0];
  assert('Produto ativo encontrado', !!testProduct, testProduct?.name);

  // 3. MESAS & COMANDAS
  console.log('\n3. Mesas & Comandas (Table Orders)');
  const tablesRes = await req('/tables', {}, waiterToken);
  assert('Listagem de mesas', tablesRes.status === 200 && Array.isArray(tablesRes.data));
  const freeTable = tablesRes.data.find((t: any) => t.status === 'free');
  assert('Mesa livre disponível', !!freeTable, freeTable?.name);

  let tableOrderId = '';
  if (freeTable) {
    const openTableRes = await req('/tables/orders', {
      method: 'POST',
      body: JSON.stringify({ table_id: freeTable.id, customer_name: 'Teste Cliente Mesa' })
    }, waiterToken);
    assert('Abertura de mesa e comanda', openTableRes.status === 201 && !!openTableRes.data.id);
    tableOrderId = openTableRes.data.id;

    const addItemRes = await req(`/tables/orders/${tableOrderId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: testProduct.id,
        quantity: 2,
        notes: 'Sem gelo'
      })
    }, waiterToken);
    assert('Adição de item com cálculo server-side', addItemRes.status === 201 && addItemRes.data.price === testProduct.price);

    const printTableRes = await req(`/printing/table-order/${tableOrderId}`, { method: 'POST' }, waiterToken);
    assert('Impressão de conferência da comanda', printTableRes.status === 200 && !!printTableRes.data.id);

    const closeTableRes = await req(`/tables/orders/${tableOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: 'pix' })
    }, waiterToken);
    assert('Fechamento de comanda com pagamento', closeTableRes.status === 200 && closeTableRes.data.success);

    const cleanTableRes = await req(`/tables/${freeTable.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'free' })
    }, waiterToken);
    assert('Liberação de mesa para novo uso', cleanTableRes.status === 200 && cleanTableRes.data.success);
  }

  // 4. PEDIDOS DELIVERY / BALCÃO
  console.log('\n4. Pedidos Delivery & Balcão');
  const createOrderRes = await req('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: 'Cliente E2E Delivery',
      customer_phone: '11988887777',
      customer_address: 'Av. Paulista, 1000 - Apto 42',
      payment_method: 'card',
      channel: 'website',
      items: [{ product_id: testProduct.id, quantity: 1 }]
    })
  }, waiterToken);
  assert('Criação de pedido', createOrderRes.status === 201 && !!createOrderRes.data.id);
  const deliveryOrderId = createOrderRes.data.id;

  const chatRes = await req(`/orders/${deliveryOrderId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Seu pedido já está em preparo!', sender: 'store' })
  }, waiterToken);
  assert('Envio de mensagem no chat do pedido', chatRes.status === 201 && !!chatRes.data.id);

  const printOrderRes = await req(`/printing/order/${deliveryOrderId}`, { method: 'POST' }, waiterToken);
  assert('Impressão de comprovante de pedido', printOrderRes.status === 200 && !!printOrderRes.data.id);

  const updateStatusRes = await req(`/orders/${deliveryOrderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'preparing' })
  }, waiterToken);
  assert('Atualização de status do pedido para preparing', updateStatusRes.status === 200 && updateStatusRes.data.success);

  // 5. BAR TOKENS (FICHAS) & VALIDAÇÃO
  console.log('\n5. Bar & Fichas de Consumo');
  const sellTokensRes = await req('/tokens/sell', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ product_id: testProduct.id, name: testProduct.name, quantity: 2, type: 'token' }],
      payment_method: 'pix'
    })
  }, waiterToken);
  assert('Venda de fichas com geração de código', sellTokensRes.status === 201 && sellTokensRes.data.codes?.length === 2);
  const tokenCode = sellTokensRes.data.codes?.[0]?.code;

  if (tokenCode) {
    const reprintRes = await req(`/printing/token/${tokenCode}`, { method: 'POST' }, waiterToken);
    assert('Reimpressão de ficha pelo código', reprintRes.status === 200 && !!reprintRes.data.id);

    const validateRes = await req('/tokens/validate', {
      method: 'POST',
      body: JSON.stringify({ code: tokenCode })
    }, waiterToken);
    assert('Validação de ficha no balcão', validateRes.status === 200 && validateRes.data.status === 'valid');

    const revalidateRes = await req('/tokens/validate', {
      method: 'POST',
      body: JSON.stringify({ code: tokenCode })
    }, waiterToken);
    assert('Bloqueio contra reutilização de ficha já validada', revalidateRes.status === 200 && revalidateRes.data.status === 'used');
  }

  // 6. EVENTOS & INGRESSOS
  console.log('\n6. Eventos & Ingressos');
  const createEventRes = await req('/events', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Noite de Jazz E2E',
      date: '2026-11-15',
      time: '20:00',
      location: 'Palco Principal',
      description: 'Show de jazz ao vivo'
    })
  }, adminToken);
  assert('Criação de evento', createEventRes.status === 201 && !!createEventRes.data.id);
  const eventId = createEventRes.data.id;

  const createTicketRes = await req(`/events/${eventId}/tickets`, {
    method: 'POST',
    body: JSON.stringify({ name: 'Ingresso Pista', price: 50.0, available: 100 })
  }, adminToken);
  assert('Criação de tipo de ingresso', createTicketRes.status === 201 && !!createTicketRes.data.id);
  const ticketTypeId = createTicketRes.data.id;

  const sellTicketRes = await req('/events/sell', {
    method: 'POST',
    body: JSON.stringify({
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity: 1,
      buyer_name: 'Comprador E2E',
      buyer_email: 'comprador@teste.com'
    })
  }, waiterToken);
  assert('Venda de ingresso', sellTicketRes.status === 201 && !!sellTicketRes.data.code);
  const ticketCode = sellTicketRes.data.code;

  if (ticketCode) {
    const printTicketRes = await req(`/printing/ticket/${ticketCode}`, { method: 'POST' }, waiterToken);
    assert('Impressão de ingresso', printTicketRes.status === 200 && !!printTicketRes.data.id);

    const validateTicketRes = await req('/events/validate', {
      method: 'POST',
      body: JSON.stringify({ code: ticketCode })
    }, waiterToken);
    assert('Validação de ingresso na portaria', validateTicketRes.status === 200 && validateTicketRes.data.status === 'valid');
  }

  // 7. COUVERT ARTÍSTICO (PORTARIA)
  console.log('\n7. Couvert Artístico (Portaria)');
  const coverEntryRes = await req('/cover/entry', {
    method: 'POST',
    body: JSON.stringify({ method: 'pix' })
  }, waiterToken);
  assert('Registro de entrada de couvert', coverEntryRes.status === 201 && !!coverEntryRes.data.id);

  const coverCountRes = await req('/cover/count', {}, waiterToken);
  assert('Consulta de lotação atual', coverCountRes.status === 200 && typeof coverCountRes.data.current === 'number');

  // 8. ESTOQUE & INSUMOS
  console.log('\n8. Estoque & Insumos');
  const createItemRes = await req('/inventory', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Barril Chopp IPA 50L',
      unit: 'L',
      current_stock: 50,
      min_stock: 10,
      cost_price: 12.50,
      category: 'Bebidas'
    })
  }, adminToken);
  assert('Cadastro de item de estoque', createItemRes.status === 201 && !!createItemRes.data.id);
  const itemId = createItemRes.data.id;

  const moveRes = await req('/inventory/movement', {
    method: 'POST',
    body: JSON.stringify({
      item_id: itemId,
      type: 'out',
      quantity: 5,
      reason: 'Consumo do turno'
    })
  }, adminToken);
  assert('Movimentação de baixa de estoque', moveRes.status === 201 && !!moveRes.data.id);

  // 9. GESTÃO DE IMPRESSORAS & AGENTE
  console.log('\n9. Impressoras & Agente de Impressão');
  const printConfigRes = await req('/printing', {}, adminToken);
  assert('Consulta de configuração de impressão e fila', printConfigRes.status === 200 && Array.isArray(printConfigRes.data.jobs));
  console.log(`     Trabalhos registrados na fila de impressão: ${printConfigRes.data.jobs?.length}`);

  const pairAgentRes = await req('/printing/agent/pair', {
    method: 'POST',
    body: JSON.stringify({ name: 'PDV Caixa Principal' })
  }, adminToken);
  assert('Pareamento de agente de impressão', pairAgentRes.status === 200 && !!pairAgentRes.data.token);
  const agentToken = pairAgentRes.data.token;

  const agentNextRes = await req('/printing/agent/next', {}, undefined);
  assert('Bloqueio de agente sem token', agentNextRes.status === 401);

  const agentAuthedRes = await req('/printing/agent/next', {
    headers: { 'x-print-agent-token': agentToken }
  });
  assert('Agente captura trabalho da fila com token válido', agentAuthedRes.status === 200);

  // 10. FECHAMENTO DE CAIXA
  console.log('\n10. Caixa & DRE');
  const closeCashRes = await req('/financial/cash-register/close', {
    method: 'POST',
    body: JSON.stringify({ notes: 'Fechamento de teste E2E' })
  }, adminToken);
  // Se não houver caixa aberto, tenta abrir e fechar
  if (closeCashRes.status === 400 && closeCashRes.data.error === 'Nenhum caixa aberto') {
    const openCash = await req('/financial/cash-register/open', {
      method: 'POST',
      body: JSON.stringify({ opening_balance: 200.0 })
    }, adminToken);
    assert('Abertura de caixa', openCash.status === 201);
    const closeAgain = await req('/financial/cash-register/close', {
      method: 'POST',
      body: JSON.stringify({ notes: 'Fechamento após abertura' })
    }, adminToken);
    assert('Fechamento de caixa com conferência', closeAgain.status === 200 && closeAgain.data.success);
  } else {
    assert('Fechamento de caixa com conferência', closeCashRes.status === 200 && closeCashRes.data.success);
  }

  // 11. TOTEM & CARDÁPIO PÚBLICO
  console.log('\n11. Totem & Cardápio Digital Público');
  const kioskCatalogRes = await req('/kiosk/catalog');
  assert('Cardápio público do totem', kioskCatalogRes.status === 200 && Array.isArray(kioskCatalogRes.data.products));

  const kioskOrderRes = await req('/kiosk/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: 'Cliente Totem Autoatendimento',
      payment_method: 'counter',
      items: [{ product_id: testProduct.id, quantity: 1 }]
    })
  });
  assert('Pedido público criado pelo totem', kioskOrderRes.status === 201 && !!kioskOrderRes.data.order_number);

  console.log('\n========================================');
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`RESULTADO FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Erro fatal durante execução dos testes:', err);
  process.exit(1);
});
