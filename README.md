# GDAX-automation
Code to automate typical calculations and orders I use on GDAX.

The script is useful for doing a market cap weighted buys, and can be scheduled if you want to automate a dollar cost averaging strategy.

To get started:
* Define a `secrets.js` file.
* * Alternatively, define `gdax_api_key`, `gdax_api_secret`, and `gdax_api_password` as environment variables.
* In `main.js` set these variables:
* * `isProd`: Whether to connect to GDAX prod or to the GDAX sandbox.
* * Note that API credentials are not shared between prod and the sandbox.
* * `actuallyBuy`: Whether to execute the buy operations, or just display the intended inputs.
* * `symbolsToBuy`: What symbols to buy on GDAX, defaults to BTC, ETH, BCH, and LTC.
* * * Buys will split the amount to spend between these, weighted by market cap.
* * `amountToSpendUsd`: The amount to buy in each coin (BTC, ETH, and LTC buy 100% of this amount, and BCH buys 25%).
* * `placeLimitOrderToAvoidFees`: If true, a limit order will be placed at the current best bid price in the order book. If false, market order will be placed.
* * * This avoids the GDAX fees for being the market taker, but risks order rejection (if the calculated buy amount is too small) or not being executed.
