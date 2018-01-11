/**
 * Configuration
 */
const config = require('./config');
const useProd = config.useProd;
const actuallyExecuteTrades = config.actuallyExecuteTrades; 
const symbolsToTrade = config.symbolsToTrade;
const transactionAmountUsd = config.transactionAmountUsd;
const placeLimitOrdersToAvoidFees = config.placeLimitOrdersToAvoidFees;
const roundUpToMinimumOrderSizeForLimitOrders = config.roundUpToMinimumOrderSizeForLimitOrders;
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

let relativePurchaseWeights = Object.create(null);
let relativePurchaseWeightsReady = marketCapDataReady.then(marketCapData => {
    let totalMarketCap = marketCapData
        .map(marketCapDatum => Number.parseFloat(marketCapDatum.market_cap_usd))
        .reduce((total, marketCap) => total + marketCap);
    marketCapData.forEach(marketCapDatum => {
        relativePurchaseWeights[marketCapDatum.symbol] = 
        	Number.parseFloat(marketCapDatum.market_cap_usd) / totalMarketCap;
    });
});

let minimumOrderQtys = Object.create(null);
let productMetadataReady = gdaxClient.getProducts().then(products => {
	products.filter(product => {
		return symbolsToTrade.includes(product.base_currency) && product.quote_currency === quoteCurrency;
	}).forEach(product => {
		minimumOrderQtys[product.base_currency] = product.base_min_size;
	});
});

loadingFinished = Promise.all([relativePurchaseWeightsReady, productMetadataReady]);

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
        gdaxClient.buy(orderParams).then(orderResult => {
            console.log(productId);
            console.log(orderResult);
        });
    }
}

function placeOrderAtCurrentBid(productId, amountUsd, minimumOrderQty) {
    gdaxClient.getProductOrderBook(
        { level: 1 },
        productId
    ).then(orderBook => {
        let targetBid = orderBook.bids[0 /* first bid */][0 /* price */];
        let targetBuyQty = (amountUsd / targetBid).toFixed(8);

        if (roundUpToMinimumOrderSizeForLimitOrders) {
        	targetBuyQty = Math.max(targetBuyQty, minimumOrderQty);
        }

        const orderParams = {
          type: 'limit',
          time_in_force: 'GTC',
          side: 'buy',
          price: targetBid,
          size: targetBuyQty,
          product_id: productId
        };

        console.log(orderParams);
        console.log(minimumOrderQty);
        console.log(orderParams.size);
        console.log(orderParams.size * orderParams.price);

        if (actuallyExecuteTrades)
        {
            gdaxClient.buy(orderParams).then(orderResult => {
                console.log(productId);
                console.log(orderResult);
            });
        }
    });
}

/**
 * Make the desired order.
 */
loadingFinished.then(() => {
    symbolsToTrade.forEach(symbol => {
        let productId = symbol + '-' + quoteCurrency;
        let amountUsd = (relativePurchaseWeights[symbol] * transactionAmountUsd).toFixed(2);
        let minimumOrderQty = minimumOrderQtys[symbol];
        if (placeLimitOrdersToAvoidFees) {
            placeOrderAtCurrentBid(productId, amountUsd, minimumOrderQty);
        } else {
            buyAtMarketPrice(productId, amountUsd);
        }
    });
}).catch(error => {
    console.log('Error caught. The error was: ');
    console.log(error);
});
