import { html, PolymerElement } from '/static/otree-redwood/node_modules/@polymer/polymer/polymer-element.js';
import '/static/otree-redwood/src/redwood-channel/redwood-channel.js';
import '/static/otree-redwood/src/otree-constants/otree-constants.js';

import '/static/otree_markets/trader_state.js'
import '/static/otree_markets/simple_modal.js';
import '/static/otree_markets/event_log.js';

import './order_enter_widget.js';

/*
    this component is a single-asset market, implemented using otree_markets' trader_state component and some of
    otree_markets' reusable UI widgets.
*/

class Result1 extends PolymerElement {

    static get properties() {
        return {
            settledAssets: Number,
            availableAssets: Number,
            settledCash: Number,
            availableCash: Number,
            trueAnsFirstRound: Number,
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
                questionInfo="{{questionInfo}}"
                clueInfo="{{clueInfo}}"
                trueAnsFirstRound = "{{trueAnsFirstRound}}"
                on-confirm-trade="_confirm_trade"
                on-confirm-cancel="_confirm_cancel"
                on-error="_handle_error"
            ></trader-state>





            <!--Changed by Kaushik-->

                <div id=information>
                    <div class="balance_info">
                        
                    </div>
                    <div class="payout_calculation_info">

                    </div>
                    
                </div>
                
        `;
    }

    ready() {
        super.ready();
        this.pcode = this.$.constants.participantCode;
        // console.log(document.getElementById("main-container"));
        // Changed by Kaushik to calculate tradeoff between 
        console.log('HIIIII')
        console.log('Hii')
        console.log(this.$.trader_state.settledAssets)
        console.log("Answer is " + (parseFloat(this.$.trader_state.trueAnsFirstRound)*parseFloat(this.$.trader_state.settledAssets) + parseFloat(this.$.trader_state.settledCash)))
        console.log(this.$.trader_state.settledCash)
        
    }

}

window.customElements.define('result-1', Result1);
