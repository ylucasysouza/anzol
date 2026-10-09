import type { Locale } from "@/lib/i18n";

export type LessonLevel = "Básico" | "Intermediário" | "Avançado" | "Todos";

export interface Lesson {
  t: string;
  d: string;
  lv: LessonLevel;
  q: string;
  url?: string;
}

export interface EduCategory {
  cat: string;
  icon: "trending" | "building" | "landmark" | "zap" | "file" | "library";
  items: Lesson[];
}

export const EDU: EduCategory[] = [
  {
    cat: "Renda Variável",
    icon: "trending",
    items: [
      {
        t: "O que são Ações",
        d: "Propriedade de empresa, direitos do acionista e como funcionam os proventos.",
        lv: "Básico",
        q: "o que sao acoes B3 como investir iniciante",
      },
      {
        t: "Como funciona a B3",
        d: "Pregão, lote padrão, home broker e execução de ordens na bolsa oficial.",
        lv: "Básico",
        q: "como funciona B3 bolsa valores iniciante",
      },
      {
        t: "Day Trade vs Swing Trade",
        d: "Diferenças de estratégia, risco e tributação de cada modalidade.",
        lv: "Intermediário",
        q: "day trade swing trade diferenca tributacao brasil",
      },
      {
        t: "ETFs — Fundos de Índice",
        d: "BOVA11, IVVB11, SMAL11. Como funcionam e tributação específica.",
        lv: "Intermediário",
        q: "ETF fundos indice B3 BOVA11 como investir",
      },
    ],
  },
  {
    cat: "FIIs",
    icon: "building",
    items: [
      {
        t: "O que são FIIs",
        d: "Rendimento mensal, isenção de IR em dividendos para PF, como escolher.",
        lv: "Básico",
        q: "fundos imobiliarios FII iniciante o que sao",
      },
      {
        t: "Tipos: Tijolo, Papel e Híbrido",
        d: "FIIs de imóveis físicos, de recebíveis (CRIs/LCIs) e mistos.",
        lv: "Intermediário",
        q: "tipos FII tijolo papel hibrido diferenca",
      },
      {
        t: "Tributação de FIIs",
        d: "Rendimentos mensais isentos. Ganho de capital na venda: 20% IR.",
        lv: "Intermediário",
        q: "FII imposto renda tributacao rendimento",
      },
    ],
  },
  {
    cat: "Renda Fixa",
    icon: "landmark",
    items: [
      {
        t: "Tesouro Direto",
        d: "Selic, IPCA+ e Prefixado. Tributação regressiva e como resgatar.",
        lv: "Básico",
        q: "tesouro direto como funciona iniciante selic IPCA",
      },
      {
        t: "CDB, LCI e LCA",
        d: "Títulos bancários, FGC até R$250k, isenção de LCI/LCA.",
        lv: "Básico",
        q: "CDB LCI LCA renda fixa diferenca iniciante",
      },
      {
        t: "Debêntures e CRIs/CRAs",
        d: "Renda fixa privada. Isenção de IR em alguns casos. Riscos de crédito.",
        lv: "Avançado",
        q: "debentures CRI CRA renda fixa privada isencao IR",
      },
    ],
  },
  {
    cat: "Derivativos e Futuros",
    icon: "zap",
    items: [
      {
        t: "Minicontratos (WINFUT/WDOFUT)",
        d: "Alavancagem, ajuste diário e tributação 20% no Day Trade de futuros.",
        lv: "Avançado",
        q: "WINFUT WDOFUT minicontrato futuros como funciona",
      },
      {
        t: "Opções (Calls e Puts)",
        d: "Como funcionam calls, puts, exercício e estratégias básicas na B3.",
        lv: "Avançado",
        q: "opcoes calls puts bolsa B3 como funciona",
      },
      {
        t: "Forex Internacional",
        d: "Pares de moedas, CFDs, XAUUSD e tributação pela Lei 14.754/2023.",
        lv: "Avançado",
        q: "forex cambio internacional tributacao brasil lei 14754",
      },
    ],
  },
  {
    cat: "Tributação e IR",
    icon: "file",
    items: [
      {
        t: "DARF 6015 — Como pagar",
        d: "O que é o DARF, quando vence, código 6015 e como emitir pelo Sicalcweb.",
        lv: "Básico",
        q: "DARF 6015 como pagar imposto renda trader day trade",
      },
      {
        t: "Isenção Swing Trade R$20k",
        d: "A regra dos R$20.000 em vendas mensais que isenta o swing trade de IR.",
        lv: "Intermediário",
        q: "isencao swing trade 20000 reais imposto IR acoes",
      },
      {
        t: "DIRPF — Declaração Anual",
        d: "Como declarar ações, FIIs, dividendos, JCP e prejuízos no IR anual.",
        lv: "Intermediário",
        q: "declarar investimentos imposto renda anual acoes FII",
      },
      {
        t: "Lei 14.754/2023 — Exterior",
        d: "Nova tributação de investimentos internacionais para residentes no Brasil.",
        lv: "Avançado",
        q: "lei 14754 2023 investimentos exterior tributacao forex",
      },
    ],
  },
  {
    cat: "Fontes Oficiais",
    icon: "library",
    items: [
      {
        t: "B3 Educação",
        d: "Portal oficial da B3 com cursos gratuitos e trilhas de aprendizado.",
        lv: "Todos",
        q: "B3 educacao cursos gratuitos",
        url: "https://edu.b3.com.br/",
      },
      {
        t: "Investidor CVM",
        d: "Portal do investidor da CVM — governo federal. Conteúdo oficial.",
        lv: "Todos",
        q: "CVM investidor portal",
        url: "https://www.investidor.gov.br/",
      },
      {
        t: "Tesouro Direto — Preços",
        d: "Preços e taxas dos títulos públicos em tempo real.",
        lv: "Todos",
        q: "tesouro direto precos taxas",
        url: "https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm",
      },
      {
        t: "Dados Abertos CVM",
        d: "Fundos, companhias abertas, ofertas públicas e dados regulatórios.",
        lv: "Todos",
        q: "dados abertos CVM",
        url: "https://dados.cvm.gov.br/",
      },
    ],
  },
];

