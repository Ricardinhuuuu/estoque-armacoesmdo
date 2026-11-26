/*
 * Contas — lógica de usuários compartilhada entre a API da Vercel e os testes.
 *
 * Etapa 4: senha nunca é guardada como veio, nunca volta para o aplicativo e o bloqueio
 * por tentativas é decidido no servidor. O hash é PBKDF2-SHA256 com sal aleatório por usuário
 * (disponível no Node da Vercel sem instalar nada).
 */

const crypto = require("crypto");

const ITERACOES = 120000;
const TAMANHO_HASH = 32;
const MAX_TENTATIVAS = 3;

/* normaliza o login: minúsculo, sem espaço nas pontas */
function normLogin(l) {
  return String(l == null ? "" : l).trim().toLowerCase();
}

/* nome e sobrenome, como no app */
function nomeOK(n) {
  const partes = String(n == null ? "" : n).trim().split(/\s+/).filter(Boolean);
  return partes.length >= 2 && partes.every((p) => p.length >= 2);
}

function loginOK(l) {
  const s = normLogin(l);
  return s.length >= 3 && s.length <= 40 && !/\s/.test(s) && /^[a-z0-9._@-]+$/.test(s);
}

/* gera o registro de senha: guarda sal e hash, nunca a senha */
function criarHashSenha(senha, sal) {
  const s = sal || crypto.randomBytes(16).toString("hex");
  const h = crypto.pbkdf2Sync(String(senha), s, ITERACOES, TAMANHO_HASH, "sha256").toString("hex");
  return { sal: s, hash: h, iteracoes: ITERACOES };
}

/* confere a senha em tempo constante */
function conferirSenha(senha, registro) {
  if (!registro || !registro.sal || !registro.hash) return false;
  const iter = Number(registro.iteracoes) || ITERACOES;
  const h = crypto.pbkdf2Sync(String(senha), registro.sal, iter, TAMANHO_HASH, "sha256");
  const guardado = Buffer.from(String(registro.hash), "hex");
  if (guardado.length !== h.length) return false;
  return crypto.timingSafeEqual(h, guardado);
}

function senhaForte(senha) {
  return typeof senha === "string" && senha.length >= 6;
}

/* senha provisória legível, para o administrador repassar */
function sugerirSenha() {
  const letras = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const numeros = "23456789";
  const tudo = letras + numeros;
  const b = crypto.randomBytes(10);
  let s = "";
  for (let i = 0; i < 8; i++) s += tudo[b[i] % tudo.length];
  s += numeros[b[8] % numeros.length] + letras[b[9] % letras.length];
  return s;
}

/*
 * Estado público de um usuário: nada de hash, sal ou senha provisória sai daqui.
 */
function usuarioPublico(u) {
  return {
    l: u.l,
    n: u.n,
    r: u.r,
    st: u.st,
    t: Number(u.t) || 0,
    temp: !!u.temp,
    ts: Number(u.ts) || 0,
  };
}

/*
 * Decide o que acontece num login. Devolve sempre um resultado com "ok" e "erro" genérico
 * quando falha — login inexistente e senha errada não se distinguem.
 */
function tentarLogin(usuario, senha, opts = {}) {
  if (!usuario) return { ok: false, erro: "Login ou senha incorretos." };
  if (usuario.st === "bloq") {
    return { ok: false, bloqueado: true, erro: "Acesso bloqueado: mais de 3 tentativas com senha incorreta. Entre em contato com o administrador." };
  }
  if (usuario.st === "desat") return { ok: false, desativado: true, erro: "Acesso desativado. Fale com o administrador." };

  const confere = conferirSenha(senha, usuario);
  if (!confere) {
    const t = (Number(usuario.t) || 0) + 1;
    const bloquear = t >= MAX_TENTATIVAS;
    return {
      ok: false,
      tentativas: t,
      bloquear,
      erro: bloquear
        ? "Acesso bloqueado: mais de 3 tentativas com senha incorreta. Entre em contato com o administrador."
        : "Login ou senha incorretos. Tentativas restantes: " + (MAX_TENTATIVAS - t) + ".",
    };
  }
  return { ok: true, usuario, trocaObrigatoria: !!usuario.temp };
}

/* token de sessão: aleatório, guardado só como hash no banco */
function novoToken() {
  return crypto.randomBytes(32).toString("hex");
}
function hashToken(t) {
  return crypto.createHash("sha256").update(String(t)).digest("hex");
}

module.exports = {
  ITERACOES, MAX_TENTATIVAS, normLogin, nomeOK, loginOK,
  criarHashSenha, conferirSenha, senhaForte, sugerirSenha,
  usuarioPublico, tentarLogin, novoToken, hashToken,
};
