// ==========================================
// TWIN SWAP — WEB3 WALLET VERSION
// ==========================================


// ================================
// ELEMENTS
// ================================

const payAmount = document.getElementById("payAmount");
const receiveAmount = document.getElementById("receiveAmount");

const payTokenButton = document.getElementById("payTokenButton");
const receiveTokenButton = document.getElementById("receiveTokenButton");

const payTokenMenu = document.getElementById("payTokenMenu");
const receiveTokenMenu = document.getElementById("receiveTokenMenu");

const payTokenName = document.getElementById("payTokenName");
const receiveTokenName = document.getElementById("receiveTokenName");

const payTokenIcon = document.getElementById("payTokenIcon");
const receiveTokenIcon = document.getElementById("receiveTokenIcon");

const switchTokens = document.getElementById("switchTokens");

const swapButton = document.getElementById("swapButton");

const exchangeRate = document.getElementById("exchangeRate");
const marketStatus = document.getElementById("marketStatus");

const connectWallet = document.getElementById("connectWallet");
const walletStatus = document.getElementById("walletStatus");

const balanceElement = document.getElementById("balance");


// ================================
// TOKEN STATE
// ================================

let payToken = "USDC";
let receiveToken = "SOL";


// ================================
// PRICES
// ================================

let prices = {
    USDC: 1,
    USDT: 1,
    SOL: null,
    ETH: null
};


// ================================
// TOKEN ICONS
// ================================

const icons = {
    USDC: "💵",
    USDT: "💵",
    SOL: "◎",
    ETH: "Ξ"
};


// ================================
// TOKEN DROPDOWNS
// ================================

payTokenButton.addEventListener("click", function(event) {

    event.stopPropagation();

    payTokenMenu.classList.toggle("open");

    receiveTokenMenu.classList.remove("open");
});


receiveTokenButton.addEventListener("click", function(event) {

    event.stopPropagation();

    receiveTokenMenu.classList.toggle("open");

    payTokenMenu.classList.remove("open");
});


// ================================
// PAY TOKEN SELECTION
// ================================

payTokenMenu.querySelectorAll("button").forEach(button => {

    button.addEventListener("click", function() {

        payToken = this.dataset.token;

        updateTokenDisplay();

        payTokenMenu.classList.remove("open");

        calculateSwap();
    });

});


// ================================
// RECEIVE TOKEN SELECTION
// ================================

receiveTokenMenu.querySelectorAll("button").forEach(button => {

    button.addEventListener("click", function() {

        receiveToken = this.dataset.token;

        updateTokenDisplay();

        receiveTokenMenu.classList.remove("open");

        calculateSwap();
    });

});


// ================================
// CLOSE DROPDOWNS
// ================================

document.addEventListener("click", function() {

    payTokenMenu.classList.remove("open");

    receiveTokenMenu.classList.remove("open");

});


// ================================
// UPDATE TOKEN DISPLAY
// ================================

function updateTokenDisplay() {

    payTokenName.textContent = payToken;

    receiveTokenName.textContent = receiveToken;

    payTokenIcon.textContent = icons[payToken];

    receiveTokenIcon.textContent = icons[receiveToken];
}


// ================================
// GET LIVE PRICES
// ================================

async function getLivePrices() {

    marketStatus.textContent = "Updating...";

    try {

        const response = await fetch(
            "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22SOLUSDT%22,%22ETHUSDT%22%5D"
        );

        if (!response.ok) {
            throw new Error("Price request failed");
        }

        const data = await response.json();


        const solData = data.find(
            coin => coin.symbol === "SOLUSDT"
        );


        const ethData = data.find(
            coin => coin.symbol === "ETHUSDT"
        );


        if (solData) {
            prices.SOL = Number(solData.price);
        }


        if (ethData) {
            prices.ETH = Number(ethData.price);
        }


        marketStatus.textContent = "Live";

        calculateSwap();

    }

    catch (error) {

        console.error(error);

        marketStatus.textContent = "Offline";

        exchangeRate.textContent = "Price unavailable";
    }
}


// ================================
// CALCULATE SWAP
// ================================

function calculateSwap() {

    const amount = Number(payAmount.value);

    const fromPrice = prices[payToken];

    const toPrice = prices[receiveToken];


    if (
        payAmount.value === "" ||
        amount <= 0
    ) {

        receiveAmount.value = "";

        exchangeRate.textContent = "Enter amount";

        swapButton.textContent = "Enter amount";

        return;
    }


    if (
        fromPrice === null ||
        toPrice === null
    ) {

        receiveAmount.value = "";

        exchangeRate.textContent =
            "Waiting for live price...";

        return;
    }


    const usdValue = amount * fromPrice;

    const result = usdValue / toPrice;


    receiveAmount.value = formatNumber(result);


    const oneTokenRate =
        fromPrice / toPrice;


    exchangeRate.textContent =
        `1 ${payToken} ≈ ${formatNumber(oneTokenRate)} ${receiveToken}`;


    swapButton.textContent =
        `Swap ${payToken} → ${receiveToken}`;
}


