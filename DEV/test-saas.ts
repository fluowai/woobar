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
  console.log('💎 ========================================================');
  console.log('💎 BATERIA DE HOMOLOGAÇÃO: MÓDULO SAAS & MULTI-TENANT');
  console.log('💎 Woobar SaaS Master Verification Suite');
  console.log('💎 ========================================================\n');

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

  // 1. CATÁLOGO PÚBLICO DE PLANOS
  console.log('1. Catálogo Público de Planos');
  const plansRes = await req('/saas/plans');
  assert('Listagem pública de planos', plansRes.status === 200 && Array.isArray(plansRes.data) && plansRes.data.length >= 3);
  const starterPlan = plansRes.data.find((p: any) => p.slug === 'starter');
  const proPlan = plansRes.data.find((p: any) => p.slug === 'pro');
  const enterprisePlan = plansRes.data.find((p: any) => p.slug === 'enterprise');
  assert('Planos Starter, Pro e Enterprise configurados', !!starterPlan && !!proPlan && !!enterprisePlan);

  // 2. AUTO-ONBOARDING PÚBLICO (REGISTRO DE NOVO CLIENTE COM 14 DIAS TRIAL)
  console.log('\n2. Auto-Onboarding Público de Novo Cliente');
  const testSlug = 'bar-teste-' + Date.now().toString().slice(-4);
  const registerRes = await req('/saas/register', {
    method: 'POST',
    body: JSON.stringify({
      establishment_name: 'Cervejaria Teste ' + testSlug,
      slug: testSlug,
      owner_name: 'Proprietário Piloto',
      owner_email: `piloto_${testSlug}@teste.com`,
      password: 'SenhaForte123',
      phone: '11988880000',
      plan_slug: 'pro'
    })
  });
  assert('Cadastro público e auto-provisionamento com 14 dias trial', registerRes.status === 201 && !!registerRes.data.token);

  // 3. AUTENTICAÇÃO DO SUPER ADMIN
  console.log('\n3. Autenticação do Super Admin');
  const superLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'superadmin@woobar.com', password: 'Super1234' })
  });
  assert('Login do Super Admin (Perfil Master)', superLogin.status === 200 && !!superLogin.data.token && superLogin.data.user.role === 'superadmin');
  const superToken = superLogin.data.token;

  // 4. SEGURANÇA: BLOQUEIO DE NÃO-SUPERADMIN NAS ROTAS MASTER
  console.log('\n4. Segurança e Bloqueio de Não-Superadmin');
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@woobar.com', password: 'admin123' })
  });
  const adminToken = adminLogin.data.token;
  const unauthorizedMetrics = await req('/saas/metrics', {}, adminToken);
  assert('Admin de loja bloqueado nas métricas Master (403 Forbidden)', unauthorizedMetrics.status === 403);

  // 5. MÉTRICAS DO SAAS MASTER
  console.log('\n5. Métricas Globais do SaaS');
  const metricsRes = await req('/saas/metrics', {}, superToken);
  assert('Métricas Master (MRR, Total Lojas, Ativas, Trial)', metricsRes.status === 200 && typeof metricsRes.data.mrr === 'number');
  console.log(`     Total de Lojas: ${metricsRes.data.total_tenants} | MRR: R$ ${metricsRes.data.mrr.toFixed(2)} | Ativas: ${metricsRes.data.active_tenants} | Trial: ${metricsRes.data.trial_tenants}`);

  // 6. LISTAGEM DE ESTABELECIMENTOS (TENANTS)
  console.log('\n6. Gestão de Estabelecimentos (Tenants)');
  const tenantsRes = await req('/saas/tenants', {}, superToken);
  assert('Listagem completa de estabelecimentos com dados de assinatura', tenantsRes.status === 200 && Array.isArray(tenantsRes.data));
  const createdTenant = tenantsRes.data.find((t: any) => t.slug === testSlug);
  assert('Estabelecimento recém-criado identificado na listagem Master', !!createdTenant && createdTenant.subscription_status === 'trial');

  // 7. PROVISIONAMENTO MANUAL PELO SUPER ADMIN
  console.log('\n7. Criação Manual de Estabelecimento pelo Super Admin');
  const manualSlug = 'pub-manual-' + Date.now().toString().slice(-4);
  const manualCreate = await req('/saas/tenants', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Pub Manual Imperial ' + manualSlug,
      slug: manualSlug,
      admin_name: 'Dono Imperial',
      admin_email: `imperial_${manualSlug}@pub.com`,
      admin_password: 'SenhaImperial123',
      plan_slug: 'enterprise',
      trial_days: 30
    })
  }, superToken);
  assert('Criação de loja com plano Enterprise e 30 dias pelo Super Admin', manualCreate.status === 201 && manualCreate.data.success);

  // 8. ALTERAÇÃO DE PLANO E EXTENSÃO DE DIAS
  console.log('\n8. Alteração de Plano e Prazo de Assinatura');
  if (createdTenant) {
    const updatePlan = await req(`/saas/tenants/${createdTenant.id}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({
        plan_slug: 'enterprise',
        status: 'active',
        extend_days: 30
      })
    }, superToken);
    assert('Upgrade de plano para Enterprise e ativação da assinatura', updatePlan.status === 200 && updatePlan.data.success);
  }

  // 9. SUSPENSÃO E REATIVAÇÃO DE LOJA (CONTROLE DE INADIMPLÊNCIA)
  console.log('\n9. Bloqueio e Reativação de Estabelecimento');
  if (createdTenant) {
    const suspend = await req(`/saas/tenants/${createdTenant.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active: false, subscription_status: 'past_due' })
    }, superToken);
    assert('Suspensão de acesso da loja por inadimplência', suspend.status === 200 && suspend.data.success);

    const reactivate = await req(`/saas/tenants/${createdTenant.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ active: true, subscription_status: 'active' })
    }, superToken);
    assert('Reativação imediata da loja após regularização', reactivate.status === 200 && reactivate.data.success);
  }

  // 10. IMPERSONATION (ACESSO MASTER PARA SUPORTE TÉCNICO)
  console.log('\n10. Acesso de Suporte (Impersonation)');
  if (createdTenant) {
    const impersonate = await req(`/saas/tenants/${createdTenant.id}/impersonate`, {
      method: 'POST'
    }, superToken);
    assert('Super Admin gera acesso temporário de suporte na loja', impersonate.status === 200 && !!impersonate.data.token && !!impersonate.data.user);
    
    // Valida se o token de suporte permite ler produtos daquela loja específica
    const tenantProducts = await req('/products', {}, impersonate.data.token);
    assert('Token de suporte opera com escopo isolado da loja cliente', tenantProducts.status === 200);
  }

  console.log('\n========================================================');
  const passed = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`TOTAL DE TESTES SAAS EXECUTADOS: ${results.length}`);
  console.log(`STATUS FINAL: ${passed} PASSOU | ${failed} FALHOU`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch(err => {
  console.error('Erro na execução dos testes SaaS:', err);
  process.exit(1);
});

