// ========================================
// TWINSWAP
// LIVE SOLANA JUPITER SWAP
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
// JUPITER API
// ========================================

const JUPITER_API =
  "https://lite-api.jup.ag/swap/v1";


// ========================================
// SOLANA RPC
// ========================================

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


// ========================================
// LOAD SOLANA WEB3.JS
// ========================================

async function loadSolanaWeb3() {

  if (web3) {
    return web3;
  }

  quoteStatus.textContent =
    "Loading Solana transaction engine...";

  try {

    const module =
      await import(
        "https://esm.sh/@solana/web3.js@1.98.4"
      );

    web3 = module;

    console.log(
      "Solana web3.js loaded successfully."
    );

    return web3;

  }

  catch (error) {

    console.error(
      "Could not load Solana web3.js:",
      error
    );

    quoteStatus.textContent =
      "Could not load Solana transaction engine.";

    throw error;

  }

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
// CLOSE MENUS
// ========================================

function closeMenus() {

  payTokenMenu.classList.remove("show");

  receiveTokenMenu.classList.remove("show");

}


// ========================================
// PAY TOKEN MENU
// ========================================

payTokenButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    receiveTokenMenu.classList.remove("show");

    payTokenMenu.classList.toggle("show");

  }
);


// ========================================
// RECEIVE TOKEN MENU
// ========================================

receiveTokenButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    payTokenMenu.classList.remove("show");

    receiveTokenMenu.classList.toggle("show");

  }
);


// ========================================
// CLOSE MENUS OUTSIDE
// ========================================

document.addEventListener(
  "click",
  closeMenus
);


// ========================================
// PAY TOKEN SELECTION
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

      }

    );

  });


// ========================================
// RECEIVE TOKEN SELECTION
// ========================================

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

      }

    );

  });


// ========================================
// SWITCH TOKENS
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
// REQUEST QUOTE
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


// ========================================
// RUN JUPITER QUOTE
// ========================================

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


  // EMPTY AMOUNT

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


  // SAME TOKEN

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


  if (!input || !output) {
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
        url.toString(),
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json"
          }
        }
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


    if (
      !Number.isFinite(outputAmount)
    ) {

      throw new Error(
        "Invalid quote amount"
      );

    }


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
// AUTO REFRESH
// ========================================

function startQuoteRefresh() {

  clearInterval(
    refreshTimer
  );


  refreshTimer =
    setInterval(
      function() {

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

}


startQuoteRefresh();


// ========================================
// PHANTOM PROVIDER
// ========================================

function getPhantomProvider() {

  if (
    window.solana &&
    window.solana.isPhantom
  ) {

    return window.solana;

  }


  return null;

}


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
        "Phantom was not detected. Open TwinSwap inside Phantom or install the Phantom browser extension."
      );

      return;

    }


    try {

      const response =
        await provider.connect();


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
        "Wallet connection cancelled";

    }

  }
);


// ========================================
// PHANTOM DISCONNECT
// ========================================

if (window.solana) {

  window.solana.on(
    "disconnect",
    function() {

      walletAddress =
        null;

      latestQuote =
        null;

      walletStatus.textContent =
        "Not connected";

      connectWallet.textContent =
        "Connect Wallet";

    }
  );

}


// ========================================
// BUILD JUPITER TRANSACTION
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


  quoteStatus.textContent =
    "Building transaction...";


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


  console.log(
    "Jupiter transaction response:",
    data
  );


  if (!response.ok) {

    throw new Error(
      data?.error ||
      data?.message ||
      `Swap build failed (${response.status})`
    );

  }


  if (
    !data.swapTransaction
  ) {

    throw new Error(
      "Jupiter did not return a swap transaction."
    );

  }


  return data;

}


// ========================================
// BASE64 → UINT8ARRAY
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
// DESERIALIZE JUPITER TRANSACTION
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


  const transaction =
    solana.VersionedTransaction.deserialize(
      transactionBytes
    );


  return transaction;

}


