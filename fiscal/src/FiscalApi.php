<?php
declare(strict_types=1);

namespace Woobar\Fiscal;

use DateTime;
use DOMDocument;
use DOMXPath;
use NFePHP\Common\Certificate;
use NFePHP\NFe\Common\Standardize;
use NFePHP\NFe\Complements;
use NFePHP\NFe\Make;
use NFePHP\NFe\Tools;
use RuntimeException;
use Throwable;

class FiscalApi
{
    private const CSTAT_AUTORIZADA = ['100', '150'];
    private const CSTAT_DENEGADA = ['110', '301', '302', '303', '304', '305'];
    private const CSTAT_EVENTO_OK = ['135', '136', '155'];

    public function status(array $data): array
    {
        $tools = $this->tools($data);
        $response = $tools->sefazStatus();
        $std = (new Standardize($response))->toStd();
        $codigo = (string) ($std->cStat ?? 0);
        return [
            'status' => $codigo === '107' ? 'ok' : 'indisponivel',
            'codigo' => $codigo,
            'motivo' => (string) ($std->xMotivo ?? ''),
            'xml' => $response,
        ];
    }

    public function emitir(array $data): array
    {
        $empresa = $this->requireArray($data, 'empresa');
        $nota = $this->requireArray($data, 'nota');
        $this->requireField($nota, 'numero');
        $this->requireField($nota, 'itens');
        if (!is_array($nota['itens']) || count($nota['itens']) === 0) {
            throw new RuntimeException('nota.itens deve conter ao menos um item');
        }

        $tools = $this->tools($data);
        $tools->model('65');

        $make = new Make();
        $this->buildIde($make, $empresa, $nota, $tools);
        $this->buildEmit($make, $empresa);

        $dest = $nota['destinatario'] ?? null;
        if (is_array($dest) && count($dest) > 0) {
            $this->buildDest($make, $dest);
        }

        $this->buildItens($make, $nota['itens']);

        $icmstot = new \stdClass();
        $make->tagicmstot($icmstot);

        $transp = new \stdClass();
        $transp->modFrete = 9;
        $make->tagtransp($transp);

        $this->buildPag($make, $nota);

        if (!empty($nota['infAdic']) && is_array($nota['infAdic'])) {
            $inf = new \stdClass();
            $inf->infAdFisco = $nota['infAdic']['infAdFisco'] ?? null;
            $inf->infCpl = $nota['infAdic']['infCpl'] ?? null;
            $make->taginfadic($inf);
        }

        if (method_exists($make, 'monta')) {
            $make->monta();
        } else {
            $make->render();
        }
        $xml = $make->getXML();
        $xml = $tools->signNFe($xml);

        $ambiente = (int) ($empresa['ambiente'] ?? 2);
        $idLote = str_pad((string) random_int(1, 999999999), 15, '0', STR_PAD_LEFT);
        $response = $tools->sefazEnviaLote([$xml], $idLote, 1);
        $std = (new Standardize($response))->toStd();

        $loteStat = (string) ($std->cStat ?? '');
        if ($loteStat !== '104') {
            return [
                'status' => 'rejeitada',
                'codigo' => $loteStat,
                'motivo' => (string) ($std->xMotivo ?? 'Lote não processado pela SEFAZ'),
                'chave' => '',
                'protocolo' => '',
                'xml' => $response,
                'qrcode' => '',
                'ambiente' => $ambiente,
            ];
        }

        $infProt = $std->protNFe->infProt ?? null;
        if ($infProt === null) {
            return [
                'status' => 'erro',
                'codigo' => '0',
                'motivo' => 'Protocolo ausente na resposta da SEFAZ',
                'chave' => '',
                'protocolo' => '',
                'xml' => $response,
                'qrcode' => '',
                'ambiente' => $ambiente,
            ];
        }

        $cStat = (string) $infProt->cStat;
        $motivo = (string) ($infProt->xMotivo ?? '');
        $chave = (string) ($infProt->chNFe ?? '');
        $nProt = (string) ($infProt->nProt ?? '');

        $autorizada = in_array($cStat, self::CSTAT_AUTORIZADA, true);
        $authorizedXml = null;
        if ($autorizada) {
            $authorizedXml = Complements::toAuthorize($xml, $response);
            $this->storeXml($authorizedXml, $chave, $ambiente);
        }

        $status = $autorizada
            ? 'autorizada'
            : (in_array($cStat, self::CSTAT_DENEGADA, true) ? 'denegada' : 'rejeitada');

        return [
            'status' => $status,
            'codigo' => $cStat,
            'motivo' => $motivo,
            'chave' => $chave,
            'protocolo' => $nProt,
            'xml' => $authorizedXml,
            'qrcode' => $authorizedXml !== null ? $this->extractQrCode($authorizedXml) : '',
            'ambiente' => $ambiente,
        ];
    }