// ================================
// NUMBER FORMAT
// ================================

function formatNumber(number) {

    return number.toLocaleString(
        undefined,
        {
            maximumFractionDigits: 8
        }
    );
}


// ================================
// AMOUNT INPUT
// ================================

payAmount.addEventListener(
    "input",
    calculateSwap
);


// ================================
// SWITCH TOKENS
// ================================

switchTokens.addEventListener(
    "click",
    function() {

        const oldPay = payToken;

        payToken = receiveToken;

        receiveToken = oldPay;

        updateTokenDisplay();

        calculateSwap();
    }
);


// ================================
// SWAP BUTTON
// ================================

swapButton.addEventListener(
    "click",
    function() {

        const amount = Number(payAmount.value);

        if (!amount || amount <= 0) {

            alert("Enter an amount first.");

            return;
        }


        alert(
            `${amount} ${payToken} → ` +
            `${receiveAmount.value} ${receiveToken}\n\n` +
            `This is currently a price preview.`
        );
    }
);


// ==========================================
// SOLANA WALLET CONNECTION
// ==========================================

connectWallet.addEventListener(
    "click",
    connectSolanaWallet
);


async function connectSolanaWallet() {

    // Check for Phantom/Solana wallet

    if (
        !window.solana ||
        !window.solana.isPhantom
    ) {

        alert(
            "No Phantom wallet detected. " +
            "Install Phantom or open TwinSwap inside Phantom's browser."
        );

        return;
    }


    try {

        // Ask wallet to connect

        const response =
            await window.solana.connect();


        // Get public address

        const publicKey =
            response.publicKey.toString();


        console.log(
            "Connected wallet:",
            publicKey
        );


        // Shorten address for display

        const shortAddress =
            publicKey.slice(0, 6) +
            "..." +
            publicKey.slice(-4);


        walletStatus.textContent =
            shortAddress;


        connectWallet.textContent =
            "Connected";


        // Get SOL balance

        await getSolBalance(publicKey);

    }

    catch (error) {

        console.error(
            "Wallet connection failed:",
            error
        );

        alert(
            "Wallet connection was cancelled or failed."
        );
    }
}


// ==========================================
// GET REAL SOL BALANCE
// ==========================================

async function getSolBalance(publicKey) {

    try {

        const response = await fetch(
            "https://api.mainnet-beta.solana.com",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    jsonrpc: "2.0",

                    id: 1,

                    method: "getBalance",

                    params: [
                        publicKey
                    ]

                })
            }
        );


        const data =
            await response.json();


        if (
            data.result &&
            data.result.value !== undefined
        ) {

            // Lamports → SOL

            const lamports =
                data.result.value;


            const sol =
                lamports / 1000000000;


            balanceElement.textContent =
                sol.toFixed(4);

            console.log(
                "Real SOL balance:",
                sol
            );

        }

        else {

            balanceElement.textContent =
                "0.00";
        }

    }

    catch (error) {

        console.error(
            "Could not read SOL balance:",
            error
        );

        balanceElement.textContent =
            "0.00";
    }
}


// ==========================================
// AUTO-DETECT ALREADY CONNECTED WALLET
// ==========================================

async function checkExistingWallet() {

    if (
        window.solana &&
        window.solana.isPhantom
    ) {

        try {

            const response =
                await window.solana.connect({
                    onlyIfTrusted: true
                });


            if (response.publicKey) {

                const publicKey =
                    response.publicKey.toString();


                walletStatus.textContent =
                    publicKey.slice(0, 6) +
                    "..." +
                    publicKey.slice(-4);


                connectWallet.textContent =
                    "Connected";


                await getSolBalance(
                    publicKey
                );
            }

        }

        catch (error) {

            // No previously approved connection.
            console.log(
                "No existing wallet connection."
            );
        }
    }
}


// ==========================================
// WALLET DISCONNECTED
// ==========================================

if (window.solana) {

    window.solana.on(
        "disconnect",
        function() {

            walletStatus.textContent =
                "Not connected";

            connectWallet.textContent =
                "Connect Wallet";

            balanceElement.textContent =
                "0.00";
        }
    );
}


// ==========================================
// START TWIN SWAP
// ==========================================

updateTokenDisplay();

getLivePrices();

checkExistingWallet();


// Update prices every 15 seconds

setInterval(
    getLivePrices,
    15000
);