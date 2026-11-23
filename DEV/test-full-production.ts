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
  console.log('🧪 ========================================================');
  console.log('🧪 BATERIA COMPLETA DE TESTES DE PRODUÇÃO & CADASTROS REAIS');
  console.log('🧪 Woobar Production Verification Suite');
  console.log('🧪 ========================================================\n');

  const results: { test: string; status: 'OK' | 'FAIL'; details?: any }[] = [];

  const assert = (name: string, ok: boolean, details?: any) => {
    if (ok) {
      console.log(`  ✅ [PASSOU] ${name}`);
      results.push({ test: name, status: 'OK' });
    } else {
      console.error(`  ❌ [FALHOU] ${name}:`, details);
      results.push({ test: name, status: 'FAIL', details });
    }
  };

  // 1. HEALTHCHECK
  console.log('1. Verificação de Saúde da API (Healthcheck)');
  const health = await req('/health');
  assert('Healthcheck /api/health online e banco operacional', health.status === 200 && health.data.status === 'ok');

  // 2. AUTENTICAÇÃO
  console.log('\n2. Autenticação Administrativa e Operacional');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@woobar.com', password: 'admin123' })
  });
  assert('Autenticação de Administrador', adminLogin.status === 200 && !!adminLogin.data.token);
  const adminToken = adminLogin.data.token;

  const waiterLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'pedro@woobar.com', password: '123456' })
  });
  assert('Autenticação de Garçom/Operador', waiterLogin.status === 200 && !!waiterLogin.data.token);
  const waiterToken = waiterLogin.data.token;

  // 3. CATEGORIAS DE PRODUTOS
  console.log('\n3. Categorias e Organização do Cardápio');
  const categoriesRes = await req('/products/categories', {}, adminToken);
  assert('Listagem de categorias do cardápio', categoriesRes.status === 200 && Array.isArray(categoriesRes.data));
  const categoryId = categoriesRes.data[0]?.id;

  // 4. CADASTRO DE PRODUTOS NOVOS COM DADOS FISCAIS
  console.log('\n4. Cadastro e Edição de Produtos (Bebida, Prato e Drink)');
  
  // Produto 1: Gin Tropical Artesanal
  const p1Res = await req('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Gin Tropical Sunset ' + Date.now().toString().slice(-4),
      description: 'Gin premium, xarope de maracujá, energético tropical e alecrim.',
      price: 36.90,
      category_id: categoryId,
      ncm: '22085000',
      cfop: '5102',
      csosn: '102',
      origin: 0,
      unit: 'UN'
    })
  }, adminToken);
  assert('Cadastro de Produto 1 (Drink Premium com NCM/CFOP)', p1Res.status === 201 && !!p1Res.data.id);
  const p1Id = p1Res.data.id;

  // Produto 2: Porção Isca de Peixe Crocante
  const p2Res = await req('/products', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Isca de Tilápia Crocante ' + Date.now().toString().slice(-4),
      description: '500g de filé de tilápia empanada na panko acompanhada de molho tártaro.',
      price: 58.00,
      category_id: categoryId,
      ncm: '16041900',
      cfop: '5102',
      csosn: '102',
      origin: 0,
      unit: 'UN'
    })
  }, adminToken);
  assert('Cadastro de Produto 2 (Porção Bar com NCM)', p2Res.status === 201 && !!p2Res.data.id);
  const p2Id = p2Res.data.id;

  // Atualização de Produto
  const updateP1 = await req(`/products/${p1Id}`, {
    method: 'PUT',
    body: JSON.stringify({
      price: 38.00,
      description: 'Gin premium, xarope de maracujá, energético tropical, laranja desidratada e alecrim.'
    })
  }, adminToken);
  assert('Edição e ajuste de preço do produto cadastrado', updateP1.status === 200 && updateP1.data.success);

  // Consulta do cardápio e verificação da presença dos novos produtos
  const allProductsRes = await req('/products', {}, adminToken);
  const p1Found = allProductsRes.data.find((p: any) => p.id === p1Id);
  assert('Produto novo refletido no cardápio ativo', !!p1Found && p1Found.price === 38.00);

  // 5. CAIXA & FLUXO FINANCEIRO
  console.log('\n5. Gestão de Frente de Caixa (Abertura)');
  // Abre o caixa se estiver fechado
  let cashOpen = await req('/financial/cash-register/open', {
    method: 'POST',
    body: JSON.stringify({ opening_balance: 300.00 })
  }, adminToken);
  if (cashOpen.status === 400 && cashOpen.data.error === 'Já existe um caixa aberto') {
    assert('Caixa já aberto e operacional', true);
  } else {
    assert('Abertura de caixa com fundo de troco R$ 300,00', cashOpen.status === 201);
  }

  // 6. MESAS & COMANDAS COM O NOVO PRODUTO CADASTRADO
  console.log('\n6. Atendimento de Mesa com o Novo Produto');
  const tables = await req('/tables', {}, waiterToken);
  let targetTable = tables.data.find((t: any) => t.status === 'free') || tables.data[0];
  assert('Mesa identificada para o teste', !!targetTable);

  // Abertura de comanda (ou aproveitamento/limpeza caso já houvesse uma aberta)
  let openTable = await req('/tables/orders', {
    method: 'POST',
    body: JSON.stringify({ table_id: targetTable.id, customer_name: 'Mesa Produção Teste' })
  }, waiterToken);

  let tableOrderId: string;
  if (openTable.status === 409 && openTable.data?.id) {
    // Fecha a comanda anterior que ficou aberta e abre uma nova
    await req(`/tables/orders/${openTable.data.id}/close`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: 'card' })
    }, waiterToken);
    openTable = await req('/tables/orders', {
      method: 'POST',
      body: JSON.stringify({ table_id: targetTable.id, customer_name: 'Mesa Produção Teste' })
    }, waiterToken);
  }

  tableOrderId = openTable.data?.id;
  assert('Abertura de comanda da mesa', openTable.status === 201 && !!tableOrderId);

  if (tableOrderId) {
    // Adiciona o Drink novo cadastrado
    const addItem1 = await req(`/tables/orders/${tableOrderId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: p1Id,
        quantity: 2,
        notes: 'Gelo extra e laranja desidratada'
      })
    }, waiterToken);
    assert('Adição do novo Drink na comanda com preço server-side', addItem1.status === 201 && addItem1.data.price === 38.00);

    // Adiciona a Porção nova
    const addItem2 = await req(`/tables/orders/${tableOrderId}/items`, {
      method: 'POST',
      body: JSON.stringify({
        product_id: p2Id,
        quantity: 1,
        notes: 'Molho tártaro à parte'
      })
    }, waiterToken);
    assert('Adição da nova Porção na comanda', addItem2.status === 201 && addItem2.data.price === 58.00);

    // Impressão da comanda para a cozinha/bar
    const printJob = await req(`/printing/table-order/${tableOrderId}`, { method: 'POST' }, waiterToken);
    assert('Geração de spool de impressão ESC/POS para o Bar', printJob.status === 200 && !!printJob.data.id);

    // Fechamento de mesa
    const closeTable = await req(`/tables/orders/${tableOrderId}/close`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: 'card' })
    }, waiterToken);
    assert('Fechamento e quitação da comanda no Cartão', closeTable.status === 200 && closeTable.data.success);

    // Libera mesa
    const freeTable = await req(`/tables/${targetTable.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'free' })
    }, waiterToken);
    assert('Mesa liberada e disponível para novos clientes', freeTable.status === 200 && freeTable.data.success);
  }

  // 7. PDV DIRETO / BALCÃO COM GERAÇÃO DE FICHA
  console.log('\n7. Bar & Fichas de Consumo com o Novo Drink');
  const tokenSale = await req('/tokens/sell', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ product_id: p1Id, name: 'Gin Tropical Sunset', quantity: 3, type: 'token' }],
      payment_method: 'pix'
    })
  }, waiterToken);
  assert('Venda de 3 fichas no balcão com cálculo do cardápio', tokenSale.status === 201 && tokenSale.data.codes?.length === 3);

  const testTokenCode = tokenSale.data.codes?.[0]?.code;
  if (testTokenCode) {
    const validateToken = await req('/tokens/validate', {
      method: 'POST',
      body: JSON.stringify({ code: testTokenCode })
    }, waiterToken);
    assert('Validação e entrega do Drink no bar pelo token', validateToken.status === 200 && validateToken.data.status === 'valid');

    const doubleValidate = await req('/tokens/validate', {
      method: 'POST',
      body: JSON.stringify({ code: testTokenCode })
    }, waiterToken);
    assert('Proteção contra fraude de ficha reutilizada', doubleValidate.status === 200 && doubleValidate.data.status === 'used');
  }

  // 8. DELIVERY & KANBAN
  console.log('\n8. Pedido Delivery & Notificação');
  const deliveryOrder = await req('/orders', {
    method: 'POST',
    body: JSON.stringify({
      customer_name: 'Ana Carolina Silva',
      customer_phone: '11999998888',
      customer_address: 'Rua das Flores, 123 - Apto 51',
      payment_method: 'pix',
      channel: 'website',
      items: [
        { product_id: p1Id, quantity: 1 },
        { product_id: p2Id, quantity: 1 }
      ]
    })
  }, waiterToken);
  assert('Criação de pedido delivery com novos produtos', deliveryOrder.status === 201 && !!deliveryOrder.data.id);
  const delivId = deliveryOrder.data.id;

  const updateDelivery = await req(`/orders/${delivId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'delivering' })
  }, waiterToken);
  assert('Avanço de status para despachado/em rota de entrega', updateDelivery.status === 200 && updateDelivery.data.success);

  // 9. TOTEM & AUTOATENDIMENTO PÚBLICO
  console.log('\n9. Totem de Autoatendimento');
  const kioskCatalog = await req('/kiosk/catalog');
  const kioskDrink = kioskCatalog.data.products?.find((p: any) => p.id === p1Id);
  assert('Novo produto disponível no Totem de Autoatendimento', !!kioskDrink);

  // 10. MÓDULO FISCAL
  console.log('\n10. Configurações Fiscais NFC-e');
  const fiscalSettings = await req('/fiscal/settings', {}, adminToken);
  assert('Endpoint de configurações fiscais ativo', fiscalSettings.status === 200);

  // 11. AUDITORIA E DRE
  console.log('\n11. Relatórios e DRE');
  const reports = await req('/financial/dashboard', {}, adminToken);
  assert('Consulta de resumo financeiro e vendas do dia no dashboard', reports.status === 200 && typeof reports.data.sales_today === 'number');

  const dre = await req('/financial/dre', {}, adminToken);
  assert('Consulta de Demonstrativo de Resultados (DRE)', dre.status === 200 && typeof dre.data.net === 'number');

  console.log('\n========================================================');
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL DE TESTES EXECUTADOS: ${results.length}`);
  console.log(`STATUS FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Erro na execução da bateria:', err);
  process.exit(1);
});