    public function cancelar(array $data): array
    {
        $empresa = $this->requireArray($data, 'empresa');
        $chave = (string) ($data['chave'] ?? '');
        $justificativa = trim((string) ($data['justificativa'] ?? ''));
        $protocolo = (string) ($data['protocolo'] ?? '');

        if (strlen($chave) !== 44) {
            throw new RuntimeException('chave deve conter 44 dígitos');
        }
        if (mb_strlen($justificativa) < 15 || mb_strlen($justificativa) > 255) {
            throw new RuntimeException('justificativa deve ter entre 15 e 255 caracteres');
        }
        if ($protocolo === '') {
            throw new RuntimeException('protocolo de autorização é obrigatório');
        }

        $tools = $this->tools($data);
        $tools->model('65');
        $response = $tools->sefazCancela($chave, $justificativa, $protocolo);
        $std = (new Standardize($response))->toStd();

        $eventoStat = (string) ($std->cStat ?? '');
        if ($eventoStat !== '128') {
            return [
                'status' => 'rejeitada',
                'codigo' => $eventoStat,
                'motivo' => (string) ($std->xMotivo ?? 'Evento não processado'),
                'protocolo' => '',
                'xml' => $response,
            ];
        }

        $infEvento = $std->retEvento->infEvento ?? null;
        if ($infEvento === null) {
            throw new RuntimeException('Retorno do evento de cancelamento ausente');
        }
        $cStat = (string) $infEvento->cStat;
        $ok = in_array($cStat, self::CSTAT_EVENTO_OK, true);

        $eventXml = null;
        if ($ok) {
            $eventXml = Complements::toAuthorize($tools->lastRequest, $response);
        }

        return [
            'status' => $ok ? 'cancelada' : 'rejeitada',
            'codigo' => $cStat,
            'motivo' => (string) ($infEvento->xMotivo ?? ''),
            'protocolo' => (string) ($infEvento->nProt ?? ''),
            'xml' => $eventXml ?? $response,
        ];
    }

    public function inutilizar(array $data): array
    {
        $empresa = $this->requireArray($data, 'empresa');
        $serie = (int) ($data['serie'] ?? 1);
        $ini = (int) ($data['numero_inicial'] ?? 0);
        $fim = (int) ($data['numero_final'] ?? 0);
        $justificativa = trim((string) ($data['justificativa'] ?? ''));
        $ambiente = (int) ($empresa['ambiente'] ?? 2);

        if ($ini < 1 || $fim < $ini) {
            throw new RuntimeException('Faixa de numeração inválida');
        }
        if (mb_strlen($justificativa) < 15 || mb_strlen($justificativa) > 255) {
            throw new RuntimeException('justificativa deve ter entre 15 e 255 caracteres');
        }

        $tools = $this->tools($data);
        $tools->model('65');
        $response = $tools->sefazInutiliza($serie, $ini, $fim, $justificativa, $ambiente);
        $std = (new Standardize($response))->toStd();

        $codigo = (string) ($std->cStat ?? '');
        $ok = $codigo === '102';

        return [
            'status' => $ok ? 'inutilizada' : 'rejeitada',
            'codigo' => $codigo,
            'motivo' => (string) ($std->xMotivo ?? ''),
            'xml' => $response,
        ];
    }

