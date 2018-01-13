/**
 * Configuration
 */
const config = require('./config');
const useProd = config.useProd;
const actuallyExecuteTrades = config.actuallyExecuteTrades; 
const symbolsToTrade = config.symbolsToTrade;
const transactionAmountUsd = config.transactionAmountUsd;
const placeLimitOrdersToAvoidFees = config.placeLimitOrdersToAvoidFees;
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

let minimumOrderQtys = Object.create(null);
let productMetadataReady = gdaxClient.getProducts().then(products => {
    products.filter(product => {
        return symbolsToTrade.includes(product.base_currency) && product.quote_currency === quoteCurrency;
    }).forEach(product => {
        minimumOrderQtys[product.base_currency] = Number.parseFloat(product.base_min_size);
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
    productMetadataReady,
    currentPricesReady,
    accountBalancesReady
]);

/**
 * Order logic
 */
function buyAtMarketPrice(productId, amountUsd) {
    const orderParams = {
      type: 'market',
      funds: amountUsd,
      product_id: productId
    };

    console.log(orderParams);

    if (actuallyExecuteTrades)
    {
        return gdaxClient.buy(orderParams).then(orderResult => {
            console.log(productId);
            console.log(orderResult);
        });
    } else {
        return Promise.resolve();
    }
}

function placeOrderAtCurrentPrice(productId, amountUsd, minimumOrderQty) {
    gdaxClient.productID = productId;
    return gdaxClient.getProductTicker().then(ticker => {
        let currentPrice = ticker.price;
        let targetBuyQty = (amountUsd / currentPrice).toFixed(8);

        const orderParams = {
          type: 'limit',
          time_in_force: 'GTC',
          side: 'buy',
          price: currentPrice,
          size: targetBuyQty,
          product_id: productId
        };

        console.log(orderParams);
        console.log(minimumOrderQty);
        console.log(orderParams.size);
        console.log(orderParams.size * orderParams.price);

        if (actuallyExecuteTrades && targetBuyQty > minimumOrderQty)
        {
            return gdaxClient.buy(orderParams).then(orderResult => {
                console.log(productId);
                console.log(orderResult);
            });
        } else {
            return Promise.resolve();
        }
    });
}

/**
 * Make the desired order(s).
 */
loadingFinished.then(() => {
    console.log(relativeMarketCaps);
    console.log(accountBalances);

    // Gets the amount each GDAX product is off from its target (of it's relative market cap value)
    // Then allots the buy amount among the underweight assets, weighted by how far off from target each is.
    let totalUnderweightAmount = 0;
    let amountsUnderweight = Object.create(null);
    symbolsToTrade.forEach(symbol => {
        let targetPortion = totalInvestedValue * relativeMarketCaps[symbol];
        let currentPortion = accountBalances[symbol].value;
        let underweightAmount = Math.max((targetPortion - currentPortion), 0);
        amountsUnderweight[symbol] = underweightAmount;
        totalUnderweightAmount += underweightAmount;
    });

    let usdAmountsToBuy = Object.create(null);
    symbolsToTrade.forEach(symbol => {
        let percentageOfUnderweightAllocation = amountsUnderweight[symbol] / totalUnderweightAmount;
        usdAmountsToBuy[symbol] = (percentageOfUnderweightAllocation * transactionAmountUsd).toFixed(2);
    });

    console.log(usdAmountsToBuy);

    return Promise.all(
        symbolsToTrade.map(symbol => {
            let productId = convertSymbolToGdaxProductId(symbol);
            let amountUsd = usdAmountsToBuy[symbol];
            let minimumOrderQty = minimumOrderQtys[symbol];
            if (placeLimitOrdersToAvoidFees) {
                return placeOrderAtCurrentPrice(productId, amountUsd, minimumOrderQty);
            } else {
                return buyAtMarketPrice(productId, amountUsd);
            }
        })
    );
}).catch(error => {
    console.log('Error caught. The error was: ');
    console.log(error);
});
