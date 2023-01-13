import { PolymerElement, html } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/src/redwood-channel/redwood-channel.js';
import '/static/otree-redwood/src/otree-constants/otree-constants.js';

export class TraderState extends PolymerElement {

    /*
        this webcomponent is responsible for communicating with the backend and maintaining a single player's
        current state. it has methods which allow the player to enter, remove and accept orders. it also emits events
        on confirmations of market state changes, as well as when errors occur.
    */

    static get properties() {
        console.log(TRADER_STATE)
        return {
            // array of bid order objects
            // ordered by price descending, then timestamp
            bids: {
                type: Array,
                value: TRADER_STATE.bids,
                notify: true,
            },
            // array of ask order objects
            // ordered by price ascending, then timestamp
            asks: {
                type: Array,
                value: TRADER_STATE.asks,
                notify: true,
            },
            // array of trade objects
            // ordered by timestamp
            trades: {
                type: Array,
                value: TRADER_STATE.trades,
                notify: true,
            },
            // dict mapping asset names to this player's settled amount of that asset
            settledAssetsDict: {
                type: Object,
                value: TRADER_STATE.settled_assets,
                notify: true,
            },
            // when in single-asset mode, this property is the settled amount of that one asset
            settledAssets: {
                type: Number,
                value: null,
                notify: true,
            },
            // dict mapping asset names to this player's available amount of that asset
            availableAssetsDict: {
                type: Object,
                value: TRADER_STATE.available_assets,
                notify: true,
            },
            // when in single-asset mode, this property is the available amount of that one asset
            availableAssets: {
                type: Number,
                value: null,
                notify: true,
            },
            // this player's settled cash
            settledCash: {
                type: Number,
                value: TRADER_STATE.settled_cash/100,
                notify: true,
            },
            // this player's available cash
            availableCash: {
                type: Number,
                value: TRADER_STATE.available_cash/100,
                notify: true,
            },
            questionInfo: {
                type: String,
                value: TRADER_STATE.questionInfo,
                notify: true,
            },
            clueInfo: {
                type: String,
                value: TRADER_STATE.clueInfo,
                notify: true,
            },
            trueAnsFirstRound: {
                type: String,
                value: TRADER_STATE.trueAnsFirstRound,
                notify: true,
            },


            // the amount of time remaining in this round of trading in seconds if period_length is set, null otherwise
            // updated once a second
            timeRemaining: {
                type: Number,
                value: TRADER_STATE.time_remaining,
                notify: true,
            },
        }
    }

    static get template() {
        return html`
            <!-- outbound channels -->
            <redwood-channel
                id="enter_chan"
                channel="enter"
            ></redwood-channel>

            <!-- Changed by Kaushik -->
            <!-- I have addeed this redwood-channel tag which is built in polymer js to include the functionality for market order
            have added id as enter_chan_market(which will be used in frontend) and channel as enter_market(which will be used in backend spec. otree/models) -->
            <redwood-channel
                id="enter_chan_market"
                channel="enter_market"
            ></redwood-channel>

            <redwood-channel
                id="cancel_chan"
                channel="cancel"
            ></redwood-channel>
            <redwood-channel
                id="accept_chan"
                channel="accept"
            ></redwood-channel>

            <!-- inbound channels -->
            <redwood-channel
                channel="confirm_enter"
                on-event="_handle_confirm_enter"
            ></redwood-channel>
            <redwood-channel
                channel="confirm_trade"
                on-event="_handle_confirm_trade"
            ></redwood-channel>
            <redwood-channel
                channel="confirm_cancel"
                on-event="_handle_confirm_cancel"
            ></redwood-channel>
            <redwood-channel
                channel="error"
                on-event="_handle_error"
            ></redwood-channel>
            <redwood-channel
                channel="state"
                on-event="_state_event"
            ></redwood-channel>

            <otree-constants
                id="constants"
            ></otree-constants>
        `;
    }

    ready() {
        super.ready();
        this.pcode = this.$.constants.participantCode;
        console.log(TRADER_STATE.trueAnsFirstRound)
        // dynamically make single-asset properties computed only when in single-asset mode
        // that way these properties will just be null when using multiple assets. might prevent some confusion
        if (Object.keys(this.availableAssetsDict).length == 1) {
            this._createComputedProperty('settledAssets', '_compute_single_asset(settledAssetsDict.*)', true);
            this._createComputedProperty('availableAssets', '_compute_single_asset(availableAssetsDict.*)', true);
        }
    }