    private function tools(array $data): Tools
    {
        $empresa = $this->requireArray($data, 'empresa');
        foreach (['razaosocial', 'cnpj', 'siglaUF'] as $field) {
            $this->requireField($empresa, $field);
        }
        $certificado = $this->requireArray($data, 'certificado');
        $this->requireField($certificado, 'pfx_base64');
        $this->requireField($certificado, 'senha');

        $pfx = base64_decode((string) $certificado['pfx_base64'], true);
        if ($pfx === false || $pfx === '') {
            throw new RuntimeException('certificado.pfx_base64 inválido');
        }

        $config = [
            'atualizacao' => date('Y-m-d H:i:s'),
            'tpAmb' => (int) ($empresa['ambiente'] ?? 2),
            'razaosocial' => (string) $empresa['razaosocial'],
            'cnpj' => preg_replace('/\D/', '', (string) $empresa['cnpj']),
            'siglaUF' => strtoupper((string) $empresa['siglaUF']),
            'schemes' => (string) ($empresa['schemes'] ?? 'PL_009_V4'),
            'versao' => (string) ($empresa['versao'] ?? '4.00'),
            'tokenIBPT' => (string) ($empresa['tokenIBPT'] ?? ''),
            'CSC' => (string) ($empresa['csc'] ?? ''),
            'CSCid' => (string) ($empresa['cscid'] ?? ''),
            'proxyConf' => [
                'proxyIp' => '',
                'proxyPort' => '',
                'proxyUser' => '',
                'proxyPass' => '',
            ],
        ];

        return new Tools(json_encode($config), Certificate::readPfx($pfx, (string) $certificado['senha']));
    }

    private function buildIde(Make $make, array $empresa, array $nota, Tools $tools): void
    {
        $endereco = is_array($empresa['endereco'] ?? null) ? $empresa['endereco'] : [];
        $cMunFG = (int) ($nota['cMunFG'] ?? ($endereco['cMun'] ?? 0));
        if ($cMunFG <= 0) {
            throw new RuntimeException('endereco.cMun do emitente é obrigatório');
        }

        $std = new \stdClass();
        $std->cUF = $tools->getcUF((string) $empresa['siglaUF']);
        $std->cNF = str_pad((string) random_int(0, 99999999), 8, '0', STR_PAD_LEFT);
        $std->natOp = (string) ($nota['natOp'] ?? 'VENDA AO CONSUMIDOR');
        $std->mod = 65;
        $std->serie = (int) ($nota['serie'] ?? 1);
        $std->nNF = (int) $nota['numero'];
        $std->dhEmi = (new DateTime('now'))->format('Y-m-d\TH:i:sP');
        $std->dhSaiEnt = null;
        $std->tpNF = (int) ($nota['tpNF'] ?? 1);
        $std->idDest = 1;
        $std->cMunFG = $cMunFG;
        $std->tpImp = (int) ($nota['tpImp'] ?? 4);
        $std->tpEmis = (int) ($nota['tpEmis'] ?? 1);
        $std->cDV = 0;
        $std->tpAmb = (int) ($empresa['ambiente'] ?? 2);
        $std->finNFe = (int) ($nota['finNFe'] ?? 1);
        $std->indFinal = 1;
        $std->indPres = (int) ($nota['indPres'] ?? 1);
        $std->procEmi = (int) ($nota['procEmi'] ?? 0);
        $std->verProc = (string) ($nota['verProc'] ?? 'Woobar 1.0');
        $std->dhCont = null;
        $std->xJust = null;
        $make->tagIde($std);
    }

