# MYP Pokemon Radar — Cloudflare Worker v0.3

Radar experimental de oportunidades no MYP Cards para as famílias de Charmander, Bulbasaur, Squirtle, Pikachu, Dragonite, Snubbull, Snorlax e Eevee/Eeveelutions.

- monitora NM e SP;
- cron a cada 3 minutos;
- linha de base silenciosa no primeiro ciclo;
- piso conservador por histórico de último preço vendido + menor concorrente;
- alertas a partir de 20%;
- KV persistente para detectar novas mínimas/reduções;
- endpoint `/health` para verificar o último ciclo.

## Publicação

O `wrangler.jsonc` usa provisionamento automático do KV: não é necessário criar namespace manualmente em Wrangler recente.

1. Autentique o Wrangler na sua conta Cloudflare.
2. Instale dependências.
3. Cadastre `TELEGRAM_BOT_TOKEN` como secret do Worker.
4. Faça deploy. O KV é provisionado automaticamente e o cron é registrado.

Nunca versione o token no repositório.