// ========================================
// CONFIRM TRANSACTION
// ========================================

async function confirmTransaction(
  signature,
  lastValidBlockHeight
) {

  const start =
    Date.now();


  while (
    Date.now() - start <
    60000
  ) {

    try {

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
                "getSignatureStatuses",

              params: [
                [signature],
                {
                  searchTransactionHistory:
                    true
                }
              ]

            })

          }
        );


      const data =
        await response.json();


      const status =
        data?.result?.value?.[0];


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

    }


    catch (error) {

      console.error(
        "Confirmation check:",
        error
      );

      if (
        error.message ===
        "Solana rejected the transaction."
      ) {

        throw error;

      }

    }


    await new Promise(
      function(resolve) {

        setTimeout(
          resolve,
          1500
        );

      }
    );

  }


  return false;

}


// ========================================
// SHOW TRANSACTION RESULT
// ========================================

function showTransactionResult(
  signature
) {

  const shortSignature =
    signature.slice(0, 6) +
    "..." +
    signature.slice(-6);


  const message =
    `Swap successful!\n\nTransaction:\n${shortSignature}\n\nOpen Solscan to view it?`;


  const open =
    confirm(message);


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
      "Phantom was not detected. Open TwinSwap inside Phantom."
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

    quoteStatus.textContent =
      "Getting a fresh quote...";

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

    // ------------------------------------
    // LOAD SOLANA WEB3
    // ------------------------------------

    await loadSolanaWeb3();


    // ------------------------------------
    // BUILD TRANSACTION
    // ------------------------------------

    const swapData =
      await buildSwapTransaction();


    // ------------------------------------
    // CONVERT BASE64 TRANSACTION
    // INTO REAL VERSIONED TRANSACTION
    // ------------------------------------

    quoteStatus.textContent =
      "Transaction ready. Confirm in Phantom...";


    const transaction =
      await deserializeJupiterTransaction(
        swapData.swapTransaction
      );


    console.log(
      "Deserialized transaction:",
      transaction
    );


    // ------------------------------------
    // SEND TO PHANTOM
    // ------------------------------------

    const result =
      await provider.signAndSendTransaction(
        transaction
      );


    console.log(
      "Phantom transaction result:",
      result
    );


    const signature =
      result?.signature ||
      result;


    if (!signature) {

      throw new Error(
        "Phantom did not return a transaction signature."
      );

    }


    // ------------------------------------
    // TRANSACTION SENT
    // ------------------------------------

    quoteStatus.textContent =
      "Transaction sent. Confirming...";


    swapButton.textContent =
      "Confirming...";


    // ------------------------------------
    // CONFIRM ON SOLANA
    // ------------------------------------

    const confirmed =
      await confirmTransaction(
        signature,
        swapData.lastValidBlockHeight
      );


    if (!confirmed) {

      throw new Error(
        "Transaction was sent but confirmation timed out."
      );

    }


    // ------------------------------------
    // SUCCESS
    // ------------------------------------

    quoteStatus.textContent =
      "Swap successful ✓";


    swapButton.textContent =
      "Swap successful ✓";


    swapButton.disabled =
      true;


    latestQuote =
      null;


    showTransactionResult(
      signature
    );

  }


  catch (error) {

    console.error(
      "TwinSwap execution error:",
      error
    );


    // Phantom rejection

    if (
      error?.code === 4001 ||
      error?.message?.toLowerCase().includes(
        "rejected"
      ) ||
      error?.message?.toLowerCase().includes(
        "user rejected"
      )
    ) {

      quoteStatus.textContent =
        "Transaction cancelled in Phantom.";

    }


    // Insufficient balance

    else if (
      error?.message?.toLowerCase().includes(
        "insufficient"
      )
    ) {

      quoteStatus.textContent =
        "Insufficient balance for this swap.";

    }


    else {

      quoteStatus.textContent =
        error.message ||
        "Transaction failed.";

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


console.log(
  "TwinSwap loaded successfully."
);