    private function buildEmit(Make $make, array $empresa): void
    {
        $std = new \stdClass();
        $std->xNome = (string) $empresa['razaosocial'];
        $std->xFant = (string) ($empresa['fantasia'] ?? $empresa['razaosocial']);
        $std->IE = (string) ($empresa['ie'] ?? '');
        if ($std->IE === '') {
            throw new RuntimeException('empresa.ie é obrigatório');
        }
        if (!empty($empresa['im'])) {
            $std->IM = (string) $empresa['im'];
        }
        if (!empty($empresa['cnae'])) {
            $std->CNAE = (string) $empresa['cnae'];
        }
        $std->CRT = (int) ($empresa['crt'] ?? 1);
        $cnpj = preg_replace('/\D/', '', (string) $empresa['cnpj']);
        if ($cnpj !== '' && $cnpj !== null) {
            $std->CNPJ = $cnpj;
        } else {
            $cpf = preg_replace('/\D/', '', (string) ($empresa['cpf'] ?? ''));
            if ($cpf === '' || $cpf === null) {
                throw new RuntimeException('empresa.cnpj ou empresa.cpf é obrigatório');
            }
            $std->CPF = $cpf;
        }
        $make->tagemit($std);

        $end = $empresa['endereco'] ?? null;
        if (!is_array($end)) {
            throw new RuntimeException('empresa.endereco é obrigatório');
        }
        foreach (['xLgr', 'nro', 'xBairro', 'cMun', 'xMun', 'UF', 'CEP'] as $field) {
            $this->requireField($end, "endereco.{$field}");
        }
        $ender = new \stdClass();
        $ender->xLgr = (string) $end['xLgr'];
        $ender->nro = (string) $end['nro'];
        $ender->xCpl = !empty($end['xCpl']) ? (string) $end['xCpl'] : null;
        $ender->xBairro = (string) $end['xBairro'];
        $ender->cMun = (int) $end['cMun'];
        $ender->xMun = (string) $end['xMun'];
        $ender->UF = strtoupper((string) $end['UF']);
        $ender->CEP = preg_replace('/\D/', '', (string) $end['CEP']);
        $ender->cPais = (int) ($end['cPais'] ?? 1058);
        $ender->xPais = (string) ($end['xPais'] ?? 'Brasil');
        if (!empty($end['fone'])) {
            $ender->fone = preg_replace('/\D/', '', (string) $end['fone']);
        }
        $make->tagenderemit($ender);
    }

    private function buildDest(Make $make, array $dest): void
    {
        $std = new \stdClass();
        $std->xNome = (string) ($dest['nome'] ?? 'CONSUMIDOR');
        $cnpj = preg_replace('/\D/', '', (string) ($dest['cnpj'] ?? ''));
        $cpf = preg_replace('/\D/', '', (string) ($dest['cpf'] ?? ''));
        if ($cnpj !== '' && $cnpj !== null) {
            $std->CNPJ = $cnpj;
        } elseif ($cpf !== '' && $cpf !== null) {
            $std->CPF = $cpf;
        }
        $std->indIEDest = (int) ($dest['indIEDest'] ?? ($cnpj ? 9 : 9));
        if (!empty($dest['ie'])) {
            $std->IE = (string) $dest['ie'];
        }
        if (!empty($dest['email'])) {
            $std->email = (string) $dest['email'];
        }
        $make->tagdest($std);

        $end = $dest['endereco'] ?? null;
        if (is_array($end) && isset($end['xLgr'])) {
            $ender = new \stdClass();
            $ender->xLgr = (string) $end['xLgr'];
            $ender->nro = (string) ($end['nro'] ?? 'S/N');
            $ender->xCpl = !empty($end['xCpl']) ? (string) $end['xCpl'] : null;
            $ender->xBairro = (string) ($end['xBairro'] ?? '');
            $ender->cMun = (int) ($end['cMun'] ?? 0);
            $ender->xMun = (string) ($end['xMun'] ?? '');
            $ender->UF = strtoupper((string) ($end['UF'] ?? ''));
            $ender->CEP = preg_replace('/\D/', '', (string) ($end['CEP'] ?? '00000000'));
            $ender->cPais = (int) ($end['cPais'] ?? 1058);
            $ender->xPais = (string) ($end['xPais'] ?? 'Brasil');
            if (!empty($end['fone'])) {
                $ender->fone = preg_replace('/\D/', '', (string) $end['fone']);
            }
            $make->tagenderdest($ender);
        }
    }

