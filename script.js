// ========================================
// TWINSWAP
// SOLANA + JUPITER + PORTFOLIO
// ========================================


// ========================================
// TOKEN DATA
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


// ========================================
// APIs
// ========================================

const JUPITER_API =
  "https://lite-api.jup.ag/swap/v1";

const JUPITER_PRICE_API =
  "https://lite-api.jup.ag/price/v2";

const SOLANA_RPC =
  "https://api.mainnet-beta.solana.com";


// ========================================
// STATE
// ========================================

let payToken = "USDC";
let receiveToken = "SOL";

let walletAddress = null;

let quoteTimer = null;
let refreshTimer = null;

let portfolioTimer = null;

let quoteRequestNumber = 0;

let latestQuote = null;

let isSwapping = false;

let web3 = null;


// ========================================
// ELEMENTS
// ========================================

const payAmount =
  document.getElementById("payAmount");

const receiveAmount =
  document.getElementById("receiveAmount");

const payTokenButton =
  document.getElementById("payTokenButton");

const receiveTokenButton =
  document.getElementById("receiveTokenButton");

const payTokenMenu =
  document.getElementById("payTokenMenu");

const receiveTokenMenu =
  document.getElementById("receiveTokenMenu");

const payTokenName =
  document.getElementById("payTokenName");

const receiveTokenName =
  document.getElementById("receiveTokenName");

const payTokenIcon =
  document.getElementById("payTokenIcon");

const receiveTokenIcon =
  document.getElementById("receiveTokenIcon");

const switchTokens =
  document.getElementById("switchTokens");

const exchangeRate =
  document.getElementById("exchangeRate");

const quoteStatus =
  document.getElementById("quoteStatus");

const connectWallet =
  document.getElementById("connectWallet");

const walletStatus =
  document.getElementById("walletStatus");

const swapButton =
  document.getElementById("swapButton");

const portfolioTotal =
  document.getElementById("portfolioTotal");

const portfolioWallet =
  document.getElementById("portfolioWallet");

const portfolioList =
  document.getElementById("portfolioList");

const refreshPortfolio =
  document.getElementById("refreshPortfolio");


// ========================================
// PHANTOM
// ========================================

function getPhantomProvider() {

  if (
    window.phantom &&
    window.phantom.solana &&
    window.phantom.solana.isPhantom
  ) {
    return window.phantom.solana;
  }

  if (
    window.solana &&
    window.solana.isPhantom
  ) {
    return window.solana;
  }

  return null;
}


// ========================================
// TOKEN DISPLAY
// ========================================

function updateTokenDisplay() {

  const pay =
    TOKENS[payToken];

  const receive =
    TOKENS[receiveToken];

  if (pay) {

    payTokenName.textContent =
      pay.symbol;

    payTokenIcon.textContent =
      pay.icon;

  }

  if (receive) {

    receiveTokenName.textContent =
      receive.symbol;

    receiveTokenIcon.textContent =
      receive.icon;

  }

}


// ========================================
// MENUS
// ========================================

function closeMenus() {

  payTokenMenu.classList.remove("show");

  receiveTokenMenu.classList.remove("show");

}

payTokenButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    receiveTokenMenu.classList.remove("show");

    payTokenMenu.classList.toggle("show");

  }
);

receiveTokenButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    payTokenMenu.classList.remove("show");

    receiveTokenMenu.classList.toggle("show");

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
  .forEach(function(button) {

    button.addEventListener(
      "click",
      function(event) {

        event.stopPropagation();

        const selected =
          button.dataset.token;

        if (!TOKENS[selected]) {
          return;
        }

        if (
          selected ===
          receiveToken
        ) {

          receiveToken =
            payToken;

        }

        payToken =
          selected;

        updateTokenDisplay();

        closeMenus();

        requestQuote();

        updatePayBalance();

      }
    );

  });


receiveTokenMenu
  .querySelectorAll("button")
  .forEach(function(button) {

    button.addEventListener(
      "click",
      function(event) {

        event.stopPropagation();

        const selected =
          button.dataset.token;

        if (!TOKENS[selected]) {
          return;
        }

        if (
          selected ===
          payToken
        ) {

          payToken =
            receiveToken;

        }

        receiveToken =
          selected;

        updateTokenDisplay();

        closeMenus();

        requestQuote();

        updatePayBalance();

      }
    );

  });


// ========================================
// SWITCH
// ========================================

switchTokens.addEventListener(
  "click",
  function() {

    const oldPay =
      payToken;

    payToken =
      receiveToken;

    receiveToken =
      oldPay;

    updateTokenDisplay();

    requestQuote();

    updatePayBalance();

  }
);


// ========================================
// NUMBER FORMAT
// ========================================

