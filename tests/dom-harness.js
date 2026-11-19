/* Harness mínimo de DOM para testar o index.html do MDO Estoque no Node.
   Não é um navegador: cobre o que o app usa (getElementById, querySelectorAll,
   onclick/oninput/onchange, classList, localStorage, prompt/confirm/alert). */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

function makeEnv(opts = {}) {
  const els = new Map();
  /* querySelector mínimo: devolve o primeiro filho com a tag pedida */
  const sel = (raiz, s) => {
    const tag = String(s).trim().replace(/[^a-zA-Z]/g, "").toLowerCase();
    return (raiz.children || []).find((c) => c.tagName && c.tagName.toLowerCase() === tag) || null;
  };
  function mk(id, tag = "div") {
    const el = {
      id, tagName: tag.toUpperCase(), className: "", innerHTML: "",
      value: "", type: "text", disabled: false, dataset: {}, children: [],
      /* style como objeto simples, igual ao navegador: lê e grava propriedades */
      style: { cssText: "", setProperty(k, v) { this[k] = v; }, getPropertyValue(k) { return this[k] || ""; } },
      _cls: new Set(),
      classList: {
        add: (c) => el._cls.add(c), remove: (c) => el._cls.delete(c),
        toggle: (c, on) => (on ? el._cls.add(c) : el._cls.delete(c)),
        contains: (c) => el._cls.has(c),
      },
      appendChild(c) { el.children.push(c); return c; },
      removeChild(c) { el.children = el.children.filter((x) => x !== c); },
      remove() {}, focus() {}, click() { if (el.onclick) el.onclick({ target: el }); },
      querySelector: (s) => sel(el, s), closest: () => null, setAttribute() {}, addEventListener() {},
      /* como no navegador: procura dentro do HTML gravado e devolve elementos clicáveis */
      querySelectorAll(s) {
        const attr = /^\[([a-z-]+)\]$/.exec(String(s).trim());
        if (!attr) return [];
        const nome = attr[1];
        const achados = [];
        const re = new RegExp('<button[^>]*data-' + nome + '="([^"]*)"[^>]*>', "g");
        let m;
        while ((m = re.exec(el._html || ""))) {
          const b = mk("dl_" + m[1], "button");
          b.dataset[nome.replace(/^data-/, "")] = m[1];
          const acao = /data-a="([^"]*)"/.exec(m[0]);
          if (acao) b.dataset.a = acao[1];
          achados.push(b);
        }
        return achados;
      },
      play: async () => {}, getCapabilities: () => ({}), applyConstraints: async () => {},
      width: 0, height: 0,
      toDataURL: () => "data:image/png;base64,AAA",
      getContext(kind) {
        if (kind !== "2d") return null;
        const cv = el;
        const img = () => (cv._pixels || (cv._pixels = new Uint8ClampedArray(Math.max(1, cv.width * cv.height * 4)).fill(200)));
        const ctx = {
          canvas: cv, save() {}, restore() {}, translate() {}, rotate() {},
          drawImage(src) { cv._draws = (cv._draws || 0) + 1; cv._fonte = src; },
          getImageData: (x, y, w, h) => ({ width: w, height: h, data: img() }),
          putImageData: (d) => { cv._pixels = d.data; cv._put = (cv._put || 0) + 1; },
        };
        return ctx;
      },
      getTracks: () => [{ stop() {} }], getVideoTracks: () => [{ getCapabilities: () => ({}), applyConstraints: async () => {} }],
    };
    Object.defineProperty(el, "innerHTML", {
      get: () => el._html || "",
      /* como no navegador, textContent acompanha o HTML gravado */
      set: (v) => { el._html = v; el._texto = String(v).replace(/<[^>]*>/g, ""); },
    });
    Object.defineProperty(el, "textContent", {
      get: () => (el._html ? String(el._html).replace(/<[^>]*>/g, "") : el._txt || ""),
      set: (v) => { el._txt = String(v); el._html = v; },
    });
    return el;
  }
  const document = {
    getElementById: (id) => { if (!els.has(id)) els.set(id, mk(id)); return els.get(id); },
    querySelectorAll: (sel) => {
      if (sel === "nav button") return ["0", "1", "2", "3"].map((t) => { const b = mk("nav" + t, "button"); b.dataset.t = t; return b; });
      if (sel === ".sec") return ["s0", "s1", "s2", "s3"].map((i) => document.getElementById(i));
      return [];
    },
    createElement: (tag) => mk("tmp_" + tag, tag),
    body: { appendChild() {}, removeChild() {} },
    head: { appendChild() {} },
  };
  const store = new Map();
  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  /* timers: os disparados pelo app (reenvio automático) não seguram o processo de teste */
  const timers = new Set();
  const setTimeoutReal = setTimeout, clearTimeoutReal = clearTimeout;
  const setTimeoutCurto = (fn, ms) => {
    const id = setTimeoutReal(() => { timers.delete(id); fn(); }, ms);
    timers.add(id); return id;
  };
  const limparTimers = () => { for (const id of timers) clearTimeoutReal(id); timers.clear(); };
  const respostas = { confirm: true, prompt: [] };
  const log = { alerts: [], toasts: [] };
  const ctx = { limparTimers,

    document, localStorage, console,
    setTimeout: setTimeoutCurto, clearTimeout: (id) => { timers.delete(id); clearTimeoutReal(id); },
    setInterval: () => 0, clearInterval: () => {},
    navigator: { vibrate() {}, mediaDevices: undefined, userAgent: "node", onLine: true },
    addEventListener() {}, removeEventListener() {},
    fetch: async () => { throw new Error("rede indisponível no teste"); },
    window: {}, URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    /* impressão: registra a chamada em vez de abrir a caixa de diálogo */
    print: () => { (env.__prints = env.__prints || []).push(Date.now()); },
    Blob: class { constructor() {} },
    /* timers de verdade, como no navegador: o app usa corridas com tempo limite.
       setTimeout/clearTimeout entram abaixo (versão controlada) para não segurar o processo. */
    setInterval: () => 0, clearInterval: () => {}, queueMicrotask,
    FileReader: class {
      readAsDataURL() { this.result = "data:image/png;base64,AAA"; if (this.onload) this.onload(); }
    },
    Image: class {
      constructor() { this.width = 1200; this.height = 800; }
      set src(v) { this._src = v; if (this.onload) this.onload(); }
      get src() { return this._src; }
    },
    createImageBitmap: async (f) => ({ width: 1200, height: 800, close() {}, _file: f }),
    Math, Date, JSON, Promise, Map, Set, parseInt, parseFloat, isFinite, Number, String, Object, Array, TextEncoder,
    crypto: require("crypto").webcrypto,
    confirm: (m) => { log.confirms = (log.confirms || []).concat(m); return respostas.confirm; },
    prompt: (m, d) => { log.prompts = (log.prompts || []).concat(m); return respostas.prompt.length ? respostas.prompt.shift() : d; },
    alert: (m) => log.alerts.push(String(m)),
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  return { ctx, document, els, store, log, respostas };
}

/* Executa o HTML como o navegador: cada <script> roda como script clássico,
   então funções declaradas em um bloco ficam visíveis para os seguintes. */
function carregar(env, htmlPath) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  vm.createContext(env.ctx);
  while ((m = re.exec(html))) {
    let code = m[1].replace(/loadLib\("qr"\)\.catch\(\(\)=>\{\}\);loadLib\("xl"\)\.catch\(\(\)=>\{\}\);/g, "");
    vm.runInContext(code, env.ctx, { filename: path.basename(htmlPath) });
  }
  return env;
}

module.exports = { makeEnv, carregar, limparTimers: (env) => env.ctx.limparTimers && env.ctx.limparTimers() };
