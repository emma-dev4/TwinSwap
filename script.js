// ======================================================
// TWINSWAP
// ======================================================

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


// ======================================================
// CONFIG
// ======================================================

const JUPITER_API =
  "https://lite-api.jup.ag/swap/v1";

const SOLANA_RPC =
  "https://api.mainnet-beta.solana.com";


// ======================================================
// STATE
// ======================================================

let payToken = "USDC";
let receiveToken = "SOL";

let walletAddress = null;

let latestQuote = null;

let quoteTimer = null;

let refreshTimer = null;

let quoteRequestNumber = 0;

let isSwapping = false;


// ======================================================
// HELPER
// ======================================================

const $ = id =>
  document.getElementById(id);


// ======================================================
// ELEMENTS
// ======================================================

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


// ======================================================
// PHANTOM
// ======================================================

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


// ======================================================
// TABS
// ======================================================

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


// ======================================================
// TOKEN DISPLAY
// ======================================================

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


// ======================================================
// TOKEN MENUS
// ======================================================

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


// ======================================================
// TOKEN SELECTION
// ======================================================

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

        updatePayBalance();

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


// ======================================================
// SWITCH TOKENS
// ======================================================

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

    updatePayBalance();

    requestQuote();

  }
);


// ======================================================
// FORMATTING
// ======================================================

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

  if (
    Math.abs(number) < 0.000001
  ) {
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

  const number =
    Number(value || 0);

  if (!Number.isFinite(number)) {
    return "$0.00";
  }

  return number.toLocaleString(
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


// ======================================================
// QUOTES
// ======================================================

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


payAmount.addEventListener(
  "input",
  requestQuote
);


// ======================================================
// AUTO QUOTE REFRESH
// ======================================================

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


// ======================================================
// CONNECT WALLET
// ======================================================

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

      updateConnectionIndicator();

      await loadPortfolio();

      updatePayBalance();


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


// ======================================================
// WALLET EVENTS
// ======================================================

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

      updateConnectionIndicator();

      resetPortfolio();

      updatePayBalance();

    }
  );

}


// ======================================================
// PORTFOLIO
// ======================================================

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


// ======================================================
// PORTFOLIO UI
// ======================================================

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


function updateConnectionIndicator() {

  const dot =
    $("walletConnectionDot");


  if (
    walletAddress
  ) {

    dot.classList.add(
      "connected"
    );

  } else {

    dot.classList.remove(
      "connected"
    );

  }

}


function resetPortfolio() {

  $("portfolioTotal").textContent =
    "$0.00";

  $("portfolioAssetCount").textContent =
    "0";

  $("assetCountLabel").textContent =
    "0 assets";

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


  $("portfolioEmpty").hidden =
    true;

}


// ======================================================
// SOLANA RPC
// ======================================================

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

          id: Date.now(),

          method,

          params

        })
      }
    );


  if (!response.ok) {

    throw new Error(
      `Solana RPC HTTP ${response.status}`
    );

  }


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


// ======================================================
// SOL BALANCE
// ======================================================

async function getSolBalance(
  address
) {

  const result =
    await rpc(
      "getBalance",
      [
        address,
        {
          commitment: "confirmed"
        }
      ]
    );


  return (
    Number(result.value || 0) /
    1e9
  );

}


// ======================================================
// SPL TOKEN BALANCE
// ======================================================

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
          encoding: "jsonParsed",
          commitment: "confirmed"
        }

      ]
    );


  let total = 0;


  for (
    const account
    of result.value || []
  ) {

    const amount =
      account
        ?.account
        ?.data
        ?.parsed
        ?.info
        ?.tokenAmount
        ?.uiAmount;


    if (
      amount !== null &&
      amount !== undefined
    ) {

      total +=
        Number(amount) || 0;

    }

  }


  return total;

}


// ======================================================
// TOKEN PRICES
// ======================================================

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
      `Price API HTTP ${response.status}`
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


// ======================================================
// SAFE PRICE LOADER
// ======================================================

async function getPricesSafe() {

  try {

    return await getPrices();

  } catch (error) {

    console.warn(
      "Price API unavailable:",
      error
    );


    /*
      Returning zero prices instead of throwing
      means the portfolio can still display
      the actual wallet balances.
    */

    return {

      SOL: 0,
      USDC: 0,
      USDT: 0,
      JUP: 0,
      BONK: 0

    };

  }

}


// ======================================================
// ASSET UI
// ======================================================

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


// ======================================================
// PAY BALANCE
// ======================================================

async function updatePayBalance() {

  const element =
    $("payBalance");


  if (!walletAddress) {

    element.textContent =
      "0.00";

    return;
  }


  try {

    let balance = 0;


    if (
      payToken === "SOL"
    ) {

      balance =
        await getSolBalance(
          walletAddress
        );

    } else {

      balance =
        await getTokenBalance(
          walletAddress,
          TOKENS[payToken].mint
        );

    }


    element.textContent =
      formatNumber(balance);

  } catch (error) {

    console.warn(
      "Could not load pay balance:",
      error
    );

    element.textContent =
      "—";

  }

}


