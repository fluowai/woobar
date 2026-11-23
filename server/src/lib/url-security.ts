import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIp(address: string): boolean {
  if (net.isIPv4(address)) {
    const [a, b] = address.split('.').map(Number);
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
  }
  if (net.isIPv6(address)) {
    const normalized = address.toLowerCase();
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb');
  }
  return false;
}

export async function assertSafeOutboundUrl(input: string): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('URL de integração inválida'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) throw new Error('URL de integração deve usar HTTP(S) sem credenciais embutidas');
  const hostname = url.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '0.0.0.0' || hostname === '::1') throw new Error('URL de integração aponta para host local');
  if (net.isIP(hostname) && isPrivateIp(hostname)) throw new Error('URL de integração aponta para rede privada');
  const addresses = await dns.lookup(hostname, { all: true });
  if (addresses.some(({ address }) => isPrivateIp(address))) throw new Error('URL de integração resolve para rede privada');
  return url;
}
