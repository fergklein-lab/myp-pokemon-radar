import test from 'node:test';
import assert from 'node:assert/strict';
import {parseLatestProducts,parseOffers,parseHistory,soldFloor} from '../src/index.js';

test('filtra watchlist por slug',()=>{
  const html='<a href="/pokemon/produto/123/charizard-ex">x</a><a href="/pokemon/produto/124/mew-ex">y</a>';
  const p=parseLatestProducts(html); assert.equal(p.length,1); assert.equal(p[0].id,123);
});

test('parse oferta NM e SP',()=>{
  const html='<div>Loja A NM - Quase nova R$ 120,00 Normal</div><div>Loja B SP - Pouco jogada R$ 90,00 Reverse Foil</div>';
  const o=parseOffers(html); assert.ok(o.some(x=>x.condition==='NM'&&x.price===120)); assert.ok(o.some(x=>x.condition==='SP'&&x.price===90));
});

test('parse histórico e piso robusto',()=>{
  const html='Mediana MYP R$ 210,00 Último Preço Vendido R$ 205,00 NM 01/08/2026 R$ 210,00 R$ 220,00 R$ 205,00 25/07/2026 R$ 215,00 R$ 220,00 R$ 200,00 18/07/2026 R$ 220,00 R$ 230,00 R$ 210,00 11/07/2026 R$ 225,00 R$ 230,00 R$ 215,00 04/07/2026 R$ 230,00 R$ 240,00 R$ 80,00';
  const h=parseHistory(html); assert.equal(h.last,205); const f=soldFloor(h,'NM',5); assert.ok(f>=200&&f<=215);
});
