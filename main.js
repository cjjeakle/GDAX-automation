/**
 * Parameters
 */
const isProd = true;
const actuallyBuy = false; 

const symbolsToBuy = [ 'BTC', 'ETH', 'LTC', 'BCH' ];
const amountToSpendUsd = 20;

const placeLimitOrderToAvoidFees = true;

/**
 * Settings
 */
const secrets = require('./secrets');
const key = secrets.gdax_api_key || process.env.gdax_api_key;
const secret = secrets.gdax_api_secret || process.env.gdax_api_secret;
const password = secrets.gdax_api_password || process.env.gdax_api_password;
const apiURI = isProd ? 'https://api.gdax.com' : 'https://api-public.sandbox.gdax.com';

/**
 * Libraries
 */
const fetch = require('node-fetch');
const gdax = require('gdax');
const client = new gdax.AuthenticatedClient(key, secret, password, apiURI);

/**
 * Setup
 */
let marketCapDataReady = fetch('https://api.coinmarketcap.com/v1/ticker/?limit=20').then(response => {
    return response.json();
}).then(marketCapData => {
    let relevantMarketCapData = marketCapData.filter(marketCapDatum => { 
        return symbolsToBuy.includes(marketCapDatum.symbol); 
    });
    return relevantMarketCapData;
});

let relativePurchaseWeights;
let relativePurchaseWeightsReady = marketCapDataReady.then(marketCapData => {
    let totalMarketCap = marketCapData
        .map(marketCapDatum => Number.parseFloat(marketCapDatum.market_cap_usd))
        .reduce((total, marketCap) => total + marketCap);
    relativePurchaseWeights = marketCapData.map(marketCapDatum => {
        return { 
            symbol: marketCapDatum.symbol,
            relativeWeight: Number.parseFloat(marketCapDatum.market_cap_usd) / totalMarketCap
        };
    });
});

loadingFinished = Promise.all([relativePurchaseWeightsReady]);

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

    if (actuallyBuy)
    {
        client.buy(orderParams).then(orderResult => {
            console.log(productId);
            console.log(orderResult);
        });
    }
}

function placeOrderAtCurrentBid(productId, amountUsd) {
    client.getProductOrderBook(
        { level: 1 },
        productId
    ).then(orderBook => {
        let targetBid = orderBook.bids[0 /* first bid */][0 /* price */];
        let targetBuyQty = (amountUsd / targetBid).toFixed(8);
        const orderParams = {
          type: 'limit',
          time_in_force: 'GTC',
          side: 'buy',
          price: targetBid,
          size: targetBuyQty,
          product_id: productId
        };

        console.log(orderParams);
        console.log(orderParams.size);
        console.log(orderParams.size * orderParams.price);

        if (actuallyBuy)
        {
            client.buy(orderParams).then(orderResult => {
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
    relativePurchaseWeights.forEach(purchaseWeight => {
        let productId = purchaseWeight.symbol + '-USD';
        let amountUsd = purchaseWeight.relativeWeight * amountToSpendUsd;
        if (placeLimitOrderToAvoidFees) {
            placeOrderAtCurrentBid(productId, amountUsd);
        } else {
            buyAtMarketPrice(productId, amountUsd);
        }
    });
}).catch(error => {
    console.log('Error caught. The error was: ');
    console.log(error);
});
