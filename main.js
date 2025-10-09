require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Keypair } = require("@solana/web3.js");
const WebSocket = require("ws");
const bs58 = require("bs58");
const crypto = require("crypto");
const ai = new GoogleGenerativeAI(process.env.GOOGLEAI_API_KEY);

const wsUrl = "wss://rapidlaunch.io/socket.io/?EIO=4&transport=websocket";

let ws;
let isAuthenticated = false;
const keyMap = new Map();
let activeKeyId = null;

function base64ToBytes(b64) {
  return Buffer.from(b64, "base64");
}

async function importKey(raw) {
  return crypto.webcrypto.subtle.importKey(
    "raw",
    raw,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
}

function concatUint8(...arrays) {
  const total = arrays.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    out.set(arr, offset);
    offset += arr.length;
  }
  return out;
}

async function sendCreateTx({symbol, name, description, image}) {
    // const mintKeypair = Keypair.generate();
    // const secretKey = bs58.decode(process.env.PRIVATE_KEY);
    const mintKeypair = Keypair.generate()
    const imgResponse = await fetch(image);
    if (!imgResponse.ok) throw new Error(`Failed to fetch image: ${imgResponse.status}`);
    const arrayBuffer = await imgResponse.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: "image/png" });
    const formData = new FormData();
    formData.append("file", blob),
    formData.append("name", name),
    formData.append("symbol", symbol),
    formData.append("description", description),
    // formData.append("twitter", "https://x.com/a1lon9/status/1812970586420994083"),
    // formData.append("telegram", "https://x.com/a1lon9/status/1812970586420994083"),
    // formData.append("website", "https://pumpportal.fun"),
    formData.append("showName", "true");

    const metadataResponse = await fetch("https://pump.fun/api/ipfs", {
        method: "POST",
        body: formData,
    });
    const metadataResponseJSON = await metadataResponse.json();

    const response = await fetch(`https://pumpportal.fun/api/trade?api-key=${process.env.PUMP_PORTAL_API_KEY}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "action": "create",
            "tokenMetadata": {
                name: metadataResponseJSON.metadata.name,
                symbol: metadataResponseJSON.metadata.symbol,
                uri: metadataResponseJSON.metadataUri
            },
            "mint": bs58.encode(mintKeypair.secretKey), 
            "denominatedInSol": "true", 
            "amount": 0, 
            "slippage": 0, 
            "priorityFee": 0,
            "pool": "pump"
        })
    });
    if(response.status === 200){
        console.log(response);
        const data = await response.json();
        console.log("Transaction: https://solscan.io/tx/" + data.signature);
    } else {
        console.log(response.statusText); 
    }
}

async function generateTokenMetadata(tweet) {
  const prompt = `
    You are a token generator. Based on this tweet JSON, create metadata for a meme token launch on Pump.fun:
    - Token symbol (max 5 chars, all caps)
    - Token name
    - Token description (short, fun, crypto vibe)
    - Token image (use tweet.user.profile_image_url)

    Tweet JSON:
    ${JSON.stringify(tweet)}
    Just give the value in JSON format {symbol, name, description, image}, No quotes Nothing else
    `;

  const model = await ai.getGenerativeModel({model:"gemini-2.5-flash"});
  
  const result = await model.generateContent(prompt);
  let text = result.response.text();
  text = text.replace(/```json|```/g, "").trim();
  return JSON.parse(text);
}

function connect() {
  ws = new WebSocket(wsUrl);

  ws.on("open", () => {
    console.log("✅ Connected to WebSocket server");
    ws.send("40/tweets,"); 
  });

  ws.on("message", async (message, isBinary) => {
    try {
      if (!isBinary) {
        const msg = message.toString();

        if (msg === "2") {
          ws.send("3");
          return;
        }

        if (msg.startsWith("40")) {
          if (!isAuthenticated) {
            ws.send(
              `42/tweets,["authenticate", {"token":"${process.env.RAPIDLAUNCH_TOKEN}"}]`
            );
            isAuthenticated = true;
          }
          return;
        }

        if (msg.startsWith("42/tweets")) {
          const jsonPart = msg.substring(msg.indexOf("["));
          const parsed = JSON.parse(jsonPart);

          const [event, data] = parsed;
          if (event === "authenticated") {
            console.log("🔑 Authenticated");
          } else if (event === "crypto:broadcast_key" || event === "crypto:key_rotate") {
            const raw = base64ToBytes(data.key_b64);
            const key = await importKey(raw);
            keyMap.set(data.key_id, key);
            activeKeyId = data.key_id;
            console.log(`🔐 Key updated (id=${data.key_id})`);
          } else {
            console.log("📡 Event:", event, data);
          }
        }
      } else {
        const u = new Uint8Array(message);
        if (u.length < 29) return;

        const keyId = u[0];
        const iv = u.slice(1, 13);
        const tag = u.slice(u.length - 16);
        const ciphertext = u.slice(13, u.length - 16);

        const key = keyMap.get(keyId) || (activeKeyId && keyMap.get(activeKeyId));
        if (!key) return;

        const decrypted = await crypto.webcrypto.subtle.decrypt(
          { name: "AES-GCM", iv, tagLength: 128 },
          key,
          concatUint8(ciphertext, tag)
        );

        const decoded = JSON.parse(
          new TextDecoder().decode(new Uint8Array(decrypted))
        );
        handleMessage(decoded);
      }
    } catch (err) {
      console.error("❌ Parse/Decrypt error:", err);
    }
  });

  ws.on("error", (error) => {
    console.error(`❌ WebSocket error: ${error.message}`);
  });

  ws.on("close", () => {
    console.log("⚠️ Disconnected, reconnecting in 2s...");
    isAuthenticated = false;
    setTimeout(connect, 2000);
  });
}

function handleMessage({ t, d }) {
  switch (t) {
    case "initial_tweets":
      console.log("📥 Initial Tweets:", d);
      break;
    case "tweet_mini_update":
      console.log("⚡ Mini Tweet:", d);
      break;
    case "tweet_full_update":
      console.log("📝 Full Tweet:", d);
      generateTokenMetadata(d).then((metadata) => {
        if (!metadata) {
          console.error("⚠️ Metadata generation failed");
          return;
        }
        console.log("🎨 Token Metadata:", metadata);
        sendCreateTx(metadata);
      });
      break;
    case "profile_update":
      console.log("👤 Profile Update:", d);
      break;
    case "user.follow":
    case "user.unfollow":
      console.log("🔔 Follow Event:", d);
      break;
    case "snipe_confirmed":
      console.log("🎯 Snipe Confirmed:", d);
      break;
    default:
      console.log("📡 Unknown:", t, d);
  }
}

connect();
