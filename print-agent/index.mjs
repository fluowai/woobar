import net from 'node:net';

const apiUrl = (process.env.WOOBAR_API_URL || 'http://localhost:3002/api').replace(/\/$/, '');
const token = process.env.WOOBAR_PRINT_TOKEN || '';
const printerHost = process.env.PRINTER_HOST || '';
const printerPort = Number(process.env.PRINTER_PORT || 9100);
const paperWidth = Number(process.env.PRINTER_PAPER_WIDTH || 80);
const pollMs = Number(process.env.PRINT_POLL_MS || 2000);

if (!token || !printerHost) {
  console.error('Configure WOOBAR_PRINT_TOKEN e PRINTER_HOST antes de iniciar.');
  process.exit(1);
}

const ESC=0x1b, GS=0x1d;
const cmd=(...bytes)=>Buffer.from(bytes);
const txt=value=>Buffer.from(`${value}\n`,'utf8');
function qr(value,size=7){const data=Buffer.from(value,'utf8'),length=data.length+3,pL=length&255,pH=length>>8&255;return Buffer.concat([cmd(GS,40,107,4,0,49,65,50,0),cmd(GS,40,107,3,0,49,67,Math.max(1,Math.min(16,size))),cmd(GS,40,107,3,0,49,69,49),cmd(GS,40,107,pL,pH,49,80,48),data,cmd(GS,40,107,3,0,49,81,48)]);}
function receipt(doc){const cols=paperWidth===58?32:48,div='-'.repeat(cols),out=[cmd(ESC,64),cmd(ESC,97,1),cmd(ESC,69,1),cmd(GS,33,17),txt(doc.establishment),cmd(GS,33,0),txt(doc.title)];if(doc.subtitle)out.push(txt(doc.subtitle));out.push(txt(div));for(const line of doc.lines||[])out.push(txt(line.value?`${line.label}: ${line.value}`:line.label));if(doc.code)out.push(txt(div),cmd(ESC,69,1),cmd(GS,33,17),txt(doc.code),cmd(GS,33,0),cmd(ESC,69,0));if(doc.qrValue)out.push(txt(''),qr(doc.qrValue,paperWidth===58?6:8),txt(''));out.push(txt(doc.footer||'Apresente este comprovante para validacao.'),txt(''),txt(''),cmd(GS,86,66,0));return Buffer.concat(out);}
function print(data){return new Promise((resolve,reject)=>{const socket=net.createConnection({host:printerHost,port:printerPort});const timer=setTimeout(()=>socket.destroy(new Error('Tempo limite da impressora')),7000);socket.once('connect',()=>socket.end(data));socket.once('error',e=>{clearTimeout(timer);reject(e)});socket.once('close',bad=>{clearTimeout(timer);if(!bad)resolve()});});}
async function request(path,options={}){const response=await fetch(`${apiUrl}${path}`,{...options,headers:{'Content-Type':'application/json','X-Print-Agent-Token':token,...options.headers}});if(!response.ok)throw new Error(`API ${response.status}: ${await response.text()}`);return response.json();}
async function cycle(){try{const {job}=await request('/printing/agent/next');if(!job)return;try{await print(receipt(job.payload));await request(`/printing/agent/jobs/${job.id}/complete`,{method:'POST',body:JSON.stringify({success:true})});console.log(`[OK] ${job.type} ${job.id}`);}catch(error){await request(`/printing/agent/jobs/${job.id}/complete`,{method:'POST',body:JSON.stringify({success:false,error:error.message})});console.error(`[ERRO] ${job.id}: ${error.message}`);}}catch(error){console.error(`[CONEXAO] ${error.message}`);}}
console.log(`Woobar Print Agent ativo. API=${apiUrl} Impressora=${printerHost}:${printerPort}`);
setInterval(cycle,pollMs); cycle();
