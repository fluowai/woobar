import 'dotenv/config';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`❌ Variável de ambiente obrigatória não definida: ${name}. Verifique o arquivo .env`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const env = {
  PORT: parseInt(optionalEnv('PORT', '3001'), 10),
  JWT_SECRET: (() => {
    const secret = requireEnv('JWT_SECRET');
    const weakSecrets = ['woobar-super-secret-key-change-in-production', 'secret', 'changeme', 'password'];
    if (weakSecrets.includes(secret.toLowerCase())) {
      throw new Error('❌ JWT_SECRET é muito fraco. Defina uma chave forte e única no .env');
    }
    if (secret.length < 32) {
      throw new Error('❌ JWT_SECRET deve ter no mínimo 32 caracteres. Gere uma com: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    }
    return secret;
  })(),
  GEMINI_API_KEY: optionalEnv('GEMINI_API_KEY', ''),
  DATABASE_PATH: optionalEnv('DATABASE_PATH', './data/woobar.db'),
  APP_URL: optionalEnv('APP_URL', 'http://localhost:3000'),
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  CORS_ORIGIN: optionalEnv('CORS_ORIGIN', 'http://localhost:3000'),
};
