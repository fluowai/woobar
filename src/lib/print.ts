export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface ReceiptData {
  title: string;
  subtitle?: string;
  items: ReceiptItem[];
  total: number;
  paymentMethod?: string;
  code?: string;
  codeLabel?: string;
  date?: string;
  footer?: string;
}

function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

function formatDate(date?: string): string {
  if (!date) return new Date().toLocaleString('pt-BR');
  return new Date(date).toLocaleString('pt-BR');
}

export function generateReceiptHTML(data: ReceiptData): string {
  const width = '300px';

  return `
    <div style="font-family: 'Courier New', monospace; text-align: center; width: ${width}; padding: 16px; font-size: 12px; line-height: 1.4;">
      <div style="text-align: center; margin-bottom: 8px;">
        <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold;">${data.title}</h2>
        ${data.subtitle ? `<p style="margin: 0; font-size: 11px; color: #666;">${data.subtitle}</p>` : ''}
      </div>
      <p style="margin: 4px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0;">------------------------</p>

      ${data.date ? `<p style="margin: 0; font-size: 11px; text-align: left;">Data: ${formatDate(data.date)}</p>` : ''}
      ${data.paymentMethod ? `<p style="margin: 0; font-size: 11px; text-align: left;">Pagamento: ${data.paymentMethod.toUpperCase()}</p>` : ''}

      ${data.items.length > 0 ? `
        <p style="margin: 8px 0 4px 0; font-weight: bold; text-align: left;">ITENS</p>
        ${data.items.map(item => `
          <div style="margin: 4px 0; text-align: left;">
            <span style="font-weight: bold;">${item.quantity}x ${item.name}</span><br/>
            <span style="font-size: 11px;">${formatCurrency(item.price)} un. = ${formatCurrency(item.total)}</span>
          </div>
        `).join('')}
      ` : ''}

      <p style="margin: 4px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0;">------------------------</p>

      <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; margin: 4px 0;">
        <span>TOTAL</span>
        <span>${formatCurrency(data.total)}</span>
      </div>

      ${data.code ? `
        <div style="margin: 8px 0; padding: 8px; border: 1px solid #000; background: #fafafa;">
          <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: bold;">${data.codeLabel || 'CÓDIGO'}</p>
          <p style="margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 2px;">${data.code}</p>
        </div>
      ` : ''}

      ${data.footer ? `<p style="margin: 8px 0 0 0; font-size: 10px; color: #666;">${data.footer}</p>` : ''}

      <p style="margin: 8px 0 0 0; font-size: 10px; color: #999;">Impresso em ${formatDate()}</p>
    </div>
  `;
}

export function printReceipt(data: ReceiptData): void {
  const printContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Imprimir Cupom</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        ${generateReceiptHTML(data)}
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  }
}

export function printTicketHTML(title: string, code: string, itemName: string, price: number, date?: string): void {
  printReceipt({
    title,
    subtitle: itemName,
    items: [{ name: itemName, quantity: 1, price, total: price }],
    total: price,
    code,
    codeLabel: 'CÓDIGO / FICHA',
    date
  });
}