function formatNumber(value) {

  const number =
    Number(value);

  if (!Number.isFinite(number)) {
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


// ========================================
// BASE UNITS
// ========================================

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
// QUOTE
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

  latestQuote =
    null;

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {

    receiveAmount.value =
      "";

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
    payToken ===
    receiveToken
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
      await fetch(
        url.toString()
      );

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

    if (
      !data ||
      !data.outAmount
    ) {

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
      formatNumber(outputAmount);

    exchangeRate.textContent =
      `1 ${input.symbol} ≈ ${formatNumber(rate)} ${output.symbol}`;

    quoteStatus.textContent =
      "Live Jupiter quote";

    swapButton.disabled =
      false;

    swapButton.textContent =
      `Swap ${input.symbol} → ${output.symbol}`;

  }

  catch (error) {

    if (
      requestId !==
      quoteRequestNumber
    ) {
      return;
    }

    console.error(
      "Quote error:",
      error
    );

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


// ========================================
// AMOUNT INPUT
// ========================================

payAmount.addEventListener(
  "input",
  requestQuote
);


// ========================================
// SOLANA RPC
// ========================================

async function rpcRequest(
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

          id: Date.now(),

          method,

          params

        })

      }
    );

  const data =
    await response.json();

  if (data.error) {

    throw new Error(
      data.error.message ||
      "Solana RPC error"
    );

  }

  return data.result;

}


// ========================================
// PORTFOLIO PRICE DATA
// ========================================

async function getTokenPrices() {

  const ids =
    Object.values(TOKENS)
      .map(token => token.mint)
      .join(",");

  try {

    const response =
      await fetch(
        `${JUPITER_PRICE_API}?ids=${ids}`
      );

    const data =
      await response.json();

    return data?.data || {};

  }

  catch (error) {

    console.error(
      "Price error:",
      error
    );

    return {};

  }

}


// ========================================
// GET WALLET BALANCES
// ========================================

async function getPortfolioBalances() {

  if (!walletAddress) {
    return [];
  }

  const balances = [];

  // ------------------------------------
  // SOL
  // ------------------------------------

  const solResult =
    await rpcRequest(
      "getBalance",
      [
        walletAddress
      ]
    );

  const solBalance =
    solResult.value /
    1000000000;

  balances.push({
    symbol: "SOL",
    icon: "◎",
    amount: solBalance,
    mint: TOKENS.SOL.mint
  });


  // ------------------------------------
  // SPL TOKENS
  // ------------------------------------

  const tokenResult =
    await rpcRequest(
      "getTokenAccountsByOwner",
      [
        walletAddress,
        {
          programId:
            "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          encoding:
            "jsonParsed"
        }
      ]
    );


  const tokenBalances = {};

  for (
    const account of
    tokenResult.value
  ) {

    const info =
      account.account.data.parsed.info;

    const mint =
      info.mint;

    const amount =
      Number(
        info.tokenAmount.uiAmount
      );

    if (
      amount > 0
    ) {

      tokenBalances[mint] =
        (tokenBalances[mint] || 0) +
        amount;

    }

  }


  for (
    const symbol of
    ["USDC", "USDT", "JUP", "BONK"]
  ) {

    const token =
      TOKENS[symbol];

    balances.push({
      symbol,
      icon: token.icon,
      amount:
        tokenBalances[token.mint] || 0,
      mint:
        token.mint
    });

  }

  return balances;

}


// ========================================
// RENDER PORTFOLIO
// ========================================

async function loadPortfolio() {

  if (!walletAddress) {

    portfolioTotal.textContent =
      "$0.00";

    portfolioWallet.textContent =
      "Connect Phantom to view your portfolio";

    portfolioList.innerHTML = `

      <div class="portfolio-empty">

        <div class="empty-icon">
          ◎
        </div>

        <strong>No wallet connected</strong>

        <span>
          Connect Phantom to see your assets.
        </span>

      </div>

    `;

    return;

  }

  portfolioWallet.textContent =
    `${walletAddress.slice(0, 8)}...${walletAddress.slice(-8)}`;

  portfolioList.innerHTML = `

    <div class="portfolio-empty">

      <div class="empty-icon">
        ↻
      </div>

      <strong>Loading portfolio...</strong>

      <span>
        Fetching your Solana assets.
      </span>

    </div>

  `;

  try {

    const [
      balances,
      prices
    ] =
      await Promise.all([
        getPortfolioBalances(),
        getTokenPrices()
      ]);

    let total =
      0;

    const assets =
      balances.map(function(asset) {

        const priceData =
          prices[asset.mint];

        const price =
          Number(
            priceData?.price || 0
          );

        const value =
          asset.amount *
          price;

        total += value;

        return {
          ...asset,
          price,
          value
        };

      });


    portfolioTotal.textContent =
      `$${total.toLocaleString(
        undefined,
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )}`;


    portfolioList.innerHTML =
      "";


    assets.forEach(function(asset) {

      const item =
        document.createElement("div");

      item.className =
        "portfolio-item";

      item.innerHTML = `

        <div class="asset-left">

          <div class="asset-icon">
            ${asset.icon}
          </div>

          <div class="asset-name">

            <strong>
              ${asset.symbol}
            </strong>

            <span>
              ${formatNumber(asset.amount)}
            </span>

          </div>

        </div>

        <div class="asset-value">

          <strong>
            $${asset.value.toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }
            )}
          </strong>

          <span>
            $${asset.price.toLocaleString(
              undefined,
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 8
              }
            )}
          </span>

        </div>

      `;

      portfolioList.appendChild(
        item
      );

    });

  }

  catch (error) {

    console.error(
      "Portfolio error:",
      error
    );

    portfolioList.innerHTML = `

      <div class="portfolio-empty">

        <div class="empty-icon">
          !
        </div>

        <strong>
          Couldn't load portfolio
        </strong>

        <span>
          Try refreshing your wallet.
        </span>

      </div>

    `;

  }

}


