/* Harness mínimo de DOM para testar o index.html do MDO Estoque no Node.
   Não é um navegador: cobre o que o app usa (getElementById, querySelectorAll,
   onclick/oninput/onchange, classList, localStorage, prompt/confirm/alert). */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

function makeEnv(opts = {}) {
  const els = new Map();
  function mk(id, tag = "div") {
    const el = {
      id, tagName: tag.toUpperCase(), className: "", textContent: "", innerHTML: "",
      value: "", type: "text", disabled: false, style: {}, dataset: {}, children: [],
      _cls: new Set(),
      classList: {
        add: (c) => el._cls.add(c), remove: (c) => el._cls.delete(c),
        toggle: (c, on) => (on ? el._cls.add(c) : el._cls.delete(c)),
        contains: (c) => el._cls.has(c),
      },
      appendChild(c) { el.children.push(c); return c; },
      removeChild(c) { el.children = el.children.filter((x) => x !== c); },
      remove() {}, focus() {}, click() { if (el.onclick) el.onclick({ target: el }); },
      querySelector: () => null, closest: () => null, setAttribute() {}, addEventListener() {},
      getContext: () => null, play: async () => {}, getCapabilities: () => ({}), applyConstraints: async () => {},
      getTracks: () => [{ stop() {} }], getVideoTracks: () => [{ getCapabilities: () => ({}), applyConstraints: async () => {} }],
    };
    Object.defineProperty(el, "innerHTML", {
      get: () => el._html || "",
      set: (v) => { el._html = v; },
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
  const respostas = { confirm: true, prompt: [] };
  const log = { alerts: [], toasts: [] };
  const ctx = {
    document, localStorage, console,
    navigator: { vibrate() {}, mediaDevices: undefined, userAgent: "node" },
    window: {}, URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} },
    Blob: class { constructor() {} }, setTimeout: (f) => { try { f(); } catch (e) {} return 0; },
    clearTimeout() {}, Math, Date, JSON, Promise, Map, Set, parseInt, parseFloat, isFinite, Number, String, Object, Array, TextEncoder,
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

module.exports = { makeEnv, carregar };
