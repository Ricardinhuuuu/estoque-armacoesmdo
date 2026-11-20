# Etapa 2 — limpeza das telas por papel

## O que faltava

O botão **📋 Contagem** aparecia para o **operador**. Aplicar a contagem como ajuste já era
bloqueado, mas o operador podia entrar no modo, bipar o estoque inteiro — e no fim **não
conseguia aplicar nada**. O trabalho dele se perdia.

## A regra, agora explícita

| Modo | Papel |
|---|---|
| ⬇ **Baixa** | os dois |
| ⬆ **Entrada** | os dois |
| 📋 **Contagem** | **só administrador** |

```js
function podeContar(){ return isA() }
function mode_(m){
  if (m==="cnt" && !podeContar()) { toast("A contagem de inventário é do administrador.", true); m="out" }
}
function ajustarBotoesPorPapel(){ $("mC").style.display = podeContar()?"":"none"; … }
```

- o botão **some** para o operador;
- o modo é protegido **também por dentro** — `mode_("cnt")` não liga;
- quem já estava contando e perde o papel **volta para a baixa**;
- nada foi tirado do administrador.

## Prova

Trocando o papel na mesma sessão, no harness:

```
ADMIN     → podeContar=true,  botão visível,  modo=out
OPERADOR  → podeContar=false, botão none,     modo=out   (voltou para a baixa)
operador chamando mode_("cnt") direto → continua out
baixa e entrada do operador → funcionam
```

`168 passaram, 0 falharam` — local, com e sem `crypto.subtle`, e verde no CI.

## Etapa 2 — como está

| Item | Situação |
|---|---|
| Tela Admin em blocos | ✅ |
| Ações de usuário valendo no servidor | ✅ |
| Limpeza das telas por papel | ✅ |

## O que continua pendente — e por quê

**Rodar o ciclo completo no seu ambiente.** Depende do Postgres ligado e de você fazer o
caminho uma vez:

1. criar um operador;
2. entrar com ele (deve cair na troca obrigatória de senha);
3. trocar a senha;
4. errar a senha até bloquear;
5. desbloquear pelo Admin;
6. desativar e tentar entrar (deve recusar).

Sem o banco isso fica **provado pela regra e pelos testes**, não pela prática — e eu não vou
dizer que está provado o que não vi funcionando.

## Próximo

**Etapa 3 — Sincronização com Vercel/Supabase.** O caminho: ligar de verdade o envio e a
recepção de movimentações (`/api/movimentos`, `/api/estado`), o estado da fila de pendentes e o
que o app mostra quando está offline.