// ========================================
// PAY TOKEN BALANCE
// ========================================

async function updatePayBalance() {

  if (!walletAddress) {

    document.getElementById(
      "payBalance"
    ).textContent =
      "0.00";

    return;

  }

  try {

    const balances =
      await getPortfolioBalances();

    const asset =
      balances.find(
        item =>
          item.symbol === payToken
      );

    document.getElementById(
      "payBalance"
    ).textContent =
      formatNumber(
        asset?.amount || 0
      );

  }

  catch (error) {

    console.error(
      "Balance error:",
      error
    );

  }

}


// ========================================
// REFRESH PORTFOLIO
// ========================================

refreshPortfolio.addEventListener(
  "click",
  async function() {

    if (!walletAddress) {
      return;
    }

    await loadPortfolio();

    await updatePayBalance();

  }
);


// ========================================
// CONNECT PHANTOM
// ========================================

connectWallet.addEventListener(
  "click",
  async function() {

    const provider =
      getPhantomProvider();

    if (!provider) {

      alert(
        "Phantom was not detected. Open TwinSwap inside Phantom or install the Phantom extension."
      );

      return;

    }

    try {

      quoteStatus.textContent =
        "Connecting Phantom...";

      const response =
        await provider.connect();

      if (
        !response ||
        !response.publicKey
      ) {

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

      // LOAD REAL PORTFOLIO

      await loadPortfolio();

      await updatePayBalance();

      if (
        payAmount.value &&
        Number(payAmount.value) > 0
      ) {

        requestQuote();

      }

    }

    catch (error) {

      console.error(
        "Phantom connection error:",
        error
      );

      quoteStatus.textContent =
        error.message ||
        "Wallet connection cancelled";

    }

  }
);


// ========================================
// DISCONNECT
// ========================================

function handlePhantomDisconnect() {

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

  loadPortfolio();

}

const phantom =
  getPhantomProvider();

if (phantom) {

  phantom.on(
    "disconnect",
    handlePhantomDisconnect
  );

}


// ========================================
// AUTO REFRESH PORTFOLIO
// ========================================

portfolioTimer =
  setInterval(
    function() {

      if (walletAddress) {

        loadPortfolio();

        updatePayBalance();

      }

    },
    30000
  );


// ========================================
// WEB3.JS
// ========================================

async function loadSolanaWeb3() {

  if (web3) {
    return web3;
  }

  try {

    const module =
      await import(
        "https://esm.sh/@solana/web3.js@1.98.4"
      );

    web3 =
      module;

    return web3;

  }

  catch (error) {

    console.error(
      "web3.js loading error:",
      error
    );

    throw new Error(
      "Solana transaction engine failed to load."
    );

  }

}


// ========================================
// BUILD SWAP
// ========================================

async function buildSwapTransaction() {

  if (!latestQuote) {

    throw new Error(
      "No valid Jupiter quote available."
    );

  }

  if (!walletAddress) {

    throw new Error(
      "Wallet is not connected."
    );

  }

  const response =
    await fetch(
      `${JUPITER_API}/swap`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          "Accept":
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
      `Swap build failed (${response.status})`
    );

  }

  if (!data.swapTransaction) {

    throw new Error(
      "Jupiter did not return a swap transaction."
    );

  }

  return data;

}


// ========================================
// BASE64
// ========================================