    // call this method to send an order enter message to the backend
    enter_order(price, volume, is_bid, asset_name=null) {
        alert("Total trading cost is:-" + (Math.round(price*100)/100)* volume + '\nTotal brokerage is:-' + (Math.round(price*100)/100)*volume*0.01)
        this.$.enter_chan.send({
            // Changed by Kaushik to implement brokerage
            price: (Math.round(price * 100) / 100) * 100,
            volume: volume,
            is_bid: is_bid,
            asset_name: asset_name,
            pcode: this.pcode,
        });
    }

    // Changed by kaushik
    // Have entered a javascript function to enter market order which will be responsible to send the data to the backend machine
    // Here price is not required so i commented it out 
    enter_market_order(volume, is_bid, asset_name=null) {
        this.$.enter_chan_market.send({
            // price: price,
            volume: volume,
            is_bid: is_bid,
            asset_name: asset_name,
            pcode: this.pcode,
        });
    }


    // call this method to send an order cancel message to the backend
    cancel_order(order) {
        this.$.cancel_chan.send(order);
    }

    // call this method to send an immediate accept message to the backend
    accept_order(order) {
        this.$.accept_chan.send(order);
    }

    // handle an incoming order entry confirmation
    _handle_confirm_enter(event) {
        const order = event.detail.payload;
        if (order.is_bid) {
            this._insert_bid(order);
        }
        else {
            this._insert_ask(order);
        }

        if (order.pcode == this.pcode) {
            this.update_holdings_available(order, false);
        }

        this.dispatchEvent(new CustomEvent('confirm-order-enter', {detail: order, bubbles: true, composed: true}));
    }

    // handle an incoming trade confirmation
    _handle_confirm_trade(event) {
        const trade = event.detail.payload;
        // iterate through making orders from this trade. if a making order is yours or the taking order is yours,
        // update your cash and assets appropriately
        for (const making_order of trade.making_orders) {
            if (making_order.pcode == this.pcode) {
                this.update_holdings_available(making_order, true);
                this.update_holdings_trade(making_order.price, making_order.traded_volume, making_order.is_bid, making_order.asset_name);
            }
            if (trade.taking_order.pcode == this.pcode) {
                this.update_holdings_trade(making_order.price, making_order.traded_volume, trade.taking_order.is_bid, trade.taking_order.asset_name);
            }
            this._remove_order(making_order)
        }

        // sorted insert trade into trades list
        let i = 0;
        for (; i < this.trades.length; i++)
            if (this.trades[i].timestamp < trade.timestamp)
                break;
        this.splice('trades', i, 0, trade);

        this.dispatchEvent(new CustomEvent('confirm-trade', {detail: trade, bubbles: true, composed: true}));
    }

    // handle an incoming cancel confirmation message
    _handle_confirm_cancel(event) {
        const order = event.detail.payload;
        this._remove_order(order);
        if (order.pcode == this.pcode) {
            this.update_holdings_available(order, true);
        }

        this.dispatchEvent(new CustomEvent('confirm-order-cancel', {detail: order, bubbles: true, composed: true}));
    }

    // removes an order from the bid/ask array
    _remove_order(order) {
        const order_store_name = order.is_bid ? 'bids' : 'asks';
        const order_store = this.get(order_store_name);
        let i = 0;
        for (; i < order_store.length; i++)
            if (order_store[i].order_id == order.order_id)
                break;
        if (i >= order_store.length) {
            console.warn(`order with id ${order.order_id} not found in ${order_store_name}`);
            return;
        }
        this.splice(order_store_name, i, 1);
    }

    // handle an incoming error message
    _handle_error(event) {
        const msg = event.detail.payload;
        if (msg.pcode == this.pcode) {
            this.dispatchEvent(new CustomEvent('error', {detail: msg.message, bubbles: true, composed: true}));
        }
    }

