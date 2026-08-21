// ========================================
// TWINSWAP
// ========================================

const TOKENS = {
  SOL: {
    symbol: "SOL",
    icon: "◎",
    mint: "So11111111111111111111111111111111111111112",
    decimals: 9
  },

  USDC: {
    symbol: "USDC",
    icon: "💵",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6
  },

  USDT: {
    symbol: "USDT",
    icon: "💵",
    mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6
  },

  JUP: {
    symbol: "JUP",
    icon: "🪐",
    mint: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6
  },

  BONK: {
    symbol: "BONK",
    icon: "🐕",
    mint: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5
  }
};

const JUPITER_API =
  "https://lite-api.jup.ag/swap/v1";

const SOLANA_RPC =
  "https://api.mainnet-beta.solana.com";

let payToken = "USDC";
let receiveToken = "SOL";

let walletAddress = null;
let latestQuote = null;

let quoteTimer = null;
let refreshTimer = null;
let quoteRequestNumber = 0;
let isSwapping = false;

// ========================================
// ELEMENT HELPER
// ========================================

const $ = id =>
  document.getElementById(id);

// ========================================
// ELEMENTS
// ========================================

const payAmount =
  $("payAmount");

const receiveAmount =
  $("receiveAmount");

const payTokenButton =
  $("payTokenButton");

const receiveTokenButton =
  $("receiveTokenButton");

const payTokenMenu =
  $("payTokenMenu");

const receiveTokenMenu =
  $("receiveTokenMenu");

const payTokenName =
  $("payTokenName");

const receiveTokenName =
  $("receiveTokenName");

const payTokenIcon =
  $("payTokenIcon");

const receiveTokenIcon =
  $("receiveTokenIcon");

const switchTokens =
  $("switchTokens");

const exchangeRate =
  $("exchangeRate");

const quoteStatus =
  $("quoteStatus");

const connectWallet =
  $("connectWallet");

const walletStatus =
  $("walletStatus");

const swapButton =
  $("swapButton");

// ========================================
// PHANTOM
// ========================================

function getPhantomProvider() {

  if (
    window.phantom?.solana?.isPhantom
  ) {
    return window.phantom.solana;
  }

  if (
    window.solana?.isPhantom
  ) {
    return window.solana;
  }

  return null;
}

// ========================================
// TABS
// ========================================

document
  .querySelectorAll(".nav-button")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        document
          .querySelectorAll(".nav-button")
          .forEach(btn =>
            btn.classList.remove("active")
          );

        document
          .querySelectorAll(".tab-content")
          .forEach(tab =>
            tab.classList.remove("active")
          );

        button.classList.add("active");

        const tab =
          $(button.dataset.tab);

        if (tab) {
          tab.classList.add("active");
        }

        if (
          button.dataset.tab ===
          "portfolioTab"
        ) {
          loadPortfolio();
        }

      }
    );

  });

// ========================================
// TOKEN DISPLAY
// ========================================

function updateTokenDisplay() {

  const pay =
    TOKENS[payToken];

  const receive =
    TOKENS[receiveToken];

  payTokenName.textContent =
    pay.symbol;

  payTokenIcon.textContent =
    pay.icon;

  receiveTokenName.textContent =
    receive.symbol;

  receiveTokenIcon.textContent =
    receive.icon;
}

// ========================================
// MENUS
// ========================================

function closeMenus() {

  payTokenMenu.classList.remove(
    "show"
  );

  receiveTokenMenu.classList.remove(
    "show"
  );
}

payTokenButton.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    receiveTokenMenu.classList.remove(
      "show"
    );

    payTokenMenu.classList.toggle(
      "show"
    );
  }
);

receiveTokenButton.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    payTokenMenu.classList.remove(
      "show"
    );

    receiveTokenMenu.classList.toggle(
      "show"
    );
  }
);

document.addEventListener(
  "click",
  closeMenus
);

// ========================================
// TOKEN SELECTION
// ========================================

payTokenMenu
  .querySelectorAll("button")
  .forEach(button => {

    button.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        const selected =
          button.dataset.token;

        if (
          selected === receiveToken
        ) {
          receiveToken =
            payToken;
        }

        payToken =
          selected;

        updateTokenDisplay();

        closeMenus();

        requestQuote();

      }
    );

  });

