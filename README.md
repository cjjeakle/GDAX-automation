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
    * Note: API credentials are not shared between prod and the sandbox.
  * `actuallyExecuteTrades`: Whether to execute the generated trades, or just display debug output.
  * `symbolsToTrade`: What symbols to trade on GDAX.
    * The transaction amount will be split between any of the selected symbols that are underweight in your GDAX holdings (relative to the market cap of the selected symbols).
  * `transactionAmountUsd`: The total amount of USD to use on each transaction/run.
  * `placeLimitOrdersToAvoidFees`: If true, a limit order will be placed at the current best bid price for buys or the best ask price for sells. If false, market orders will be used.
    * This aims to avoid the GDAX market taker fee, but risks not being executed.

## Performing a buy
* Requires a GDAX API key with `view` and `trade` permissions 
* run `buy.js` in nodejs
  * The configurations above will be used to generate buy orders
* Can be scheduled using crontab (or any code scheduling tool) to perform buys for a dollar-cost-average strategy

## Print current and target asset allocation
* Requires a GDAX API key with `view` permissions
* run `calculateCurrentAndTargetAssetAllocation.js` in nodejs
  * This will print:
    * The current relative market cap of the selected GDAX products.
    * The current balance of each selected GDAX product.
    * The balance each selected GDAX product would have, if it was allocated value according to its relative market cap.
    * The necessary balance changes to each product (in USD) to reach that target market cap weight.
