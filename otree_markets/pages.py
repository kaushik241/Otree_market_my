from ._builtin import Page
import json

class BaseMarketPage(Page):

    def get_context_data(self, *args, **kwargs):
        context = super().get_context_data(*args, **kwargs)
        bids = []
        asks = []
        trades = []
        for exchange in self.group.exchanges.all():
            for bid_order in exchange._get_bids_qset():
                bids.append(bid_order.as_dict())
            for ask_order in exchange._get_asks_qset():
                asks.append(ask_order.as_dict())
            for trade in exchange._get_trades_qset():
                trades.append(trade.as_dict())
        remaining_time = self.group.get_remaining_time()
        context.update({
            'trader_state': {
                'time_remaining': round(remaining_time) if remaining_time else remaining_time,
                'bids': json.dumps(bids),
                'asks': json.dumps(asks),
                'trades': json.dumps(trades),
                'available_assets': json.dumps(self.player.available_assets),
                'settled_assets': json.dumps(self.player.settled_assets),
                'available_cash': self.player.available_cash,
                'settled_cash': self.player.settled_cash,
                'question_info': self.player.question_info,
                'clue_info': self.player.clue_info,
            }
        }) 
        print(context)
        return context
