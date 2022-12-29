import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/src/redwood-channel/redwood-channel.js';
import '/static/otree-redwood/src/otree-constants/otree-constants.js';

import '/static/otree_markets/trader_state.js'
import '/static/otree_markets/order_list.js';
import '/static/otree_markets/trade_list.js';
import '/static/otree_markets/simple_modal.js';
import '/static/otree_markets/event_log.js';

import './order_enter_widget.js';

/*
    this component is a single-asset market, implemented using otree_markets' trader_state component and some of
    otree_markets' reusable UI widgets.
*/

class SingleAssetTextInterface extends PolymerElement {

    static get properties() {
        return {
            bids: Array,
            asks: Array,
            trades: Array,
            settledAssets: Number,
            availableAssets: Number,
            settledCash: Number,
            availableCash: Number,
        };
    }

    static get template() {
        return html`
            <!-- This is CSS of the whole Page -->
            <head>
            <style>
            #main-container{
                display: grid;
                grid-template-columns: 57fr 43fr;
                height: 100%;
                width:100%;
            }
        
            #graph-container{
                height:100%;
            }
        
            #details-container{
                height:100%;
                display: flex;                
                flex-direction: column;
                padding: 10px;
            }
        
            #info-container{
                border: 1px solid black;
                width: calc(100%-5px);
                padding: 10px;
                margin-bottom: 5px;
            }

            .flex-fill{
                width:100%;
                overflow-y:hidden;
            }

            #allocation-container{
                width: 100%;
            }

            .order-class{
                overflow-y:scroll;
            }

            #ask-bid{
                padding-right:10px;
                display: grid;
                grid-template-columns: 1fr 1fr;
                column-gap: 10px;
                width: calc(100%);
                height:30vh;
                overflow: hidden;
            }
            #ask, #bid{
                display:flex;
                flex-direction:column;
                align-items: center;
                width:100%;
                height:99%;
                border: 1px solid black;
                overflow-y: hidden;
                overflow-x: hidden;
            }
            #bid{
                width:100%;
            }
            #submit{
                display: grid;
                grid-template-columns: 1fr 1fr;
                column-gap: 10px;
                width: 100%;
            }
            #additional{
                width: 100%;
            }

            #alloc-container{
                display: flex;
                flex-direction: column;
            }
            </style>
            </head>
            
            <!-- These are the readymade components which we are using from oTree redwood or simple oTree -->

            <simple-modal
                id="modal"
            ></simple-modal>
            <otree-constants
                id="constants"
            ></otree-constants>
            <trader-state
                id="trader_state"
                bids="{{bids}}"
                asks="{{asks}}"
                trades="{{trades}}"
                settled-assets="{{settledAssets}}"
                available-assets="{{availableAssets}}"
                settled-cash="{{settledCash}}"
                available-cash="{{availableCash}}"
                on-confirm-trade="_confirm_trade"
                on-confirm-cancel="_confirm_cancel"
                on-error="_handle_error"
            ></trader-state>


            <!--Changed by Kaushik-->

        <div id="main-container">
            <div id="graph-container">
    
            </div>
    
            <div id="details-container">
                <div id="info-container">
                    <div class="card-header">
                        Information Box
                    </div>
                    <div class="card-body">
                        <p class="card-text">Possible payouts and other information</p>
                    </div>
                </div>
                <div id="ask-bid">
                    <div id="bid">
                        <h3>Bids</h3>
                        <order-list
                            class="flex-fill"
                            orders="[[bids]]"
                            on-order-canceled="_order_canceled"
                            on-order-accepted="_order_accepted"
                        ></order-list>
                    </div>
                    <div id="ask">
                        <h3>Asks</h3>
                        <order-list
                            class="flex-fill"
                            orders="[[asks]]"
                            on-order-canceled="_order_canceled"
                            on-order-accepted="_order_accepted"
                        ></order-list>
                    </div>
                </div>
            </div>
        </div>

                <div>
                <!-- Have added on-market-order-entered value as a function _market_order_entered which is defined below -->
                <!-- Changed by Kaushik -->
                    <order-enter-widget
                        class="flex-fill"
                        settled-assets="{{settledAssets}}"
                        available-assets="{{availableAssets}}"
                        settled-cash="{{settledCash}}"
                        available-cash="{{availableCash}}"
                        on-order-entered="_order_entered"
                        on-market-order-entered="_market_order_entered"
                    ></order-enter-widget>
                </div>
                
            </div>
            <!--
            <div class="container" id="log-container">
                <div>
                    <event-log
                        class="flex-fill"
                        id="log"
                        max-entries=100
                    ></event-log>
                </div>
            </div>
            -->
        `;
    }

    ready() {
        super.ready();
        this.pcode = this.$.constants.participantCode;
    }

    // triggered when this player enters an order
    _order_entered(event) {
        const order = event.detail;
        // I think I haven't changed anything here but anyways let it be.
        // Changed by Kaushik
        if (isNaN(order.price) || isNaN(order.volume)) {
            this.$.log.error('Invalid order entered');
            return;
        }
        this.$.trader_state.enter_order(order.price, order.volume, order.is_bid);
    }
    // Have created a function called _market_order_entered which will be responsible to connect with trader_state.js file and this will be at the end
    // responsible to talk with backend
    // Changed by Kaushik
    _market_order_entered(event) {
        const order = event.detail;
        if (isNaN(order.volume)) {
            this.$.log.error('Invalid order entered');
            return;
        }
        this.$.trader_state.enter_market_order(order.volume, order.is_bid);
    }

    // triggered when this player cancels an order
    _order_canceled(event) {
        const order = event.detail;

        this.$.modal.modal_text = 'Are you sure you want to remove this order?';
        this.$.modal.on_close_callback = (accepted) => {
            if (!accepted)
                return;

            this.$.trader_state.cancel_order(order);
        };
        this.$.modal.show();
    }

    // triggered when this player accepts someone else's order
    _order_accepted(event) {
        const order = event.detail;
        if (order.pcode == this.pcode)
            return;

        this.$.modal.modal_text = `Do you want to ${order.is_bid ? 'buy' : 'sell'} for $${order.price}?`
        this.$.modal.on_close_callback = (accepted) => {
            if (!accepted)
                return;

            this.$.trader_state.accept_order(order);
        };
        this.$.modal.show();
    }

    // react to the backend confirming that a trade occurred
    _confirm_trade(event) {
        const trade = event.detail;
        const all_orders = trade.making_orders.concat([trade.taking_order]);
        for (let order of all_orders) {
            if (order.pcode == this.pcode)
                this.$.log.info(`You ${order.is_bid ? 'bought' : 'sold'} ${order.traded_volume} ${order.traded_volume == 1 ? 'unit' : 'units'}`);
        }
    }

    // react to the backend confirming that an order was canceled
    _confirm_cancel(event) {
        const order = event.detail;
        if (order.pcode == this.pcode) {
            this.$.log.info(`You canceled your ${msg.is_bid ? 'bid' : 'ask'}`);
        }
    }

    // handle an error sent from the backend
    _handle_error(event) {
        let message = event.detail;
        this.$.log.error(message)
    }
}

window.customElements.define('single-asset-text-interface', SingleAssetTextInterface);