receiveTokenMenu
  .querySelectorAll("button")
  .forEach(button => {

    button.addEventListener(
      "click",
      event => {

        event.stopPropagation();

        const selected =
          button.dataset.token;

        if (
          selected === payToken
        ) {
          payToken =
            receiveToken;
        }

        receiveToken =
          selected;

        updateTokenDisplay();

        closeMenus();

        requestQuote();

      }
    );

  });

// ========================================
// SWITCH TOKENS
// ========================================

switchTokens.addEventListener(
  "click",
  () => {

    [
      payToken,
      receiveToken
    ] =
    [
      receiveToken,
      payToken
    ];

    updateTokenDisplay();

    requestQuote();

  }
);

// ========================================
// FORMAT
// ========================================

function formatNumber(value) {

  const number =
    Number(value);

  if (
    !Number.isFinite(number)
  ) {
    return "0";
  }

  if (number === 0) {
    return "0";
  }

  if (number < 0.000001) {

    return number.toExponential(5);

  }

  return number.toLocaleString(
    undefined,
    {
      maximumFractionDigits: 8
    }
  );
}

function formatUSD(value) {

  return Number(value || 0)
    .toLocaleString(
      "en-US",
      {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 2
      }
    );
}

function toBaseUnits(
  amount,
  decimals
) {

  const value =
    Number(amount);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  return Math.floor(
    value *
    Math.pow(
      10,
      decimals
    )
  ).toString();
}

// ========================================
// QUOTES
// ========================================

function requestQuote() {

  clearTimeout(
    quoteTimer
  );

  quoteTimer =
    setTimeout(
      runQuote,
      250
    );
}

async function runQuote() {

  const requestId =
    ++quoteRequestNumber;

  const amount =
    Number(payAmount.value);

  const input =
    TOKENS[payToken];

  const output =
    TOKENS[receiveToken];

  latestQuote = null;

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    receiveAmount.value = "";

    exchangeRate.textContent =
      "Enter an amount";

    quoteStatus.textContent =
      "Ready";

    swapButton.disabled =
      true;

    swapButton.textContent =
      "Enter amount";

    return;
  }

  if (
    payToken === receiveToken
  ) {

    receiveAmount.value =
      formatNumber(amount);

    exchangeRate.textContent =
      "1 : 1";

    quoteStatus.textContent =
      "Choose different tokens";

    swapButton.disabled =
      true;

    swapButton.textContent =
      "Choose different tokens";

    return;
  }

  const rawAmount =
    toBaseUnits(
      amount,
      input.decimals
    );

  if (!rawAmount) {
    return;
  }

  quoteStatus.textContent =
    "Fetching live quote...";

  exchangeRate.textContent =
    "Loading...";

  receiveAmount.value =
    "";

  swapButton.disabled =
    true;

  swapButton.textContent =
    "Getting quote...";

  try {

    const url =
      new URL(
        `${JUPITER_API}/quote`
      );

    url.searchParams.set(
      "inputMint",
      input.mint
    );

    url.searchParams.set(
      "outputMint",
      output.mint
    );

    url.searchParams.set(
      "amount",
      rawAmount
    );

    url.searchParams.set(
      "slippageBps",
      "50"
    );

    const response =
      await fetch(url);

    const data =
      await response.json();

    if (
      requestId !==
      quoteRequestNumber
    ) {
      return;
    }

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `Jupiter error ${response.status}`
      );

    }

    if (!data?.outAmount) {

      throw new Error(
        "No swap route found"
      );

    }

    const outputAmount =
      Number(data.outAmount) /
      Math.pow(
        10,
        output.decimals
      );

    const rate =
      outputAmount /
      amount;

    latestQuote =
      data;

    receiveAmount.value =
      formatNumber(
        outputAmount
      );

    exchangeRate.textContent =
      `1 ${input.symbol} ≈ ${formatNumber(rate)} ${output.symbol}`;

    quoteStatus.textContent =
      "Live Jupiter quote";

    swapButton.disabled =
      false;

    swapButton.textContent =
      `Swap ${input.symbol} → ${output.symbol}`;

  } catch (error) {

    if (
      requestId !==
      quoteRequestNumber
    ) {
      return;
    }

    console.error(error);

    receiveAmount.value =
      "—";

    exchangeRate.textContent =
      "Quote unavailable";

    quoteStatus.textContent =
      error.message ||
      "Could not get live quote";

    swapButton.disabled =
      true;

    swapButton.textContent =
      "Quote unavailable";
  }
}

