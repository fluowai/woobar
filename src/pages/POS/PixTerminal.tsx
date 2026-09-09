import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, CreditCard, Delete, DollarSign, Smartphone, CheckCircle2, XCircle } from 'lucide-react';

export default function PixTerminal() {
  const [amount, setAmount] = useState('0');
  const [step, setStep] = useState<'input' | 'method' | 'processing' | 'qrcode' | 'success' | 'error'>('input');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | null>(null);

  const displayAmount = (parseInt(amount) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleKeyPress = (key: string) => {
    if (key === 'clear') {
      setAmount('0');
      return;
    }
    if (key === 'backspace') {
      setAmount(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }
    setAmount(prev => (prev === '0' ? key : prev + key));
  };

  const processPayment = () => {
    setStep('processing');
    
    // Simula comunicação com gateway (Asaas, MercadoPago, etc)
    setTimeout(() => {
      setStep('qrcode');
    }, 1500);
  };

  const finishPayment = () => {
    setStep('success');
    printTicket();
  };

  const printTicket = () => {
    // Para Smart POS (Android), o window.print() aciona a bobina térmica integrada
    // ou abre a tela de impressão do sistema.
    const printContent = `
      <div style="font-family: monospace; text-align: center; width: 300px; padding: 20px;">
        <h2 style="margin:0 0 10px 0;">WooBar</h2>
        <p style="margin:0; font-size: 12px;">Comprovante PIX</p>
        <p style="margin:5px 0;">------------------------</p>
        <h1 style="margin:10px 0;">${displayAmount}</h1>
        <p style="margin:5px 0;">------------------------</p>
        <p style="margin:0; font-size: 12px;">Data: ${new Date().toLocaleString()}</p>
        <p style="font-size: 10px; margin-top: 15px;">Obrigado pela preferência!</p>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Imprimir Ticket</title></head><body>');
      printWindow.document.write(printContent);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      
      // Auto-print after render
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const resetTerminal = () => {
    setAmount('0');
    setStep('input');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-stone-900 rounded-[3rem] p-4 shadow-2xl border-[8px] border-stone-800 relative overflow-hidden">
        
        {/* Terminal Header/Status */}
        <div className="flex justify-between items-center px-4 py-2 mb-4">
          <div className="flex items-center gap-2 text-stone-500">
            <Smartphone className="w-4 h-4" />
            <span className="text-xs font-bold font-mono tracking-widest">POS V2.0</span>
          </div>
          <div className="w-10 h-3 bg-stone-800 rounded-full flex items-center p-1">
            <div className="w-4 h-1.5 bg-emerald-500 rounded-full" />
          </div>
        </div>

        {/* Display Screen */}
        <div className="bg-stone-50 rounded-2xl p-6 h-64 mb-6 shadow-inner relative flex flex-col items-center justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            
            {step === 'input' && (
              <motion.div 
                key="input"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="text-center w-full"
              >
                <p className="text-stone-400 font-bold uppercase tracking-wider text-xs mb-2">Digite o Valor</p>
                <h2 className="text-4xl font-mono font-bold text-stone-900 mb-6 truncate">{displayAmount}</h2>
                <button
                  disabled={amount === '0'}
                  onClick={processPayment}
                  className="w-full bg-teal-500 text-white flex items-center justify-center gap-2 font-bold py-3 rounded-xl disabled:opacity-50 disabled:bg-stone-300 transition-all hover:bg-teal-600 active:scale-95"
                >
                  <QrCode className="w-5 h-5" /> Gerar PIX
                </button>
              </motion.div>
            )}

            {step === 'processing' && (
              <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-stone-200 border-t-orange-500 rounded-full animate-spin mb-4" />
                <p className="text-stone-500 font-bold animate-pulse text-sm">Conectando Gateway...</p>
              </motion.div>
            )}

            {step === 'qrcode' && (
              <motion.div key="qrcode" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center w-full">
                <p className="text-teal-600 font-bold text-sm mb-2">Escaneie para pagar</p>
                {/* Fake QR Code */}
                <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-sm border border-stone-200 mb-3 flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-stone-900" />
                </div>
                <p className="font-mono font-bold text-stone-900 text-lg mb-2">{displayAmount}</p>
                <button onClick={finishPayment} className="w-full bg-teal-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-teal-600">
                  Simular Pagamento OK
                </button>
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-1">Aprovado</h3>
                <p className="text-stone-500 font-mono text-sm mb-6">{displayAmount}</p>
                <button onClick={resetTerminal} className="bg-stone-900 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-stone-800">
                  Nova Venda
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 px-2 pb-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="bg-stone-800 hover:bg-stone-700 text-white text-2xl font-mono py-4 rounded-xl active:bg-stone-600 transition-colors"
            >
              {num}
            </button>
          ))}
          <button
            onClick={() => handleKeyPress('clear')}
            className="bg-red-500/20 text-red-500 hover:bg-red-500/30 text-sm font-bold uppercase py-4 rounded-xl transition-colors flex items-center justify-center"
          >
            Canc
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="bg-stone-800 hover:bg-stone-700 text-white text-2xl font-mono py-4 rounded-xl active:bg-stone-600 transition-colors"
          >
            0
          </button>
          <button
            onClick={() => handleKeyPress('backspace')}
            className="bg-stone-700 hover:bg-stone-600 text-white text-2xl py-4 rounded-xl active:bg-stone-500 transition-colors flex items-center justify-center"
          >
            <Delete className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