    private function buildItens(Make $make, array $itens): void
    {
        $n = 0;
        foreach ($itens as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $n++;
            $item = (int) ($raw['item'] ?? $n);
            $qtd = (float) ($raw['quantidade'] ?? 0);
            $vUnit = (float) ($raw['valor_unitario'] ?? 0);
            $vProd = round((float) ($raw['valor_total'] ?? ($qtd * $vUnit)), 2);

            $prod = new \stdClass();
            $prod->item = $item;
            $prod->cProd = (string) ($raw['cProd'] ?? $item);
            $prod->cEAN = (string) ($raw['cEAN'] ?? 'SEM GTIN');
            $prod->xProd = (string) ($raw['descricao'] ?? '');
            if ($prod->xProd === '') {
                throw new RuntimeException("itens[{$item}].descricao é obrigatório");
            }
            $prod->NCM = preg_replace('/\D/', '', (string) ($raw['ncm'] ?? ''));
            if ($prod->NCM === '' || $prod->NCM === null || strlen($prod->NCM) !== 8) {
                throw new RuntimeException("itens[{$item}].ncm deve ter 8 dígitos");
            }
            $prod->CFOP = preg_replace('/\D/', '', (string) ($raw['cfop'] ?? ''));
            if ($prod->CFOP === '' || $prod->CFOP === null || strlen($prod->CFOP) !== 4) {
                throw new RuntimeException("itens[{$item}].cfop deve ter 4 dígitos");
            }
            $prod->uCom = strtoupper((string) ($raw['unidade'] ?? 'UN'));
            $prod->qCom = $qtd;
            $prod->vUnCom = $vUnit;
            $prod->vProd = $vProd;
            $prod->cEANTrib = (string) ($raw['cEANTrib'] ?? 'SEM GTIN');
            $prod->uTrib = strtoupper((string) ($raw['unidade'] ?? 'UN'));
            $prod->qTrib = $qtd;
            $prod->vUnTrib = $vUnit;
            if (!empty($raw['vDesc'])) {
                $prod->vDesc = round((float) $raw['vDesc'], 2);
            }
            if (!empty($raw['vFrete'])) {
                $prod->vFrete = round((float) $raw['vFrete'], 2);
            }
            $prod->indTot = (int) ($raw['indTot'] ?? 1);
            $make->tagprod($prod);

            if (!empty($raw['infAdProd'])) {
                $ad = new \stdClass();
                $ad->item = $item;
                $ad->infAdProd = (string) $raw['infAdProd'];
                $make->taginfAdProd($ad);
            }

            $imposto = new \stdClass();
            $imposto->item = $item;
            $imposto->vTotTrib = (float) ($raw['vTotTrib'] ?? 0);
            $make->tagimposto($imposto);

            $orig = (int) ($raw['origem'] ?? 0);
            $csosn = (string) ($raw['csosn'] ?? '');
            $cst = (string) ($raw['cst'] ?? '');

            if ($csosn !== '') {
                $icms = new \stdClass();
                $icms->item = $item;
                $icms->orig = $orig;
                $icms->CSOSN = $csosn;
                $icms->pCredSN = (float) ($raw['p_cred_sn'] ?? 0);
                $icms->vCredICMSSN = (float) ($raw['v_cred_sn'] ?? 0);
                $icms->modBCST = null;
                $icms->pMVAST = null;
                $icms->pRedBCST = null;
                $icms->vBCST = null;
                $icms->pICMSST = null;
                $icms->vICMSST = null;
                $icms->vBCFCPST = null;
                $icms->pFCPST = null;
                $icms->vFCPST = null;
                $icms->vBCSTRet = null;
                $icms->pST = null;
                $icms->vICMSSTRet = null;
                $icms->vBCFCPSTRet = null;
                $icms->pFCPSTRet = null;
                $icms->vFCPSTRet = null;
                $icms->modBC = null;
                $icms->vBC = null;
                $icms->pRedBC = null;
                $icms->pICMS = null;
                $icms->vICMS = null;
                $icms->pRedBCEfet = null;
                $icms->vBCEfet = null;
                $icms->pICMSEfet = null;
                $icms->vICMSEfet = null;
                $icms->vICMSSubstituto = null;
                $make->tagICMSSN($icms);
            } else {
                $icms = new \stdClass();
                $icms->item = $item;
                $icms->orig = $orig;
                $icms->CST = $cst !== '' ? $cst : '00';
                $icms->modBC = (string) ($raw['mod_bc'] ?? '3');
                $icms->vBC = (float) ($raw['v_bc'] ?? $vProd);
                $icms->pRedBC = null;
                $icms->pICMS = (float) ($raw['p_icms'] ?? 0);
                $icms->vICMS = (float) ($raw['v_icms'] ?? 0);
                $icms->pFCP = null;
                $icms->vFCP = null;
                $icms->vBCFCP = null;
                $make->tagICMS($icms);
            }

            $pis = new \stdClass();
            $pis->item = $item;
            $pis->CST = (string) ($raw['cst_pis'] ?? '99');
            $pis->vBC = isset($raw['v_bc_pis']) ? (float) $raw['v_bc_pis'] : null;
            $pis->pPIS = isset($raw['p_pis']) ? (float) $raw['p_pis'] : null;
            $pis->vPIS = (float) ($raw['v_pis'] ?? 0);
            $pis->qBCProd = null;
            $pis->vAliqProd = null;
            $make->tagPIS($pis);

            $cofins = new \stdClass();
            $cofins->item = $item;
            $cofins->CST = (string) ($raw['cst_cofins'] ?? '99');
            $cofins->vBC = isset($raw['v_bc_cofins']) ? (float) $raw['v_bc_cofins'] : null;
            $cofins->pCOFINS = isset($raw['p_cofins']) ? (float) $raw['p_cofins'] : null;
            $cofins->vCOFINS = (float) ($raw['v_cofins'] ?? 0);
            $cofins->qBCProd = null;
            $cofins->vAliqProd = null;
            $make->tagCOFINS($cofins);
        }
    }