payAmount.addEventListener(
  "input",
  requestQuote
);

// ========================================
// AUTO REFRESH QUOTE
// ========================================

refreshTimer =
  setInterval(
    () => {

      if (
        payAmount.value &&
        Number(payAmount.value) > 0 &&
        !isSwapping
      ) {
        requestQuote();
      }

    },
    10000
  );

// ========================================
// CONNECT WALLET
// ========================================

connectWallet.addEventListener(
  "click",
  async () => {

    const provider =
      getPhantomProvider();

    if (!provider) {

      alert(
        "Phantom was not detected. Open TwinSwap inside Phantom or install Phantom."
      );

      return;
    }

    try {

      quoteStatus.textContent =
        "Connecting Phantom...";

      const response =
        await provider.connect();

      if (!response?.publicKey) {

        throw new Error(
          "Phantom did not return a public key."
        );

      }

      walletAddress =
        response.publicKey.toString();

      walletStatus.textContent =
        walletAddress.slice(0, 4) +
        "..." +
        walletAddress.slice(-4);

      connectWallet.textContent =
        "Wallet Connected";

      quoteStatus.textContent =
        "Phantom connected";

      updatePortfolioWallet();

      loadPortfolio();

      if (
        payAmount.value &&
        Number(payAmount.value) > 0
      ) {
        requestQuote();
      }

    } catch (error) {

      console.error(error);

      quoteStatus.textContent =
        error.message ||
        "Wallet connection cancelled";
    }

  }
);

// ========================================
// WALLET DISCONNECT
// ========================================

const initialProvider =
  getPhantomProvider();

if (initialProvider) {

  initialProvider.on(
    "disconnect",
    () => {

      walletAddress =
        null;

      latestQuote =
        null;

      walletStatus.textContent =
        "Not connected";

      connectWallet.textContent =
        "Connect Wallet";

      quoteStatus.textContent =
        "Wallet disconnected";

      updatePortfolioWallet();

      resetPortfolio();

    }
  );

}

// ========================================
// PORTFOLIO
// ========================================

const PORTFOLIO_MINTS = {

  USDC:
    TOKENS.USDC.mint,

  USDT:
    TOKENS.USDT.mint,

  JUP:
    TOKENS.JUP.mint,

  BONK:
    TOKENS.BONK.mint

};

function updatePortfolioWallet() {

  const element =
    $("portfolioWallet");

  if (!walletAddress) {

    element.textContent =
      "Not connected";

    return;
  }

  element.textContent =
    walletAddress.slice(0, 6) +
    "..." +
    walletAddress.slice(-6);
}

function resetPortfolio() {

  $("portfolioTotal").textContent =
    "$0.00";

  $("portfolioAssetCount").textContent =
    "0";

  $("portfolioStatus").textContent =
    "Connect Phantom to view your portfolio.";

  setAsset(
    "SOL",
    0,
    0
  );

  setAsset(
    "USDC",
    0,
    0
  );

  setAsset(
    "USDT",
    0,
    0
  );

  setAsset(
    "JUP",
    0,
    0
  );

  setAsset(
    "BONK",
    0,
    0
  );
}

// ========================================
// SOLANA RPC
// ========================================

async function rpc(
  method,
  params
) {

  const response =
    await fetch(
      SOLANA_RPC,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          jsonrpc: "2.0",

          id: 1,

          method,

          params

        })
      }
    );

  const data =
    await response.json();

  if (data.error) {

    throw new Error(
      data.error.message
    );

  }

  return data.result;
}

// ========================================
// SOL BALANCE
// ========================================

async function getSolBalance(
  address
) {

  const result =
    await rpc(
      "getBalance",
      [address]
    );

  return (
    result.value /
    1e9
  );
}

// ========================================
// SPL TOKEN BALANCE
// ========================================

