import { Helmet } from "react-helmet-async";
import { Seo } from "@/components/Seo";
import { Link } from "react-router-dom";
import { ArrowLeft, TrendingUp, MapPin, Calculator, LineChart } from "lucide-react";

type CityRow = {
  city: string;
  state: string;
  price: number;
  yoy: number;
  premium: string;
  premiumPrice: number;
};

// Referências públicas: FipeZAP (Nov/2025) e Índice DataZAP — valores em BRL/m² para
// apartamentos padrão à venda. Os números são arredondados e servem como orientação
// comparativa; para due diligence consulte a fonte original de cada indicador.
const CITY_DATA: CityRow[] = [
  { city: "São Paulo", state: "SP", price: 11380, yoy: 6.4, premium: "Vila Nova Conceição", premiumPrice: 25800 },
  { city: "Rio de Janeiro", state: "RJ", price: 11960, yoy: 5.1, premium: "Leblon", premiumPrice: 26400 },
  { city: "Balneário Camboriú", state: "SC", price: 14210, yoy: 8.2, premium: "Barra Norte", premiumPrice: 22100 },
  { city: "Florianópolis", state: "SC", price: 12470, yoy: 9.6, premium: "Jurerê Internacional", premiumPrice: 21500 },
  { city: "Curitiba", state: "PR", price: 9820, yoy: 7.3, premium: "Ecoville", premiumPrice: 13900 },
  { city: "Belo Horizonte", state: "MG", price: 8940, yoy: 4.8, premium: "Belvedere", premiumPrice: 14200 },
  { city: "Brasília", state: "DF", price: 9410, yoy: 3.9, premium: "Lago Sul", premiumPrice: 16800 },
  { city: "Porto Alegre", state: "RS", price: 8210, yoy: 4.2, premium: "Moinhos de Vento", premiumPrice: 13400 },
  { city: "Salvador", state: "BA", price: 7460, yoy: 3.1, premium: "Barra", premiumPrice: 11200 },
  { city: "Recife", state: "PE", price: 7890, yoy: 4.6, premium: "Boa Viagem", premiumPrice: 12600 },
  { city: "Fortaleza", state: "CE", price: 7120, yoy: 5.8, premium: "Meireles", premiumPrice: 11800 },
  { city: "Goiânia", state: "GO", price: 6980, yoy: 4.4, premium: "Setor Marista", premiumPrice: 10400 },
];

const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "O que é o preço do metro quadrado?",
    a: "É o valor de referência de venda ou aluguel de um imóvel dividido pela sua área útil ou privativa em metros quadrados. Serve para comparar imóveis de tamanhos diferentes na mesma região e para acompanhar a evolução dos preços ao longo do tempo.",
  },
  {
    q: "Como calcular o preço do metro quadrado de um imóvel?",
    a: "Divida o valor do imóvel pela sua área privativa. Exemplo: um apartamento anunciado por R$ 850.000 com 68 m² de área privativa tem preço médio de R$ 12.500/m² (850.000 ÷ 68).",
  },
  {
    q: "Qual a diferença entre área útil, privativa e total?",
    a: "Área útil é o espaço interno aproveitável (sem paredes). Área privativa inclui as paredes internas e é o padrão de mercado no Brasil. Área total soma áreas comuns proporcionais (hall, garagem, lazer) e é usada para IPTU e escritura — não para comparar preço por m².",
  },
  {
    q: "Qual a cidade com o maior preço do metro quadrado no Brasil em 2026?",
    a: "Balneário Camboriú (SC) segue como a cidade com o maior preço médio de venda por metro quadrado do país, ultrapassando Rio de Janeiro e São Paulo em bairros à beira-mar. Em bairros específicos, Leblon (RJ) e Vila Nova Conceição (SP) mantêm os m² mais caros.",
  },
  {
    q: "O preço do metro quadrado acompanha a inflação?",
    a: "Historicamente o índice FipeZAP oscila próximo ao IPCA, mas em ciclos de aquecimento (2021–2024, 2025–2026) supera a inflação em capitais litorâneas e do Sul. Em cidades com estoque alto, os preços podem ficar abaixo do IPCA.",
  },
  {
    q: "Vale a pena investir usando o preço do m² como referência?",
    a: "É um ponto de partida, mas não substitui análise de localização, potencial de valorização, custo condominial, liquidez e comparação com imóveis semelhantes já vendidos. Combine o m² médio com o histórico do bairro e o cap rate se o objetivo for renda.",
  },
];

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

