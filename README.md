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

