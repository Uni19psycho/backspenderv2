require("dotenv").config();
const { ethers } = require("ethers");
const lifi = require("@lifi/sdk");

// Setup providers
const providerOP = new ethers.JsonRpcProvider(process.env.RPC_URL_OP);
const providerBASE = new ethers.JsonRpcProvider(process.env.RPC_URL_BASE);
const providerSONEIUM = new ethers.JsonRpcProvider(process.env.RPC_URL_SONEIUM);

// Wallet
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, providerOP);

// Chains setup
const chains = [
  {
    name: "Optimism",
    provider: providerOP,
    chainId: 10,
    tokenAddress: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    rpc: process.env.RPC_URL_OP
  },
  {
    name: "Base",
    provider: providerBASE,
    chainId: 8453,
    tokenAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    rpc: process.env.RPC_URL_BASE
  },
  {
    name: "Soneium",
    provider: providerSONEIUM,
    chainId: 1868,
    tokenAddress: "0xbA9986D2381edf1DA03B0B9c1f8b00dc4AacC369",
    rpc: process.env.RPC_URL_SONEIUM
  }
];

// Bot settings
const minUSD = 10;
const maxUSD = 25;
const decimals = 6;
const totalTransfersPerRound = 10;
const minDelayMinutes = 4;
const maxDelayMinutes = 8;
const cooldownMinutes = 7;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomAmount(balanceBN) {
  const cents = Math.floor(Math.random() * ((maxUSD - minUSD) * 100 + 1)) + minUSD * 100;
  const raw = ethers.parseUnits((cents / 100).toFixed(2), decimals);
  return raw <= balanceBN ? raw : balanceBN;
}

async function getBalance(provider, tokenAddress) {
  const erc20Abi = ["function balanceOf(address account) view returns (uint256)"];
  const token = new ethers.Contract(tokenAddress, erc20Abi, wallet.connect(provider));
  return await token.balanceOf(wallet.address);
}

async function getAvailableChains() {
  const available = [];
  const minAmount = ethers.parseUnits(minUSD.toString(), decimals);

  for (const chain of chains) {
    const balance = await getBalance(chain.provider, chain.tokenAddress);
    if (balance >= minAmount) {
      available.push({ ...chain, balance });
    }
  }

  return available;
}

async function isContract(address, rpcUrl) {
  const code = await new ethers.JsonRpcProvider(rpcUrl).getCode(address);
  return code !== "0x";
}

async function ensureAllowance(provider, tokenAddress, spender, amount) {
  const erc20Abi = [
    "function allowance(address owner, address spender) view returns (uint256)",
    "function approve(address spender, uint256 amount) returns (bool)"
  ];
  const token = new ethers.Contract(tokenAddress, erc20Abi, wallet.connect(provider));
  const allowance = await token.allowance(wallet.address, spender);

  if (allowance < amount) {
    const tx = await token.approve(spender, amount);
    console.log(`🔐 Approving ${ethers.formatUnits(amount, decimals)} USDC for ${spender}`);
    await tx.wait();
  }
}

async function runTransfer(txNum) {
  const availableChains = await getAvailableChains();

  if (availableChains.length === 0) {
    console.warn(`⏳ No available chain with sufficient balance. Cooling down for ${cooldownMinutes} minutes...`);
    await delay(cooldownMinutes * 60 * 1000);
    return false;
  }

  const fromIndex = Math.floor(Math.random() * availableChains.length);
  const from = availableChains[fromIndex];

  let to;
  do {
    to = chains[Math.floor(Math.random() * chains.length)];
  } while (to.name === from.name);

  console.log(`🔄 Preparing TX ${txNum}: ${from.name} ➔ ${to.name}`);

  const amount = getRandomAmount(from.balance);
  const isReceiverContract = await isContract(process.env.RECEIVER_ADDRESS, to.rpc);
  if (isReceiverContract) {
    console.warn(`🚫 Receiver address is a contract. Skipping.`);
    return false;
  }

  try {
    const quote = await lifi.getQuote({
      fromChain: from.chainId,
      toChain: to.chainId,
      fromToken: from.tokenAddress,
      toToken: to.tokenAddress,
      fromAddress: wallet.address,
      toAddress: process.env.RECEIVER_ADDRESS,
      fromAmount: amount.toString(),
      slippage: 0.005
    });

    if (!quote.transactionRequest) {
      console.warn(`⚠️ No valid bridge route. Skipping.`);
      return false;
    }

    if (BigInt(quote.estimate.toAmountMin) * 100n / BigInt(quote.action.fromAmount) < 95n) {
      console.warn(`⚠️ Low min receive amount (<95%). Skipping.`);
      return false;
    }

    await ensureAllowance(from.provider, from.tokenAddress, quote.transactionRequest.to, amount);

    const tx = await wallet.connect(from.provider).sendTransaction({
      to: quote.transactionRequest.to,
      data: quote.transactionRequest.data,
      value: quote.transactionRequest.value
    });

    console.log(`✅ TX ${txNum}: ${ethers.formatUnits(amount, decimals)} USDC from ${from.name} ➔ ${to.name} | Hash: ${tx.hash}`);
    await tx.wait();
    return true;
  } catch (err) {
    console.warn(`❌ TX ${txNum} failed: ${err.message}`);
    return false;
  }
}

// 🔁 Infinite round loop (new: rounds based on real transfer completions)
(async () => {
  let roundCounter = 1;
  while (true) {
    console.log(`🚀 Starting Round ${roundCounter}...`);
    let successfulTx = 0;
    const roundStartTime = Date.now();

    while (successfulTx < totalTransfersPerRound) {
      const result = await runTransfer(successfulTx + 1);

      if (result) {
        successfulTx++;
        const randomDelay = Math.floor(Math.random() * (maxDelayMinutes - minDelayMinutes + 1) + minDelayMinutes) * 60 * 1000;
        await delay(randomDelay);
      } else {
        await delay(5000); // Small wait if skipped
      }
    }

    const roundEndTime = Date.now();
    const timeSpentMinutes = Math.round((roundEndTime - roundStartTime) / 60000);

    console.log(`✅ Round ${roundCounter} finished after ${timeSpentMinutes} minutes.`);
    console.log(`⏩ Starting next round...\n`);

    roundCounter++;
  }
})();
