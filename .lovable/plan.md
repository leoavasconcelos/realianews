

# Adicionar Interesse "IA Imobiliária" ao Onboarding e Perfil

## Objetivo
Criar uma nova categoria de interesse focada em **Inteligência Artificial aplicada ao mercado imobiliário**, separada da categoria genérica "PropTech".

## Análise Atual

### Interesses Existentes (6 categorias)
| ID | Label | Descrição |
|---|---|---|
| residencial | Residencial | Casas, apartamentos e lançamentos |
| comercial | Comercial | Escritórios, lojas e galpões |
| corporativo | Corporativo | M&A, fundos e grandes players |
| financiamento | Financiamento | Crédito, taxas e bancos |
| investimentos | Investimentos | FIIs, CRIs e oportunidades |
| proptech | PropTech | Tecnologia e inovação |

### Problema
- PropTech é muito ampla, misturando startups, apps, automação e IA
- Usuários interessados especificamente em IA não têm opção dedicada
- Tema de IA está crescendo rapidamente no setor (avaliações automatizadas, análise de mercado, chatbots, etc.)

## Solução

### Novo Interesse a Adicionar
```typescript
{
  id: 'ia-imobiliaria',
  label: 'IA Imobiliária',
  icon: <Brain className="w-5 h-5" />, // ou Sparkles
  description: 'IA, machine learning e automação inteligente'
}
```

### Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/OnboardingModal.tsx` | Adicionar novo interesse "IA Imobiliária" com ícone Brain |
| `src/components/ProfileScreen.tsx` | Adicionar mesmo interesse na lista do perfil |

### Layout Atualizado
Com 7 interesses, o grid 2x3 ficaria com uma última linha com 1 item centralizado ou podemos manter o grid simétrico alterando para um layout que acomode 7 ou 8 itens.

**Opções de layout:**
- **Opção A**: Manter grid 2 colunas (3 linhas + 1 item na 4ª linha)
- **Opção B**: Adicionar um 8º interesse para manter simetria (ex: "Urbanismo" ou "Smart Cities")

## Implementação Detalhada

### 1. OnboardingModal.tsx

Adicionar import do ícone e novo interesse:

```typescript
import { Check, Building2, Home, Briefcase, TrendingUp, Landmark, Cpu, ArrowRight, Globe, ArrowLeft, Brain } from 'lucide-react';

const interests: Interest[] = [
  { id: 'residencial', label: 'Residencial', icon: <Home className="w-5 h-5" />, description: 'Casas, apartamentos e lançamentos' },
  { id: 'comercial', label: 'Comercial', icon: <Building2 className="w-5 h-5" />, description: 'Escritórios, lojas e galpões' },
  { id: 'corporativo', label: 'Corporativo', icon: <Briefcase className="w-5 h-5" />, description: 'M&A, fundos e grandes players' },
  { id: 'financiamento', label: 'Financiamento', icon: <Landmark className="w-5 h-5" />, description: 'Crédito, taxas e bancos' },
  { id: 'investimentos', label: 'Investimentos', icon: <TrendingUp className="w-5 h-5" />, description: 'FIIs, CRIs e oportunidades' },
  { id: 'proptech', label: 'PropTech', icon: <Cpu className="w-5 h-5" />, description: 'Startups e inovação digital' },
  { id: 'ia-imobiliaria', label: 'IA Imobiliária', icon: <Brain className="w-5 h-5" />, description: 'Machine learning e automação' },
];
```

### 2. ProfileScreen.tsx

Mesma atualização no array `allInterests`:

```typescript
import { Brain } from 'lucide-react';

const allInterests: Interest[] = [
  // ... interesses existentes ...
  { id: 'ia-imobiliaria', label: 'IA Imobiliária', icon: <Brain className="w-5 h-5" />, description: 'Machine learning e automação' },
];
```

## Consideração Opcional

Para manter o grid simétrico (8 itens = 4 linhas de 2), podemos adicionar também:
```typescript
{ id: 'urbanismo', label: 'Urbanismo', icon: <MapPin className="w-5 h-5" />, description: 'Cidades, zoneamento e mobilidade' },
```

## Resultado Esperado
- Nova opção "IA Imobiliária" visível no onboarding (step 2)
- Mesma opção disponível na edição de interesses no Perfil
- Ícone de cérebro (Brain) para diferenciar visualmente
- Usuários podem selecionar IA como interesse específico

