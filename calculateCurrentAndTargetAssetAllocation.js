/**
 * Configuration
 */
const config = require('./config');
const useProd = config.useProd;
const symbolsToTrade = config.symbolsToTrade;
const quoteCurrency = 'USD';

/**
 * Settings
 */
const secrets = require('./secrets');
const key = secrets.gdax_api_key || process.env.gdax_api_key;
const secret = secrets.gdax_api_secret || process.env.gdax_api_secret;
const password = secrets.gdax_api_password || process.env.gdax_api_password;
const apiURI = useProd ? 'https://api.gdax.com' : 'https://api-public.sandbox.gdax.com';

/**
 * Libraries
 */
const fetch = require('node-fetch');
const gdax = require('gdax');
const gdaxClient = new gdax.AuthenticatedClient(key, secret, password, apiURI);

/**
 * Utilities
 */
function convertSymbolToGdaxProductId(symbol) {
    return symbol + '-' + quoteCurrency;
}

/**
 * Setup
 */
let marketCapDataReady = fetch('https://api.coinmarketcap.com/v1/ticker/?limit=20').then(response => {
    return response.json();
}).then(marketCapData => {
    let relevantMarketCapData = marketCapData.filter(marketCapDatum => { 
        return symbolsToTrade.includes(marketCapDatum.symbol); 
    });
    return relevantMarketCapData;
});

let relativeMarketCaps = Object.create(null);
let relativeMarketCapsReady = marketCapDataReady.then(marketCapData => {
    let totalMarketCap = marketCapData
        .map(marketCapDatum => Number.parseFloat(marketCapDatum.market_cap_usd))
        .reduce((total, marketCap) => total + marketCap, 0);
    marketCapData.forEach(marketCapDatum => {
        relativeMarketCaps[marketCapDatum.symbol] = 
            Number.parseFloat(marketCapDatum.market_cap_usd) / totalMarketCap;
    });
});

let currentPrices = Object.create(null);
let currentPricesReady = Promise.all( 
    symbolsToTrade.map(symbol => {
        gdaxClient.productID = convertSymbolToGdaxProductId(symbol);
        return gdaxClient
                .getProductTicker()
                .then(ticker => {
                    currentPrices[symbol] = Number.parseFloat(ticker.price);
                });
    })
);

let accountBalances = Object.create(null);
let totalInvestedValue = 0;
let accountBalancesReady = currentPricesReady.then(() => {
    currentPrices[quoteCurrency] = 1; // Pad the prices with a USD sentinel
    return gdaxClient.getAccounts().then(accounts => {
        accounts.forEach(account => {
            accountBalances[account.currency] = {
                balance: Number.parseFloat(account.balance),
                value: Number.parseFloat(account.balance * currentPrices[account.currency])
            };
        });
        totalInvestedValue = symbolsToTrade.reduce(
            (total, symbol) => accountBalances[symbol].value + total,
            0
        );
    });
});

loadingFinished = Promise.all([
    relativeMarketCapsReady,
    currentPricesReady,
    accountBalancesReady
]);


/**
 * Calculate the target asset allocation, print it.
 */
loadingFinished.then(() => {
    console.log(relativeMarketCaps);
    console.log(accountBalances);

    let targetAmounts = Object.create(null);
    let necessaryDeltas = Object.create(null);
    symbolsToTrade.forEach(symbol => {
        let targetAmount = totalInvestedValue * relativeMarketCaps[symbol];
        targetAmounts[symbol] = targetAmount;
        let deltaToReachTarget = Math.max((targetAmount - accountBalances[symbol].value));
        necessaryDeltas[symbol] = deltaToReachTarget;
    });

    console.log(targetAmounts);
    console.log(necessaryDeltas);
});