export const EDU_EN: EduCategory[] = [
  {
    cat: "Equities",
    icon: "trending",
    items: [
      {
        t: "What shares are",
        d: "Ownership of a company, shareholder rights, and how payouts work on B3.",
        lv: "Básico",
        q: "o que sao acoes B3 como investir iniciante",
      },
      {
        t: "How B3 works",
        d: "Trading session, standard lot, home broker, and how orders are filled on Brazil's official exchange.",
        lv: "Básico",
        q: "como funciona B3 bolsa valores iniciante",
      },
      {
        t: "Day trade vs swing trade",
        d: "How strategy, risk, and Brazilian tax differ for each style.",
        lv: "Intermediário",
        q: "day trade swing trade diferenca tributacao brasil",
      },
      {
        t: "ETFs — index funds",
        d: "BOVA11, IVVB11, and SMAL11. How they work and the specific Brazilian tax rules.",
        lv: "Intermediário",
        q: "ETF fundos indice B3 BOVA11 como investir",
      },
    ],
  },
  {
    cat: "FIIs (Brazilian REITs)",
    icon: "building",
    items: [
      {
        t: "What FIIs are",
        d: "Monthly income, the income-tax exemption on dividends for individuals, and how to choose a Brazilian REIT (FII).",
        lv: "Básico",
        q: "fundos imobiliarios FII iniciante o que sao",
      },
      {
        t: "Types: brick, paper, and hybrid",
        d: "FIIs backed by physical property, by receivables (CRIs/LCIs), and mixed funds.",
        lv: "Intermediário",
        q: "tipos FII tijolo papel hibrido diferenca",
      },
      {
        t: "How FIIs are taxed",
        d: "Monthly distributions are exempt. Capital gain on a sale: 20% income tax.",
        lv: "Intermediário",
        q: "FII imposto renda tributacao rendimento",
      },
    ],
  },
  {
    cat: "Fixed income",
    icon: "landmark",
    items: [
      {
        t: "Tesouro Direto",
        d: "Selic, IPCA+, and fixed-rate Brazilian government bonds. Sliding tax scale and how to redeem.",
        lv: "Básico",
        q: "tesouro direto como funciona iniciante selic IPCA",
      },
      {
        t: "CDB, LCI, and LCA",
        d: "Bank securities, FGC coverage up to R$250k, and the income-tax exemption on LCI/LCA.",
        lv: "Básico",
        q: "CDB LCI LCA renda fixa diferenca iniciante",
      },
      {
        t: "Debentures and CRIs/CRAs",
        d: "Private fixed income. Income-tax exemption in some cases. Credit risk.",
        lv: "Avançado",
        q: "debentures CRI CRA renda fixa privada isencao IR",
      },
    ],
  },
  {
    cat: "Derivatives and futures",
    icon: "zap",
    items: [
      {
        t: "Mini contracts (WINFUT/WDOFUT)",
        d: "Leverage, daily settlement, and the 20% tax on day-traded futures (WIN and WDO).",
        lv: "Avançado",
        q: "WINFUT WDOFUT minicontrato futuros como funciona",
      },
      {
        t: "Options (calls and puts)",
        d: "How calls, puts, exercise, and basic strategies work on B3.",
        lv: "Avançado",
        q: "opcoes calls puts bolsa B3 como funciona",
      },
      {
        t: "International forex",
        d: "Currency pairs, CFDs, XAUUSD, and tax under Brazilian Law 14.754/2023.",
        lv: "Avançado",
        q: "forex cambio internacional tributacao brasil lei 14754",
      },
    ],
  },
  {
    cat: "Tax",
    icon: "file",
    items: [
      {
        t: "DARF 6015 — how to pay",
        d: "What the DARF monthly Brazilian tax slip is, the due date, revenue code 6015, and how to issue it in Sicalc.",
        lv: "Básico",
        q: "DARF 6015 como pagar imposto renda trader day trade",
      },
      {
        t: "R$20,000 swing-trade exemption",
        d: "The rule that exempts swing trades from income tax when sales in the month are at most R$20,000.",
        lv: "Intermediário",
        q: "isencao swing trade 20000 reais imposto IR acoes",
      },
      {
        t: "DIRPF — annual filing",
        d: "How to report shares, FIIs (Brazilian REITs), dividends, JCP, and losses on the annual Brazilian return.",
        lv: "Intermediário",
        q: "declarar investimentos imposto renda anual acoes FII",
      },
      {
        t: "Law 14.754/2023 — assets abroad",
        d: "The newer tax on international investments for people who live in Brazil.",
        lv: "Avançado",
        q: "lei 14754 2023 investimentos exterior tributacao forex",
      },
    ],
  },
  {
    cat: "Official sources",
    icon: "library",
    items: [
      {
        t: "B3 Education",
        d: "Official B3 portal with free courses and learning paths.",
        lv: "Todos",
        q: "B3 educacao cursos gratuitos",
        url: "https://edu.b3.com.br/",
      },
      {
        t: "CVM investor portal",
        d: "Investor site of the CVM, Brazil's securities regulator. Official content.",
        lv: "Todos",
        q: "CVM investidor portal",
        url: "https://www.investidor.gov.br/",
      },
      {
        t: "Tesouro Direto — prices",
        d: "Live prices and rates for Brazilian government bonds.",
        lv: "Todos",
        q: "tesouro direto precos taxas",
        url: "https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm",
      },
      {
        t: "CVM open data",
        d: "Funds, listed companies, public offerings, and regulatory data.",
        lv: "Todos",
        q: "dados abertos CVM",
        url: "https://dados.cvm.gov.br/",
      },
    ],
  },
];

