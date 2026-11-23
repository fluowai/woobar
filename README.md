<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5f8ecdd6-ce39-40f6-b9b4-9d6ea95c47fd

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
# Deploy Docker

O backend exige `JWT_SECRET` em produção e encerra o processo quando a variável não existe. No Portainer, defina estas variáveis no ambiente da Stack antes do deploy:

- `JWT_SECRET`: segredo aleatório com pelo menos 32 caracteres (`openssl rand -hex 32`)
- `APP_DOMAIN`: domínio público sem protocolo
- `APP_URL`: URL pública completa
- `CORS_ORIGIN`: mesma origem permitida pelo frontend
- `FISCAL_TOKEN`: token compartilhado com o serviço fiscal

O arquivo `server/.env.example` contém um modelo. Não coloque valores reais de produção no Git nem no bundle frontend.