    // compare two order objects. sort first by price, then by timestamp
    // return a positive or negative number a la c strcmp
    // sort by descending price for bids, ascending price for asks
    _compare_orders(o1, o2) {
        if (o1.price == o2.price)
            // sort by descending timestamp
            return -(o1.timestamp - o2.timestamp);
        else if (o1.is_bid)
            return o1.price - o2.price;
        else
            return o2.price - o1.price;
    }

    // insert an order into the bids array in order
    _insert_bid(order) {
        let i = 0;
        for (; i < this.bids.length; i++) {
            if (this._compare_orders(this.bids[i], order) < 0)
                break;
        }
        this.splice('bids', i, 0, order);
    }

    // insert an ask into the asks array in order
    _insert_ask(order) {
        let i = 0;
        for (; i < this.asks.length; i++) {
            if (this._compare_orders(this.asks[i], order) < 0)
                break;
        }
        this.splice('asks', i, 0, order);
    }

    // update this player's holdings when a trade occurs
    update_holdings_trade(price, volume, is_bid, asset_name) {
        if (is_bid) {
            this._update_subproperty('availableAssetsDict', asset_name, volume);
            this._update_subproperty('settledAssetsDict', asset_name, volume);
            // Changed by Kaushik to implement brokerage
            this.availableCash -= (price/100) * volume;
            this.availableCash -= (price/100) * volume * 0.01;
            this.settledCash -= (price/100) * volume;
            this.settledCash -= (price/100) * volume * 0.01;
            
            this.availableCash = (Math.round(this.availableCash*100)/100)
            this.settledCash = (Math.round(this.settledCash*100)/100)


            
            // alert(this.clueInfo)

        }
        else {
            this._update_subproperty('availableAssetsDict', asset_name, -volume);
            this._update_subproperty('settledAssetsDict', asset_name, -volume);

            // Changed by Kaushik to implement brokerage

            this.availableCash += (price/100) * volume;
            this.availableCash -= (price/100) * volume * 0.01;

            this.settledCash += (price/100) * volume;
            this.settledCash -= (price/100) * volume * 0.01;

            this.availableCash = (Math.round(this.availableCash*100)/100)
            this.settledCash = (Math.round(this.settledCash*100)/100)

        }
    }

    // update this player's available holdings when an order is inserted/removed
    // removed is true when an order was removed and false when it was added
    update_holdings_available(order, removed) {
        const sign = removed ? 1 : -1;
        if (order.is_bid){
            // Changed by Kaushik to implement brokerage
            this.availableCash += (order.price/100) * order.volume * sign;
            this.availableCash += (order.price/100) * order.volume * sign * 0.01;

            this.availableCash = (Math.round(this.availableCash*100)/100)
            this.settledCash = (Math.round(this.settledCash*100)/100)
            

            // Changed by Kaushik to implement Brokerage
            if (removed == false)
                // this.availableCash -= 1;
                console.log('hi')

        }
        else{
            this._update_subproperty('availableAssetsDict', order.asset_name, order.volume * sign)
            // Changed by Kaushik to implement Brokerage
            if (removed == false)
                // this.availableCash -= 1;
                console.log('hi')
        }
    }

    _update_subproperty(property, subproperty, amount) {
        const old = this.get([property, subproperty]);
        this.set([property, subproperty], old + amount);
    }

    // have to use a state channel to hook into period start instead of redwood-period
    // it's a valid use case to use trader-state without redwood-period, maybe to display trading results
    // on a results page. if we use redwood-period, that results page will try to auto-advance immediately
    _state_event(event) {
        if (event.detail.payload == 'period_start')
            this._start()
    }

    // update timeRemaining once per second if it's defined
    _start() {
        if (!this.timeRemaining) return;
        const fullPeriodLength = this.timeRemaining;
        const startTime = performance.now();
        const intervalId = setInterval(() => {
            const secondsSinceStart = (performance.now() - startTime) / 1000;
            this.timeRemaining = Math.floor(fullPeriodLength - secondsSinceStart);
            if (this.timeRemaining <= 0) {
                this.timeRemaining = 0;
                clearInterval(intervalId)
            }
        }, 1000);
    }

    _compute_single_asset(assets_dict) {
        return Object.values(assets_dict.base)[0];
    }
}

window.customElements.define('trader-state', TraderState);
