# MYP Pokemon Radar — Cloudflare Worker v0.4

Radar de oportunidades para as famílias de Charmander, Bulbasaur, Squirtle, Pikachu, Dragonite, Snubbull, Snorlax e Eevee/Eeveelutions.

## Cobertura

A v0.4 foi desenhada para rastrear **todas as cartas encontradas no catálogo público da MYP** que contenham qualquer um dos 28 nomes monitorados, sem filtro de valor mínimo ou máximo.

Estratégia em duas camadas:

1. **Varredura rápida a cada 3 minutos** nas páginas mais recentes, para detectar anúncios novos e quedas de preço rapidamente.
2. **Varredura rotativa do catálogo inteiro**, mantendo um catálogo persistente no Cloudflare D1. Cada ciclo avança por páginas do catálogo e revisita lotes de cartas já cadastradas, de modo que cartas antigas também sejam monitoradas.

Somente ofertas NM e SP entram no cálculo de oportunidade.

## Critério de oportunidade

- identificação por produto exato da MYP;
- condição NM/SP separada;
- piso conservador baseado em histórico recente de preço vendido;
- menor concorrente atual como segunda referência;
- alerta normal a partir de 20% abaixo do valor seguro;
- alerta inicial de descoberta a partir de 30%, para permitir capturar oportunidades já existentes quando o catálogo for construído;
- desconto percentual e lucro estimado são avaliados separadamente;
- nenhuma preferência por cartas caras: uma carta de R$ 3,90 pode ter prioridade máxima se estiver muito abaixo do mercado.

## Persistência

A v0.4 usa Cloudflare D1, mais adequado para manter catálogo, preços e histórico de mudanças do que KV.

## Telegram

`TELEGRAM_BOT_TOKEN` deve ser cadastrado como Secret na Cloudflare. O Chat ID já está configurado no projeto.

Nunca versione o token no repositório.