export const EDU_ES: EduCategory[] = [
  {
    cat: "Renta variable",
    icon: "trending",
    items: [
      {
        t: "Qué son las acciones",
        d: "Propiedad de una empresa, derechos del accionista y cómo funcionan los pagos en la B3.",
        lv: "Básico",
        q: "o que sao acoes B3 como investir iniciante",
      },
      {
        t: "Cómo funciona la B3",
        d: "Rueda, lote estándar, home broker y ejecución de órdenes en la bolsa oficial de Brasil.",
        lv: "Básico",
        q: "como funciona B3 bolsa valores iniciante",
      },
      {
        t: "Day trade vs swing trade",
        d: "Diferencias de estrategia, riesgo y tributación en Brasil de cada modalidad.",
        lv: "Intermediário",
        q: "day trade swing trade diferenca tributacao brasil",
      },
      {
        t: "ETFs — fondos de índice",
        d: "BOVA11, IVVB11 y SMAL11. Cómo funcionan y su tributación específica en Brasil.",
        lv: "Intermediário",
        q: "ETF fundos indice B3 BOVA11 como investir",
      },
    ],
  },
  {
    cat: "FIIs (fondos inmobiliarios de Brasil)",
    icon: "building",
    items: [
      {
        t: "Qué son los FIIs",
        d: "Rendimiento mensual, exención de IR en dividendos para personas físicas y cómo elegir un FII (fondo inmobiliario de Brasil).",
        lv: "Básico",
        q: "fundos imobiliarios FII iniciante o que sao",
      },
      {
        t: "Tipos: ladrillo, papel e híbrido",
        d: "FIIs de inmuebles físicos, de créditos (CRIs/LCIs) y mixtos.",
        lv: "Intermediário",
        q: "tipos FII tijolo papel hibrido diferenca",
      },
      {
        t: "Tributación de los FIIs",
        d: "Rendimientos mensuales exentos. Ganancia de capital en la venta: 20% de IR.",
        lv: "Intermediário",
        q: "FII imposto renda tributacao rendimento",
      },
    ],
  },
  {
    cat: "Renta fija",
    icon: "landmark",
    items: [
      {
        t: "Tesouro Direto",
        d: "Selic, IPCA+ y prefijado: bonos del gobierno de Brasil. Impuesto regresivo y cómo rescatarlos.",
        lv: "Básico",
        q: "tesouro direto como funciona iniciante selic IPCA",
      },
      {
        t: "CDB, LCI y LCA",
        d: "Títulos bancarios, cobertura del FGC hasta R$250 mil y exención de IR en LCI/LCA.",
        lv: "Básico",
        q: "CDB LCI LCA renda fixa diferenca iniciante",
      },
      {
        t: "Debéntures y CRIs/CRAs",
        d: "Renta fija privada. Exención de IR en algunos casos. Riesgo de crédito.",
        lv: "Avançado",
        q: "debentures CRI CRA renda fixa privada isencao IR",
      },
    ],
  },
  {
    cat: "Derivados y futuros",
    icon: "zap",
    items: [
      {
        t: "Minicontratos (WINFUT/WDOFUT)",
        d: "Apalancamiento, ajuste diario e impuesto del 20% en el day trade de futuros (WIN y WDO).",
        lv: "Avançado",
        q: "WINFUT WDOFUT minicontrato futuros como funciona",
      },
      {
        t: "Opciones (calls y puts)",
        d: "Cómo funcionan calls, puts, el ejercicio y estrategias básicas en la B3.",
        lv: "Avançado",
        q: "opcoes calls puts bolsa B3 como funciona",
      },
      {
        t: "Forex internacional",
        d: "Pares de divisas, CFDs, XAUUSD y tributación por la Ley 14.754/2023 de Brasil.",
        lv: "Avançado",
        q: "forex cambio internacional tributacao brasil lei 14754",
      },
    ],
  },
  {
    cat: "Tributación e IR",
    icon: "file",
    items: [
      {
        t: "DARF 6015 — cómo pagar",
        d: "Qué es el DARF (boleto mensual de impuestos de Brasil), cuándo vence, código 6015 y cómo emitirlo en Sicalc.",
        lv: "Básico",
        q: "DARF 6015 como pagar imposto renda trader day trade",
      },
      {
        t: "Exención de swing trade de R$20.000",
        d: "La regla de ventas mensuales de hasta R$20.000 que exime al swing trade del IR.",
        lv: "Intermediário",
        q: "isencao swing trade 20000 reais imposto IR acoes",
      },
      {
        t: "DIRPF — declaración anual",
        d: "Cómo declarar acciones, FIIs (fondos inmobiliarios de Brasil), dividendos, JCP y pérdidas en el IR anual.",
        lv: "Intermediário",
        q: "declarar investimentos imposto renda anual acoes FII",
      },
      {
        t: "Ley 14.754/2023 — exterior",
        d: "Nueva tributación de inversiones internacionales para residentes en Brasil.",
        lv: "Avançado",
        q: "lei 14754 2023 investimentos exterior tributacao forex",
      },
    ],
  },
  {
    cat: "Fuentes oficiales",
    icon: "library",
    items: [
      {
        t: "B3 Educación",
        d: "Portal oficial de la B3 con cursos gratuitos y rutas de aprendizaje.",
        lv: "Todos",
        q: "B3 educacao cursos gratuitos",
        url: "https://edu.b3.com.br/",
      },
      {
        t: "Portal del inversionista CVM",
        d: "Sitio del inversionista de la CVM, el regulador de valores de Brasil. Contenido oficial.",
        lv: "Todos",
        q: "CVM investidor portal",
        url: "https://www.investidor.gov.br/",
      },
      {
        t: "Tesouro Direto — precios",
        d: "Precios y tasas de los bonos públicos de Brasil en tiempo real.",
        lv: "Todos",
        q: "tesouro direto precos taxas",
        url: "https://www.tesourodireto.com.br/titulos/precos-e-taxas.htm",
      },
      {
        t: "Datos abiertos de la CVM",
        d: "Fondos, compañías abiertas, ofertas públicas y datos regulatorios.",
        lv: "Todos",
        q: "dados abertos CVM",
        url: "https://dados.cvm.gov.br/",
      },
    ],
  },
];

export function eduFor(locale: Locale): EduCategory[] {
  if (locale === "en") return EDU_EN;
  if (locale === "es") return EDU_ES;
  return EDU;
}
