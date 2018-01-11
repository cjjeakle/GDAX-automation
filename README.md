# GDAX-automation
Code to automate typical calculations and orders I use on GDAX.

The script is useful for doing a market cap weighted buys, and can be scheduled if you want to automate a dollar cost averaging strategy.

## To get started:
* Define a `secrets.js` file.
  * `secrets_example.js` can be used as a template.
  * Alternatively, define `gdax_api_key`, `gdax_api_secret`, and `gdax_api_password` as environment variables.
* Define a `config.js` file.
  * `config_example.js` can be used as a template.
  * `useProd`: Whether to connect to GDAX prod or to the GDAX sandbox.
    * Note that API credentials are not shared between prod and the sandbox.
  * `actuallyExecuteTrades`: Whether to execute the generated trades, or just display debug output.
  * `symbolsToTrade`: What symbols to buy on GDAX.
    * The amount to spend will be split between the selected symbols, weighted by market cap.
  * `transactionAmountUsd`: The total amount of USD to use on each transaction/run.
  * `placeLimitOrdersToAvoidFees`: If true, a limit order will be placed at the current best bid price in the order book. If false, market order will be placed.
    * This aims to avoid the GDAX market taker fee, but risks not being executed.
  * `roundUpToMinimumOrderSizeForLimitOrders`: Rounds generated limit order amounts up to be at least the minimum order amount permitted by GDAX for each product.
    * This avoids orders being rejected for too small an amount being specified.

## Performing a buy
* run `buy.js` in node
  * The configurations above will be used to generate buy orders