async function getTokenBalance(
  address,
  mint
) {

  const result =
    await rpc(
      "getTokenAccountsByOwner",
      [
        address,

        {
          mint
        },

        {
          encoding:
            "jsonParsed"
        }
      ]
    );

  let total = 0;

  for (
    const account
    of result.value
  ) {

    total += Number(
      account.account.data.parsed
        .info.tokenAmount.uiAmount ||
      0
    );

  }

  return total;
}

// ========================================
// TOKEN PRICES
// ========================================

async function getPrices() {

  const mints = [

    TOKENS.SOL.mint,

    TOKENS.USDC.mint,

    TOKENS.USDT.mint,

    TOKENS.JUP.mint,

    TOKENS.BONK.mint

  ].join(",");

  const response =
    await fetch(
      `https://api.jup.ag/price/v3?ids=${mints}`
    );

  if (!response.ok) {

    throw new Error(
      "Could not load token prices."
    );

  }

  const data =
    await response.json();

  return {

    SOL:
      Number(
        data[
          TOKENS.SOL.mint
        ]?.usdPrice || 0
      ),

    USDC:
      Number(
        data[
          TOKENS.USDC.mint
        ]?.usdPrice || 0
      ),

    USDT:
      Number(
        data[
          TOKENS.USDT.mint
        ]?.usdPrice || 0
      ),

    JUP:
      Number(
        data[
          TOKENS.JUP.mint
        ]?.usdPrice || 0
      ),

    BONK:
      Number(
        data[
          TOKENS.BONK.mint
        ]?.usdPrice || 0
      )

  };
}

// ========================================
// UPDATE ASSET
// ========================================

function setAsset(
  symbol,
  balance,
  value
) {

  const balanceElement =
    $(
      `${symbol.toLowerCase()}Balance`
    );

  const valueElement =
    $(
      `${symbol.toLowerCase()}Value`
    );

  if (balanceElement) {

    balanceElement.textContent =
      formatNumber(balance);

  }

  if (valueElement) {

    valueElement.textContent =
      formatUSD(value);

  }
}

// ========================================
// LOAD PORTFOLIO
// ========================================

async function loadPortfolio() {

  updatePortfolioWallet();

  if (!walletAddress) {

    resetPortfolio();

    return;
  }

  $("portfolioStatus").textContent =
    "Loading wallet assets...";

  try {

    const results =
      await Promise.all([

        getSolBalance(
          walletAddress
        ),

        getTokenBalance(
          walletAddress,
          PORTFOLIO_MINTS.USDC
        ),

        getTokenBalance(
          walletAddress,
          PORTFOLIO_MINTS.USDT
        ),

        getTokenBalance(
          walletAddress,
          PORTFOLIO_MINTS.JUP
        ),

        getTokenBalance(
          walletAddress,
          PORTFOLIO_MINTS.BONK
        ),

        getPrices()

      ]);

    const sol =
      results[0];

    const usdc =
      results[1];

    const usdt =
      results[2];

    const jup =
      results[3];

    const bonk =
      results[4];

    const prices =
      results[5];

    const solValue =
      sol * prices.SOL;

    const usdcValue =
      usdc * prices.USDC;

    const usdtValue =
      usdt * prices.USDT;

    const jupValue =
      jup * prices.JUP;

    const bonkValue =
      bonk * prices.BONK;

    const total =
      solValue +
      usdcValue +
      usdtValue +
      jupValue +
      bonkValue;

    setAsset(
      "SOL",
      sol,
      solValue
    );

    setAsset(
      "USDC",
      usdc,
      usdcValue
    );

    setAsset(
      "USDT",
      usdt,
      usdtValue
    );

    setAsset(
      "JUP",
      jup,
      jupValue
    );

    setAsset(
      "BONK",
      bonk,
      bonkValue
    );

    let assetCount = 0;

    if (sol > 0) assetCount++;
    if (usdc > 0) assetCount++;
    if (usdt > 0) assetCount++;
    if (jup > 0) assetCount++;
    if (bonk > 0) assetCount++;

    $("portfolioAssetCount")
      .textContent =
      assetCount;

    $("portfolioTotal")
      .textContent =
      formatUSD(total);

    $("portfolioStatus")
      .textContent =
      "Updated just now.";

  } catch (error) {

    console.error(
      "Portfolio error:",
      error
    );

    $("portfolioStatus")
      .textContent =
      "Could not load portfolio. Tap refresh and try again.";

  }
}

