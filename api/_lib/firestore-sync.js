const admin = require("firebase-admin");

let dbInstance = null;

function getDb() {
  if (dbInstance) return dbInstance;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Variáveis do Firebase Admin ausentes no ambiente.");
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  dbInstance = admin.firestore();
  return dbInstance;
}

/*
 * Atualiza o documento na coleção sync_status para avisar os clientes
 * conectados em tempo real que houve mudança nos dados do Neon.
 */
async function notificarSincronizacao(origem = "estoque", extra = {}) {
  try {
    const db = getDb();
    await db
      .collection("sync_status")
      .doc("estoque_mdo")
      .set(
        {
          origem,
          atualizadoEm: Date.now(),
          atualizadoEmIso: new Date().toISOString(),
          ...extra,
        },
        { merge: true }
      );
    return { ok: true };
  } catch (err) {
    console.error("[firestore-sync] falha ao notificar:", err.message);
    return { ok: false, erro: err.message };
  }
}

module.exports = { notificarSincronizacao };
