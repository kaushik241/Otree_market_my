import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';

/*
    this component contains displays of the player's cash and asset allocations, and has inputs
    which allow the player to enter orders. when an order is entered, 
    this component emits an 'order-entered' event.
*/

class OrderEnterWidget extends PolymerElement {

    static get properties() {
        return {
            cash: Number,
            settledAssets: Number,
            availableAssets: Number,
        };
    }

    static get template() {
        return html`
            <style>
                #container {
                    height: 100%;
                    display: grid;
                    grid-template-columns: 5.4fr 2fr 2fr;
                    justify-content: center;
                }
                #container > div {
                    margin: 5px;
                    padding: 5px;
                    border: 1px solid black;
                }
                #container h4 {
                    margin: 0.2em;
                }
                #order-input {
                    text-align: center;
                }
                #allocation > div:first-child {
                    text-align: center;
                }

                #allocation{
                    display:flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                    justify-items: center;
                }

                #market-order-input{
                    position: relative;
                    display: flex;
                    flex-direction: column;
                }


                
            </style>

            <div id="container">
                <div id="allocation">
                    <div>
                        <h4>Your Allocation</h4>
                    </div>
                    <div>Available Cash: $[[availableCash]]</div>
                    <div>Settled Cash: $[[settledCash]]</div>
                    <div>Available Assets: [[availableAssets]]</div>
                    <div>Settled Assets: [[settledAssets]]</div>
                </div>
                <div id="order-input">
                    <h4>Submit an Order</h4>
                    <label for="price_input">Price</label>
                    <input id="price_input" type="number" min="0">
                    <label for="volume_input">Volume</label>
                    <input id="volume_input" type="number" min="1">
                    <div>
                        <button type="button" on-click="_enter_order" value="bid">Enter Bid</button>
                        <button type="button" on-click="_enter_order" value="ask">Enter Ask</button>
                    </div>
                </div>
                <!-- Changed by Kaushik -->
                <!-- Have created the code given below to create input and dialogue box to submit market order so yeah and this on-click funcitonality is defined below -->
                <div id="market-order-input">
                    <center>
                    <h4>Submit a Market Order</h4>
                    <div style="position: absolute; bottom: 5px;">
                        <label for="volume_market_order_input">Volume</label>
                        <input id="volume_market_order_input" type="number" min="1">
                        <div>
                            <button type="button" on-click="_enter_market_order" value="bid">Enter Bid</button>
                            <button type="button" on-click="_enter_market_order" value="ask">Enter Ask</button>
                        </div>
                    </div>
                    </center>
                </div>
            </div>
        `;
    }

    _enter_order(event) {
        const price = parseInt(this.$.price_input.value);
        const volume = parseInt(this.$.volume_input.value);
        const is_bid = (event.target.value == "bid");
        const order = {
            price: price,
            volume: volume,
            is_bid: is_bid,
        }
        this.dispatchEvent(new CustomEvent('order-entered', {detail: order}));
    }
    // Changed by Kaushik
    // Have created following function which will be the starting point to make market order and after several steps and changes changes will be able to reach at backend
    _enter_market_order(event) {
        // const price = parseInt(this.$.price_input.value);
        const volume = parseInt(this.$.volume_market_order_input.value);
        const is_bid = (event.target.value == "bid");
        const order = {
            // price: price,
            volume: volume,
            is_bid: is_bid,
        }
        this.dispatchEvent(new CustomEvent('market-order-entered', {detail: order}));
    }

}

window.customElements.define('order-enter-widget', OrderEnterWidget);
