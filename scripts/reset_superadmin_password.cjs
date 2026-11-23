const { Client } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:Bfu8zdwZVmixCpyd@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const NEW_PASSWORD = process.argv[2];

if (!NEW_PASSWORD || NEW_PASSWORD.length < 8) {
  console.error('Uso: node reset_superadmin_password.cjs <nova_senha_min_8_chars>');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const authRes = await client.query(
      "SELECT id, email, encrypted_password, created_at FROM auth.users WHERE email = 'superadmin@woobar.com'"
    );

    if (authRes.rows.length === 0) {
      console.log('Usuario superadmin@woobar.com NAO encontrado em auth.users.');
      await client.end();
      process.exit(1);
    }

    const user = authRes.rows[0];
    console.log('Usuario encontrado:', user.id, user.email);
    console.log('Criado em:', user.created_at);

    const pubRes = await client.query(
      'SELECT id, name, role, tenant_id, reseller_id FROM public.users WHERE id = $1',
      [user.id]
    );
    console.log('Perfil public.users:', JSON.stringify(pubRes.rows[0] || null, null, 2));

    const upd = await client.query(
      `UPDATE auth.users
         SET encrypted_password = crypt($1, gen_salt('bf', 10)),
             email_confirmed_at = COALESCE(email_confirmed_at, now()),
             updated_at = now(),
             confirmation_token = '',
             recovery_token = ''
       WHERE id = $2
       RETURNING id, email, email_confirmed_at, updated_at`,
      [NEW_PASSWORD, user.id]
    );

    if (upd.rowCount !== 1) {
      throw new Error('Falha ao atualizar senha: rowCount=' + upd.rowCount);
    }

    const verify = await client.query(
      `SELECT id, email,
              encrypted_password = crypt($1, encrypted_password) AS senha_ok
       FROM auth.users WHERE id = $2`,
      [NEW_PASSWORD, user.id]
    );

    console.log('Senha atualizada em:', upd.rows[0].updated_at);
    console.log('Verificacao hash:', verify.rows[0].senha_ok ? 'OK' : 'FALHOU');

    if (verify.rows[0].senha_ok) {
      console.log('\nCREDENCIAIS:');
      console.log('Email: superadmin@woobar.com');
      console.log('Senha: ' + NEW_PASSWORD);
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error('ERRO:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