// ========================================
// REFRESH PORTFOLIO
// ========================================

$("refreshPortfolio")
  .addEventListener(
    "click",
    async () => {

      const button =
        $("refreshPortfolio");

      button.style.transform =
        "rotate(360deg)";

      await loadPortfolio();

      setTimeout(
        () => {
          button.style.transform =
            "";
        },
        300
      );

    }
  );

// ========================================
// SWAP TRANSACTION
// ========================================

async function loadWeb3() {

  return await import(
    "https://esm.sh/@solana/web3.js@1.98.4"
  );
}

async function buildSwapTransaction() {

  if (!latestQuote) {

    throw new Error(
      "No valid quote available."
    );

  }

  const response =
    await fetch(
      `${JUPITER_API}/swap`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({

          userPublicKey:
            walletAddress,

          quoteResponse:
            latestQuote,

          dynamicComputeUnitLimit:
            true,

          prioritizationFeeLamports: {

            priorityLevelWithMaxLamports: {

              priorityLevel:
                "veryHigh",

              maxLamports:
                1000000

            }

          }

        })
      }
    );

  const data =
    await response.json();

  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      "Swap build failed."
    );

  }

  if (!data.swapTransaction) {

    throw new Error(
      "No transaction returned by Jupiter."
    );

  }

  return data.swapTransaction;
}

function base64ToBytes(
  base64
) {

  const binary =
    atob(base64);

  const bytes =
    new Uint8Array(
      binary.length
    );

  for (
    let i = 0;
    i < binary.length;
    i++
  ) {

    bytes[i] =
      binary.charCodeAt(i);

  }

  return bytes;
}

async function executeSwap() {

  if (isSwapping) {
    return;
  }

  const provider =
    getPhantomProvider();

  if (!provider) {

    alert(
      "Phantom was not detected."
    );

    return;
  }

  if (!walletAddress) {

    alert(
      "Connect Phantom first."
    );

    return;
  }

  if (!latestQuote) {

    requestQuote();

    return;
  }

  isSwapping =
    true;

  swapButton.disabled =
    true;

  swapButton.textContent =
    "Preparing swap...";

  try {

    const web3 =
      await loadWeb3();

    quoteStatus.textContent =
      "Building transaction...";

    const transactionBase64 =
      await buildSwapTransaction();

    const transaction =
      web3.VersionedTransaction
        .deserialize(
          base64ToBytes(
            transactionBase64
          )
        );

    quoteStatus.textContent =
      "Confirm the transaction in Phantom...";

    const signed =
      await provider.signTransaction(
        transaction
      );

    quoteStatus.textContent =
      "Sending transaction...";

    const raw =
      signed.serialize();

    let binary = "";

    for (
      let i = 0;
      i < raw.length;
      i += 0x8000
    ) {

      binary +=
        String.fromCharCode(
          ...raw.subarray(
            i,
            Math.min(
              i + 0x8000,
              raw.length
            )
          )
        );

    }

    const response =
      await fetch(
        SOLANA_RPC,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            jsonrpc: "2.0",

            id: 1,

            method:
              "sendTransaction",

            params: [

              btoa(binary),

              {
                encoding:
                  "base64",

                skipPreflight:
                  false,

                preflightCommitment:
                  "confirmed"
              }

            ]

          })
        }
      );

    const result =
      await response.json();

    if (result.error) {

      throw new Error(
        result.error.message
      );

    }

    const signature =
      result.result;

    quoteStatus.textContent =
      "Swap sent ✓";

    swapButton.textContent =
      "Swap successful ✓";

    latestQuote =
      null;

    setTimeout(
      loadPortfolio,
      3000
    );

    window.open(
      `https://solscan.io/tx/${signature}`,
      "_blank"
    );

  } catch (error) {

    console.error(error);

    quoteStatus.textContent =
      error.message ||
      "Swap failed.";

    swapButton.disabled =
      false;

    swapButton.textContent =
      `Swap ${payToken} → ${receiveToken}`;

  } finally {

    isSwapping =
      false;

  }
}

swapButton.addEventListener(
  "click",
  executeSwap
);

// ========================================
// INITIALIZE
// ========================================

updateTokenDisplay();

updatePortfolioWallet();

resetPortfolio();

console.log(
  "TwinSwap loaded successfully."
);
