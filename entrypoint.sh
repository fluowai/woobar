#!/bin/sh

# Cria o arquivo env-config.js injetando as variáveis de ambiente atuais do container
cat <<EOF > /usr/share/nginx/html/env-config.js
window.ENV = {
  VITE_SUPABASE_URL: "$VITE_SUPABASE_URL",
  VITE_SUPABASE_ANON_KEY: "$VITE_SUPABASE_ANON_KEY"
};
EOF

# Executa o comando principal (nginx)
exec "$@"
