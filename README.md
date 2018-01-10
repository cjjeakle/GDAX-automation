# GDAX-automation
Code to automate typical calculations and orders I use on GDAX.

The script is useful for doing a market cap weighted buys, and can be scheduled if you want to automate a dollar cost averaging strategy.

To get started:
* Define a `secrets.js` file.
  * `secrets_example.js` can be used as a template.
  * Alternatively, define `gdax_api_key`, `gdax_api_secret`, and `gdax_api_password` as environment variables.
* Define a `config.js` file.
  * `config_example.js` can be used as a template.
  * `isProd`: Whether to connect to GDAX prod or to the GDAX sandbox.
    * Note that API credentials are not shared between prod and the sandbox.
  * `actuallyBuy`: Whether to execute the buy operations, or just display the intended inputs.
  * `symbolsToBuy`: What symbols to buy on GDAX.
    * The amount to spend will be split between the selected symbols, weighted by market cap.
  * `amountToSpendUsd`: The total amount of USD to spend on this buy.
  * `placeLimitOrdersToAvoidFees`: If true, a limit order will be placed at the current best bid price in the order book. If false, market order will be placed.
    * This aims to avoid the GDAX market taker fee, but risks order rejection (if the calculated buy amount is too small) or not being executed.