const jsonLdArticle = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Preço do metro quadrado no Brasil em 2026: guia completo por cidade",
  description:
    "Guia atualizado com o preço do metro quadrado nas principais capitais e cidades do Brasil, tendências, como calcular e o que impacta o valor do m².",
  datePublished: "2026-07-11",
  dateModified: "2026-07-11",
  author: { "@type": "Organization", name: "REalia" },
  publisher: {
    "@type": "Organization",
    name: "REalia",
    logo: { "@type": "ImageObject", url: "https://realia.digital/realia-logo.png" },
  },
  mainEntityOfPage: "https://realia.digital/guia/metro-quadrado",
};

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

const jsonLdBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "REalia", item: "https://realia.digital/" },
    { "@type": "ListItem", position: 2, name: "Guias", item: "https://realia.digital/guia" },
    {
      "@type": "ListItem",
      position: 3,
      name: "Preço do metro quadrado",
      item: "https://realia.digital/guia/metro-quadrado",
    },
  ],
};

const MetroQuadradoGuide = () => {
  const sorted = [...CITY_DATA].sort((a, b) => b.price - a.price);
  const national = Math.round(CITY_DATA.reduce((s, r) => s + r.price, 0) / CITY_DATA.length);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Preço do metro quadrado no Brasil 2026 — Guia REalia"
        description="Preço do metro quadrado nas capitais brasileiras em 2026: São Paulo, Rio, Balneário Camboriú, BH, Curitiba e mais. Tendências, cálculo e comparativo por bairro."
        path="/guia/metro-quadrado"
      />
      <Helmet>
        <meta name="keywords" content="metro quadrado, preço do metro quadrado, m² Brasil, valor do metro quadrado, FipeZAP, imóveis" />
        <script type="application/ld+json">{JSON.stringify(jsonLdArticle)}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdFaq)}</script>
        <script type="application/ld+json">{JSON.stringify(jsonLdBreadcrumb)}</script>
      </Helmet>

      <header className="border-b bg-card">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao feed
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 md:py-12">
        <nav aria-label="Trilha" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex flex-wrap gap-1">
            <li><Link to="/" className="hover:text-foreground">REalia</Link></li>
            <li aria-hidden>/</li>
            <li>Guias</li>
            <li aria-hidden>/</li>
            <li className="text-foreground">Preço do metro quadrado</li>
          </ol>
        </nav>

        <article>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Preço do metro quadrado no Brasil em 2026: guia completo por cidade
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Atualizado em 11 de julho de 2026 · Leitura de 8 minutos · Por REalia
          </p>

          <p className="mt-6 text-lg leading-relaxed text-foreground/90">
            O <strong>preço do metro quadrado</strong> é o principal termômetro do mercado imobiliário brasileiro.
            Neste guia, a REalia reúne o m² médio das principais capitais, tendências recentes, o bairro mais caro
            de cada cidade e como calcular o valor por m² de qualquer imóvel — para você comparar antes de comprar,
            vender ou investir.
          </p>

          <aside className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <LineChart className="h-4 w-4" /> Média nacional (12 capitais)
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">{formatBRL(national)}/m²</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-4 w-4" /> Maior alta anual
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">Florianópolis · +9,6%</div>
            </div>
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="h-4 w-4" /> Bairro mais caro do país
              </div>
              <div className="mt-2 text-2xl font-semibold text-foreground">Leblon · R$ 26.400/m²</div>
            </div>
          </aside>

          <h2 id="tabela" className="mt-12 text-2xl font-semibold text-foreground">
            Preço do m² por cidade em 2026
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Preços médios de venda de apartamentos padrão, ordenados do mais caro para o mais acessível. Dados agregados
            a partir de índices públicos de referência do mercado (FipeZAP, DataZAP e portais imobiliários).
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Cidade</th>
                  <th className="px-4 py-3 text-right">Preço médio/m²</th>
                  <th className="px-4 py-3 text-right">Variação 12m</th>
                  <th className="px-4 py-3 text-left">Bairro mais caro</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.city} className="border-t">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {r.city} <span className="text-muted-foreground">/ {r.state}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{formatBRL(r.price)}</td>
                    <td className={`px-4 py-3 text-right ${r.yoy >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {r.yoy >= 0 ? "+" : ""}
                      {r.yoy.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.premium} · {formatBRL(r.premiumPrice)}/m²
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 id="como-calcular" className="mt-12 text-2xl font-semibold text-foreground">
            Como calcular o preço do metro quadrado
          </h2>
          <p className="mt-2 text-foreground/90">
            A fórmula é direta: <strong>preço do imóvel ÷ área privativa em m²</strong>. Use a área privativa (não a área
            total) para comparar imóveis diferentes na mesma região.
          </p>
          <div className="mt-4 rounded-xl border bg-muted/30 p-5">
            <div className="flex items-start gap-3">
              <Calculator className="mt-1 h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Exemplo</p>
                <p className="text-foreground">
                  Apartamento de <strong>72 m²</strong> anunciado por <strong>R$ 890.000</strong>:
                </p>
                <p className="mt-1 font-mono text-foreground">890.000 ÷ 72 = R$ 12.361/m²</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compare esse valor com a média do bairro na tabela acima para saber se o preço está no mercado.
                </p>
              </div>
            </div>
          </div>

          <h2 id="fatores" className="mt-12 text-2xl font-semibold text-foreground">
            O que faz o m² variar tanto entre bairros?
          </h2>
          <ul className="mt-3 space-y-2 text-foreground/90">
            <li>• <strong>Localização e infraestrutura</strong>: proximidade de metrô, escolas, hospitais e comércio.</li>
            <li>• <strong>Vista e orientação solar</strong>: unidades frontais e com sol da manhã costumam custar 10–25% mais.</li>
            <li>• <strong>Padrão construtivo</strong>: acabamento, lazer, tecnologia predial e certificações.</li>
            <li>• <strong>Idade do prédio</strong>: imóveis novos têm preço-teto; usados negociam maior desconto.</li>
            <li>• <strong>Estoque e velocidade de vendas</strong>: bairros com pouco lançamento pressionam preços para cima.</li>
            <li>• <strong>Ciclo macroeconômico</strong>: taxa Selic, crédito imobiliário e renda média local.</li>
          </ul>

          <h2 id="tendencias" className="mt-12 text-2xl font-semibold text-foreground">
            Tendências para 2026
          </h2>
          <p className="mt-2 text-foreground/90">
            O ciclo de valorização iniciado em 2023 segue firme em cidades litorâneas do Sul (Balneário Camboriú,
            Florianópolis, Itapema) e em bairros premium de São Paulo. Capitais do Nordeste mostram valorização mais
            modesta, mas com forte demanda por segunda residência. Com a Selic em trajetória de queda, a expectativa
            é de novo aquecimento do crédito imobiliário e pressão adicional sobre o m² em regiões com estoque baixo.
          </p>

          <h2 id="faq" className="mt-12 text-2xl font-semibold text-foreground">
            Perguntas frequentes sobre o preço do metro quadrado
          </h2>
          <div className="mt-4 divide-y rounded-xl border">
            {FAQS.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden">
                  <span className="flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-muted-foreground transition group-open:rotate-45">+</span>
                  </span>
                </summary>
                <p className="mt-3 text-foreground/90">{f.a}</p>
              </details>
            ))}
          </div>

          <section className="mt-12 rounded-2xl border bg-gradient-to-br from-primary/10 to-transparent p-6">
            <h2 className="text-xl font-semibold text-foreground">Acompanhe o mercado com a REalia</h2>
            <p className="mt-2 text-foreground/90">
              Receba diariamente as notícias mais relevantes sobre imóveis, financiamento e evolução do metro quadrado
              no Brasil, com resumos gerados por IA.
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Abrir o feed REalia
            </Link>
          </section>

          <p className="mt-10 text-xs text-muted-foreground">
            Fontes: FipeZAP, DataZAP e Índice QuintoAndar. Os valores são referências agregadas de mercado e podem
            divergir de laudos oficiais. Consulte um especialista antes de decisões de compra, venda ou investimento.
          </p>
        </article>
      </main>
    </div>
  );
};

export default MetroQuadradoGuide;