    private function buildPag(Make $make, array $nota): void
    {
        $pagamentos = $nota['pagamentos'] ?? [];
        if (!is_array($pagamentos) || count($pagamentos) === 0) {
            throw new RuntimeException('nota.pagamentos é obrigatório');
        }

        $pag = new \stdClass();
        $pag->vTroco = (float) ($nota['vTroco'] ?? 0);
        $make->tagpag($pag);

        $somado = 0.0;
        foreach ($pagamentos as $raw) {
            if (!is_array($raw)) {
                continue;
            }
            $det = new \stdClass();
            $det->indPag = (string) ($raw['indPag'] ?? '0');
            if (!empty($raw['descricao'])) {
                $det->xPag = (string) $raw['descricao'];
            }
            $det->tPag = (string) ($raw['forma'] ?? '01');
            $det->vPag = round((float) ($raw['valor'] ?? 0), 2);
            $somado += $det->vPag;
            $make->tagdetpag($det);
        }

        if ($somado <= 0) {
            throw new RuntimeException('Soma dos pagamentos deve ser maior que zero');
        }
    }

    private function storeXml(string $xml, string $chave, int $ambiente): void
    {
        if ($chave === '') {
            return;
        }
        $dir = rtrim((string) (getenv('FISCAL_STORAGE') ?: __DIR__ . '/../storage'), '/\\')
            . '/a' . $ambiente;
        if (!is_dir($dir)) {
            @mkdir($dir, 0750, true);
        }
        @file_put_contents($dir . '/' . $chave . '.xml', $xml);
    }

    private function extractQrCode(string $xml): string
    {
        $dom = new DOMDocument();
        if (!@$dom->loadXML($xml)) {
            return '';
        }
        $xpath = new DOMXPath($dom);
        $node = $xpath->query('//qrCode')->item(0);
        return $node !== null ? (string) $node->textContent : '';
    }

    private function requireArray(array $data, string $key): array
    {
        $value = $data[$key] ?? null;
        if (!is_array($value)) {
            throw new RuntimeException("Campo obrigatório ausente: {$key}");
        }
        return $value;
    }

    private function requireField(array $data, string $key): void
    {
        $value = $data[$key] ?? null;
        if ($value === null || $value === '') {
            throw new RuntimeException("Campo obrigatório ausente: {$key}");
        }
    }
}
