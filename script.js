// ========================================
// TWINSWAP
// LIVE SOLANA JUPITER QUOTE SYSTEM
// ========================================


// ----------------------------------------
// TOKEN DATA
// ----------------------------------------

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


// ----------------------------------------
// JUPITER QUOTE API
// ----------------------------------------

const JUPITER_QUOTE_URL =
  "https://lite-api.jup.ag/swap/v1/quote";


// ----------------------------------------
// STATE
// ----------------------------------------

let payToken = "USDC";
let receiveToken = "SOL";

let walletAddress = null;

let quoteTimer = null;
let refreshTimer = null;

let quoteRequestNumber = 0;

let latestQuote = null;


// ----------------------------------------
// ELEMENTS
// ----------------------------------------

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


// ----------------------------------------
// TOKEN DISPLAY
// ----------------------------------------

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


// ----------------------------------------
// CLOSE DROPDOWNS
// ----------------------------------------

function closeMenus() {

  payTokenMenu.classList.remove("show");

  receiveTokenMenu.classList.remove("show");

}


// ----------------------------------------
// PAY TOKEN DROPDOWN
// ----------------------------------------

payTokenButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    receiveTokenMenu.classList.remove(
      "show"
    );

    payTokenMenu.classList.toggle(
      "show"
    );

  }
);


// ----------------------------------------
// RECEIVE TOKEN DROPDOWN
// ----------------------------------------

receiveTokenButton.addEventListener(
  "click",
  function(event) {

    event.stopPropagation();

    payTokenMenu.classList.remove(
      "show"
    );

    receiveTokenMenu.classList.toggle(
      "show"
    );

  }
);


// ----------------------------------------
// CLOSE WHEN CLICKING OUTSIDE
// ----------------------------------------

document.addEventListener(
  "click",
  function() {

    closeMenus();

  }
);


// ----------------------------------------
// PAY TOKEN SELECTION
// ----------------------------------------

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


        // Prevent same token pair
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


// ----------------------------------------
// RECEIVE TOKEN SELECTION
// ----------------------------------------

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


        // Prevent same token pair
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


// ----------------------------------------
// SWITCH TOKENS
// ----------------------------------------

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


// ----------------------------------------
// NUMBER FORMAT
// ----------------------------------------

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
    number < 0.000001
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


// ----------------------------------------
// BASE UNIT CONVERSION
// ----------------------------------------

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


// ----------------------------------------
// REQUEST QUOTE
// ----------------------------------------

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


// ----------------------------------------
// LIVE JUPITER QUOTE
// ----------------------------------------

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


  // ------------------------------------
  // EMPTY AMOUNT
  // ------------------------------------

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


  // ------------------------------------
  // SAME TOKEN
  // ------------------------------------

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


  // ------------------------------------
  // TOKEN CHECK
  // ------------------------------------

  if (
    !input ||
    !output
  ) {

    return;

  }


  // ------------------------------------
  // CONVERT AMOUNT
  // ------------------------------------

  const rawAmount =
    toBaseUnits(
      amount,
      input.decimals
    );


  if (!rawAmount) {

    return;

  }


  // ------------------------------------
  // LOADING STATE
  // ------------------------------------

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


  // ------------------------------------
  // BUILD JUPITER REQUEST
  // ------------------------------------

  try {

    const url =
      new URL(
        JUPITER_QUOTE_URL
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


    console.log(
      "TwinSwap quote:",
      url.toString()
    );


    // --------------------------------
    // FETCH
    // --------------------------------

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


    console.log(
      "Jupiter response:",
      data
    );


    // --------------------------------
    // IGNORE OLD REQUEST
    // --------------------------------

    if (
      requestId !==
      quoteRequestNumber
    ) {

      return;

    }


    // --------------------------------
    // API ERROR
    // --------------------------------

    if (!response.ok) {

      throw new Error(
        data?.error ||
        data?.message ||
        `Jupiter error ${response.status}`
      );

    }


    // --------------------------------
    // NO ROUTE
    // --------------------------------

    if (
      !data ||
      !data.outAmount
    ) {

      throw new Error(
        "No swap route found"
      );

    }


    // --------------------------------
    // OUTPUT AMOUNT
    // --------------------------------

    const outputAmount =
      Number(
        data.outAmount
      ) /
      Math.pow(
        10,
        output.decimals
      );


    if (
      !Number.isFinite(
        outputAmount
      )
    ) {

      throw new Error(
        "Invalid quote amount"
      );

    }


    // --------------------------------
    // EXCHANGE RATE
    // --------------------------------

    const rate =
      outputAmount /
      amount;


    // --------------------------------
    // SAVE QUOTE
    // --------------------------------

    latestQuote =
      data;


    // --------------------------------
    // DISPLAY RESULT
    // --------------------------------

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
      "TwinSwap quote error:",
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


// ----------------------------------------
// AMOUNT INPUT
// ----------------------------------------

payAmount.addEventListener(
  "input",
  requestQuote
);


// ----------------------------------------
// AUTO REFRESH LIVE RATE
// ----------------------------------------

function startQuoteRefresh() {

  clearInterval(
    refreshTimer
  );


  refreshTimer =
    setInterval(
      function() {

        if (
          payAmount.value &&
          Number(payAmount.value) > 0
        ) {

          requestQuote();

        }

      },
      10000
    );

}


startQuoteRefresh();


// ----------------------------------------
// PHANTOM PROVIDER
// ----------------------------------------

function getPhantomProvider() {

  if (
    window.solana &&
    window.solana.isPhantom
  ) {

    return window.solana;

  }


  return null;

}


// ----------------------------------------
// CONNECT PHANTOM
// ----------------------------------------

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


// ----------------------------------------
// PHANTOM DISCONNECT
// ----------------------------------------

if (window.solana) {

  window.solana.on(
    "disconnect",
    function() {

      walletAddress =
        null;


      walletStatus.textContent =
        "Not connected";


      connectWallet.textContent =
        "Connect Wallet";

    }
  );

}


// ----------------------------------------
// SWAP BUTTON
// ----------------------------------------

swapButton.addEventListener(
  "click",
  function() {

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


    alert(
      "Live quote confirmed. Transaction execution will be added in the next phase."
    );

  }
);


// ----------------------------------------
// INITIALIZE
// ----------------------------------------

updateTokenDisplay();


console.log(
  "TwinSwap loaded successfully."
);