// ======================================================
// LOAD PORTFOLIO
// ======================================================

async function loadPortfolio() {

  updatePortfolioWallet();

  updateConnectionIndicator();


  if (!walletAddress) {

    resetPortfolio();

    return;

  }


  const status =
    $("portfolioStatus");

  const refreshButton =
    $("refreshPortfolio");


  status.textContent =
    "Loading wallet assets...";


  refreshButton.classList.add(
    "loading"
  );


  try {

    /*
      IMPORTANT FIX:

      We don't use one giant Promise.all anymore.

      If one token request fails, it will NOT
      destroy the entire portfolio.
    */


    const balances = {

      SOL: 0,
      USDC: 0,
      USDT: 0,
      JUP: 0,
      BONK: 0

    };


    // -----------------------------
    // SOL
    // -----------------------------

    try {

      balances.SOL =
        await getSolBalance(
          walletAddress
        );

    } catch (error) {

      console.warn(
        "SOL balance failed:",
        error
      );

    }


    // -----------------------------
    // SPL TOKENS
    // -----------------------------

    const tokenResults =
      await Promise.allSettled([

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
        )

      ]);


    if (
      tokenResults[0].status ===
      "fulfilled"
    ) {
      balances.USDC =
        tokenResults[0].value;
    }


    if (
      tokenResults[1].status ===
      "fulfilled"
    ) {
      balances.USDT =
        tokenResults[1].value;
    }


    if (
      tokenResults[2].status ===
      "fulfilled"
    ) {
      balances.JUP =
        tokenResults[2].value;
    }


    if (
      tokenResults[3].status ===
      "fulfilled"
    ) {
      balances.BONK =
        tokenResults[3].value;
    }


    // -----------------------------
    // PRICES
    // -----------------------------

    const prices =
      await getPricesSafe();


    // -----------------------------
    // VALUES
    // -----------------------------

    const values = {

      SOL:
        balances.SOL *
        prices.SOL,

      USDC:
        balances.USDC *
        prices.USDC,

      USDT:
        balances.USDT *
        prices.USDT,

      JUP:
        balances.JUP *
        prices.JUP,

      BONK:
        balances.BONK *
        prices.BONK

    };


    const total =
      values.SOL +
      values.USDC +
      values.USDT +
      values.JUP +
      values.BONK;


    // -----------------------------
    // UPDATE UI
    // -----------------------------

    setAsset(
      "SOL",
      balances.SOL,
      values.SOL
    );

    setAsset(
      "USDC",
      balances.USDC,
      values.USDC
    );

    setAsset(
      "USDT",
      balances.USDT,
      values.USDT
    );

    setAsset(
      "JUP",
      balances.JUP,
      values.JUP
    );

    setAsset(
      "BONK",
      balances.BONK,
      values.BONK
    );


    // -----------------------------
    // ASSET COUNT
    // -----------------------------

    let assetCount = 0;


    Object.values(
      balances
    ).forEach(balance => {

      if (
        Number(balance) > 0
      ) {
        assetCount++;
      }

    });


    $("portfolioAssetCount")
      .textContent =
      assetCount;


    $("assetCountLabel")
      .textContent =
      `${assetCount} ${
        assetCount === 1
          ? "asset"
          : "assets"
      }`;


    $("portfolioTotal")
      .textContent =
      formatUSD(total);


    // -----------------------------
    // EMPTY WALLET
    // -----------------------------

    if (
      assetCount === 0
    ) {

      $("portfolioEmpty").hidden =
        false;

      status.textContent =
        "Wallet loaded — no supported assets found.";

    } else {

      $("portfolioEmpty").hidden =
        true;

      status.textContent =
        "Updated just now.";

    }


  } catch (error) {

    /*
      This is now only for a genuine
      overall failure, not a single
      failed token request.
    */

    console.error(
      "Portfolio error:",
      error
    );


    status.textContent =
      "Couldn't load wallet data. Tap refresh to try again.";

  } finally {

    refreshButton.classList.remove(
      "loading"
    );

  }

}


// ======================================================
// REFRESH PORTFOLIO
// ======================================================

$("refreshPortfolio")
  .addEventListener(
    "click",
    async () => {

      await loadPortfolio();

    }
  );


// ======================================================
// SWAP TRANSACTION
// ======================================================

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


// ======================================================
// BASE64
// ======================================================

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


// ======================================================
// EXECUTE SWAP
// ======================================================

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

            id: Date.now(),

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
      () => {

        loadPortfolio();
        updatePayBalance();

      },
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


// ======================================================
// INITIALIZE
// ======================================================

updateTokenDisplay();

updatePortfolioWallet();

updateConnectionIndicator();

resetPortfolio();

console.log(
  "TwinSwap loaded successfully."
);