function base64ToUint8Array(
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


// ========================================
// DESERIALIZE
// ========================================

async function deserializeJupiterTransaction(
  base64Transaction
) {

  const solana =
    await loadSolanaWeb3();

  const transactionBytes =
    base64ToUint8Array(
      base64Transaction
    );

  return solana.VersionedTransaction.deserialize(
    transactionBytes
  );

}


// ========================================
// SEND TRANSACTION
// ========================================

async function sendSignedTransaction(
  signedTransaction
) {

  const rawTransaction =
    signedTransaction.serialize();

  let binary = "";

  const chunkSize =
    0x8000;

  for (
    let i = 0;
    i < rawTransaction.length;
    i += chunkSize
  ) {

    binary += String.fromCharCode(
      ...rawTransaction.subarray(
        i,
        Math.min(
          i + chunkSize,
          rawTransaction.length
        )
      )
    );

  }

  const base64Transaction =
    btoa(binary);

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
            base64Transaction,
            {
              encoding:
                "base64",

              skipPreflight:
                false,

              preflightCommitment:
                "confirmed",

              maxRetries:
                3
            }
          ]

        })

      }
    );

  const data =
    await response.json();

  if (data?.error) {

    throw new Error(
      data.error.message ||
      "Solana rejected the transaction."
    );

  }

  if (!data?.result) {

    throw new Error(
      "Solana did not return a transaction signature."
    );

  }

  return data.result;

}


// ========================================
// CONFIRM
// ========================================

async function confirmTransaction(
  signature
) {

  const start =
    Date.now();

  while (
    Date.now() - start <
    60000
  ) {

    const data =
      await rpcRequest(
        "getSignatureStatuses",
        [
          [signature],
          {
            searchTransactionHistory:
              true
          }
        ]
      );

    const status =
      data?.value?.[0];

    if (status) {

      if (status.err) {

        throw new Error(
          "Solana rejected the transaction."
        );

      }

      if (
        status.confirmationStatus ===
          "confirmed" ||
        status.confirmationStatus ===
          "finalized"
      ) {

        return true;

      }

    }

    await new Promise(
      resolve =>
        setTimeout(
          resolve,
          1500
        )
    );

  }

  return false;

}


// ========================================
// SUCCESS
// ========================================

function showTransactionResult(
  signature
) {

  const shortSignature =
    signature.slice(0, 6) +
    "..." +
    signature.slice(-6);

  const open =
    confirm(
      `Swap successful!\n\nTransaction:\n${shortSignature}\n\nOpen Solscan?`
    );

  if (open) {

    window.open(
      `https://solscan.io/tx/${signature}`,
      "_blank"
    );

  }

}


// ========================================
// EXECUTE SWAP
// ========================================

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

    await loadSolanaWeb3();

    quoteStatus.textContent =
      "Building transaction...";

    const swapData =
      await buildSwapTransaction();

    quoteStatus.textContent =
      "Confirm the transaction in Phantom...";

    const transaction =
      await deserializeJupiterTransaction(
        swapData.swapTransaction
      );

    const signedTransaction =
      await provider.signTransaction(
        transaction
      );

    quoteStatus.textContent =
      "Sending transaction...";

    swapButton.textContent =
      "Sending...";

    const signature =
      await sendSignedTransaction(
        signedTransaction
      );

    quoteStatus.textContent =
      "Confirming transaction...";

    swapButton.textContent =
      "Confirming...";

    const confirmed =
      await confirmTransaction(
        signature
      );

    if (!confirmed) {

      throw new Error(
        "Transaction confirmation timed out."
      );

    }

    quoteStatus.textContent =
      "Swap successful ✓";

    swapButton.textContent =
      "Swap successful ✓";

    latestQuote =
      null;

    await loadPortfolio();

    await updatePayBalance();

    showTransactionResult(
      signature
    );

  }

  catch (error) {

    console.error(
      "TwinSwap execution error:",
      error
    );

    const message =
      error?.message ||
      String(error);

    const lower =
      message.toLowerCase();

    if (
      error?.code === 4001 ||
      lower.includes("rejected") ||
      lower.includes("cancelled") ||
      lower.includes("canceled")
    ) {

      quoteStatus.textContent =
        "Transaction cancelled in Phantom.";

    }

    else if (
      lower.includes("insufficient") ||
      lower.includes("funds")
    ) {

      quoteStatus.textContent =
        "Insufficient balance for this swap.";

    }

    else {

      quoteStatus.textContent =
        message;

    }

    swapButton.disabled =
      false;

    swapButton.textContent =
      `Swap ${payToken} → ${receiveToken}`;

  }

  finally {

    isSwapping =
      false;

  }

}


// ========================================
// SWAP BUTTON
// ========================================

swapButton.addEventListener(
  "click",
  executeSwap
);


// ========================================
// INITIALIZE
// ========================================

updateTokenDisplay();

loadPortfolio();

console.log(
  "TwinSwap loaded successfully."
);
