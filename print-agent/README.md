# Woobar Print Agent

O agente roda dentro do estabelecimento e conecta a fila online do Woobar a uma impressora termica ESC/POS local.

## Requisitos

- Um computador Windows, Linux ou mini-PC ligado durante a operacao.
- Node.js 20 ou superior.
- Impressora termica acessivel pelo agente, normalmente na porta TCP 9100.

## Configuracao

1. No Woobar, abra `Impressao` e ative o modo `Online com agente local`.
2. Clique em `Gerar chave`.
3. Abra um terminal nesta pasta.
4. Configure as variaveis e execute `npm start`:

```powershell
$env:WOOBAR_API_URL='https://seu-dominio.com/api'
$env:WOOBAR_PRINT_TOKEN='chave-gerada-no-painel'
$env:PRINTER_HOST='192.168.1.50'
$env:PRINTER_PORT='9100'
$env:PRINTER_PAPER_WIDTH='80'
npm start
```

O agente busca trabalhos pendentes, imprime texto, numero e QR Code e informa o resultado ao Woobar. Trabalhos com erro ficam registrados para reenvio.
