/**
 * Classe do ativo, para aplicar a regra certa de imposto.
 * Só "acao" (ações à vista, mercado à vista) entra na isenção de R$ 20 mil/mês
 * em vendas (Lei 11.033/2004, art. 3º, I; IN RFB 1.585/2015, art. 59).
 * FII (20%, sem isenção), ETF, BDR, futuros e opções NÃO têm a isenção.
 */
export type AssetClass = "acao" | "fii" | "etf" | "bdr" | "futuro" | "opcao" | "outro";

/**
 * Heurística pelo ticker, usada quando o lançamento não traz a classe.
 * Conservadora: em caso de dúvida NÃO marca como ação (o erro fica a favor
 * de calcular imposto, nunca de deixar de calcular). Tickers terminados em 11
 * (FII, ETF ou unit) viram "fii" — units de ações (ex.: TAEE11) precisam de
 * classe explícita "acao" até termos a lista oficial da B3.
 */
export function guessAssetClass(ticker: string): AssetClass {
  const t = (ticker || "").trim().toUpperCase();
  if (/^(WIN|WDO|IND|DOL|BGI|CCM|ICF|DI1|SFI|ETH|BIT)[A-Z0-9]*$/.test(t) || /FUT$/.test(t)) return "futuro";
  if (/^[A-Z]{4}(32|33|34|35|39)$/.test(t)) return "bdr";
  if (/^[A-Z]{4}11F?$/.test(t)) return "fii";
  if (/^[A-Z]{4}[3-8]F?$/.test(t)) return "acao";
  if (/^[A-Z]{4}[A-X]\d{1,3}[A-Z]?$/.test(t)) return "opcao";
  return "outro";
}

export function assetClassOf(t: { asset?: string; classe?: AssetClass }): AssetClass {
  return t.classe ?? guessAssetClass(t.asset ?? "");
}
