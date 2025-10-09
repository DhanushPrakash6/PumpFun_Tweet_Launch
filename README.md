# PumpFun Tweet Tokenizer 🚀

PumpFun Tweet Tokenizer is a Node.js project that **listens to trending tweets** and automatically **creates tokenized meme tokens** on PumpFun to help **creators earn rewards**. It uses WebSockets, Solana blockchain, and Google Generative AI to generate token metadata from tweets.

---

## Features ✨

- Connects to a live tweet feed via Tweet WebSocket.  
- Automatically generates **token metadata** from tweets using Google Generative AI.  
- Creates **Solana token mints** for each tokenized tweet.  
- Posts metadata to **PumpFun API** for farming creator rewards.  

---

## Requirements 🛠️

- Node.js >= 18  
- npm or yarn  
- Google Generative AI API Key

---

## Installation 🔧

1. Clone the repository:

```bash
git clone https://github.com/DhanushPrakash6/PumpFun_Tweet_Launch.git
cd PumpFun_Tweet_Launch
```
2.Install dependencies:
```
npm install
```
3.Create a .env file in the root directory:
```
GOOGLEAI_API_KEY=your_google_ai_key
PUMP_PORTAL_API_KEY=your_pumpfun_api_key
RAPIDLAUNCH_TOKEN=your_rapidlaunch_token
```
4.Start the script:
```
node index.js
```
