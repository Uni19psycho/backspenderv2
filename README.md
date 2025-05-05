# BackspenderV2

> 💸 A cross-chain capital rotation script using Li.Fi SDK, built to simulate randomized, real-time USDC transfers across Optimism, Base, and Soneium.

## 📋 Overview

This bot randomly selects two chains, fetches a LiFi quote, checks allowance, and sends $10–$25 USDC to a specified wallet address at random intervals.

## 🧠 Features

- ✅ 10 randomized USDC transfers per round
- ✅ Chain-to-chain via LiFi quotes
- ✅ Slippage-safe & contract-checking logic
- ✅ Supports: Optimism, Base, Soneium
- ✅ Adjustable delay, cooldown, and thresholds

## ⚙️ Usage

> ⚠️ Requires Node.js, ethers, dotenv, and @lifi/sdk

### 1. Clone & Install

```bash
git clone https://github.com/uni19psycho/backspenderv2.git
cd backspenderv2
npm install

## ⚙️ How to Use

### 2. Create `.env` File (Do NOT upload this!)

```ini
RPC_URL_OP=your-op-rpc
RPC_URL_BASE=your-base-rpc
RPC_URL_SONEIUM=your-soneium-rpc
PRIVATE_KEY=your-wallet-private-key
RECEIVER_ADDRESS=wallet-to-receive-usdc

### 3. Start the Bot
Run this command from the project root:

node scripts/backspender.js
