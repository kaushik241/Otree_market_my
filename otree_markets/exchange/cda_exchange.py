from django.db import models
from itertools import chain
from django.utils import timezone
import logging

from .base import BaseExchange, Order, Trade, OrderStatusEnum

logger = logging.getLogger(__name__)

class CDAExchange(BaseExchange):
    '''this model represents a continuous double auction exchange'''

    # CDAExchange has additional fields 'trades' and 'orders'
    # these are related names from ForeignKey fields on Trade and Order

    #defining custom function to retrive limit order book
    #Changed by Kaushik
    def get_limit_ob_bids(self):
        # print(self.orders.filter(is_bid=True, status=OrderStatusEnum.ACTIVE).order_by('-price', 'timestamp'))
        return self._get_bids_qset()
    
    #this is too a custom public method to retrive limit order book
    def get_limit_ob_asks(self):
        # print(self.orders.filter(is_bid=True, status=OrderStatusEnum.ACTIVE).order_by('-price', 'timestamp'))
        return self._get_asks_qset()
    
    def _get_bids_qset(self):
        '''get a queryset of all active bids in this exchange, sorted by descending price then ascending timestamp
        
        use ascending timestamp because older orders get precedence over newer ones
        '''
        # print(self.orders.filter(is_bid=True, status=OrderStatusEnum.ACTIVE).order_by('-price', 'timestamp'))
        return (self.orders.filter(is_bid=True, status=OrderStatusEnum.ACTIVE)
                           .order_by('-price', 'timestamp'))

    def _get_asks_qset(self):
        '''get a queryset of all active asks in this exchange, sorted by ascending price then ascending timestamp

        use ascending timestamp because older orders get precedence over newer ones
        '''
        return (self.orders.filter(is_bid=False, status=OrderStatusEnum.ACTIVE)
                           .order_by('price', 'timestamp'))
    
    #Changed by Kaushik
    def _get_best_bid(self,asker_pcode):
        '''get the best bid in this exchange'''
        bids = self._get_bids_qset()
        for bid in bids:
            print(bid.pcode)
            #return self._get_bids_qset().first()
            if bid.pcode != asker_pcode:
                #return self._get_bids_qset().first()
                return bid
    
    #Changed by Kaushik
    def _get_best_ask(self,bidder_pcode):
        '''get the best ask in this exchange'''
        asks = self._get_asks_qset()
        for ask in asks:
            print(ask.pcode)
            #return self._get_asks_qset().first()
            
            if ask.pcode != bidder_pcode:
                # return self._get_asks_qset().first()
                return ask
    
    def _get_trades_qset(self):
        '''get a queryset of all trades that have occurred in this exchange, ordered by descending timestamp
        
        use descending timestamp because knowledge of recent trades is more useful than that of older trades
        '''
        return (self.trades.order_by('-timestamp')
                           .prefetch_related('taking_order', 'making_orders'))
    
    def _get_order(self, order_id):
        try:
            return self.orders.get(id=order_id)
        except Order.DoesNotExist as e:
            raise ValueError(f'order with id {order_id} not found') from e

    def enter_order(self, price, volume, is_bid, pcode):
        '''enter a bid or ask into the exchange'''
        order = self.orders.create(
            price  = price,
            volume = volume,
            is_bid = is_bid,
            pcode  = pcode
        )

        if is_bid:
            self._handle_insert_bid(order)
        else:
            self._handle_insert_ask(order)


    
    def enter_market_order(self, volume, is_bid, pcode):
        '''enter a market order into the exchange
        
        a market bid has effective price 0 and a market ask has effective price infinity.
        additionally, market orders are not entered into the book if they don't immediately
        transact'''
        if is_bid:
            self._handle_bid_market_order(volume, pcode)
        else:
            self._handle_ask_market_order(volume, pcode)

    def cancel_order(self, order_id):
        '''cancel an already entered order'''
        canceled_order = self._get_order(order_id)
        if canceled_order.status != OrderStatusEnum.ACTIVE:
            logger.error(f'Cancel attempted on inactive order with id {order_id}')
            return

        canceled_order.status = OrderStatusEnum.CANCELED
        canceled_order.time_inactive = timezone.now()
        canceled_order.save()
        self.group.confirm_cancel(canceled_order)
    
    def accept_immediate(self, accepted_order_id, taker_pcode):
        '''directly trade with the order with id `accepted_order_id`
        
        this creates a new order and trades it directly with the order with id `order_id`,
        fully filling the accepted order'''
        accepted_order = self._get_order(accepted_order_id)
        if accepted_order.status != OrderStatusEnum.ACTIVE:
            logger.error(f'Accept attempted on inactive order with id {accepted_order_id}')
            return

        now = timezone.now()
        taking_order = self.orders.create(
            timestamp = now,
            time_inactive = now,
            status = OrderStatusEnum.ACCEPTED_TAKER,
            price  = accepted_order.price,
            volume = accepted_order.volume,
            is_bid = not accepted_order.is_bid,
            pcode  = taker_pcode,
            traded_volume = accepted_order.volume,
        )

        trade = self.trades.create(timestamp=now, taking_order=taking_order)

        accepted_order.status = OrderStatusEnum.ACCEPTED_MAKER
        accepted_order.time_inactive = now
        accepted_order.making_trade = trade
        accepted_order.traded_volume = accepted_order.volume
        accepted_order.save()

        self._send_trade_confirmation(trade)
    #Changed by Kaushik to make a order book in which a person can't trade with himself
    def _handle_insert_bid(self, bid_order):
        '''handle a bid being inserted into the order book, transacting if necessary'''
        # if this order isn't aggressive enough to transact with the best ask, just enter it
        #best_ask = self._get_best_ask()
        #Changed by Kaushik
        best_ask = self._get_best_ask(bid_order.pcode)
        if (not best_ask) or (bid_order.price < best_ask.price and bid_order.pcode != best_ask.pcode):
            self._send_enter_confirmation(bid_order)
            
            return

        asks = self._get_asks_qset()
        trade = self.trades.create(taking_order=bid_order)
        cur_volume = bid_order.volume
        for ask in asks:
            if ask.pcode != bid_order.pcode:
                print('HIiii')
                if cur_volume == 0 or bid_order.price < ask.price:
                    break
                if cur_volume >= ask.volume:
                    cur_volume -= ask.volume
                    ask.traded_volume = ask.volume
                else:
                    self._enter_partial(ask, ask.volume - cur_volume)
                    ask.traded_volume = cur_volume
                    cur_volume = 0
                ask.making_trade = trade
                ask.status = OrderStatusEnum.TRADED_MAKER
                ask.time_inactive = trade.timestamp
                ask.save()
        if cur_volume > 0:
            self._enter_partial(bid_order, cur_volume)
        bid_order.traded_volume = bid_order.volume - cur_volume
        bid_order.status = OrderStatusEnum.TRADED_TAKER
        bid_order.time_inactive = trade.timestamp
        bid_order.save()
        self._send_trade_confirmation(trade)
    
    #Changed by Kaushik to make a order book in which a person can't trade with himself
    def _handle_insert_ask(self, ask_order):
        '''handle an ask being inserted into the order book, transacting if necessary'''
        # if this order isn't aggressive enough to transact with the best bid, just enter it
        # best_bid = self._get_best_bid()
        #Changed by Kaushik
        best_bid = self._get_best_bid(ask_order.pcode)
        if (not best_bid) or (ask_order.price > best_bid.price and ask_order.pcode != best_bid.pcode):
            self._send_enter_confirmation(ask_order)
            return

        bids = self._get_bids_qset()
        trade = self.trades.create(taking_order=ask_order)
        cur_volume = ask_order.volume
        for bid in bids:
            if ask_order.pcode != bid.pcode:
                if cur_volume == 0 or ask_order.price > bid.price :
                    break
                if cur_volume >= bid.volume:
                    cur_volume -= bid.volume
                    bid.traded_volume = bid.volume
                else:
                    self._enter_partial(bid, bid.volume - cur_volume)
                    bid.traded_volume = cur_volume
                    cur_volume = 0
                bid.making_trade = trade
                bid.status = OrderStatusEnum.TRADED_MAKER
                bid.time_inactive = trade.timestamp
                bid.save()
        if cur_volume > 0:
            self._enter_partial(ask_order, cur_volume)
        ask_order.traded_volume = ask_order.volume - cur_volume
        ask_order.status = OrderStatusEnum.TRADED_TAKER
        ask_order.time_inactive = trade.timestamp
        ask_order.save()
        self._send_trade_confirmation(trade)
    
    def _enter_partial(self, order, new_volume):
        '''reenter an order that's been partially filled'''
        new_order = self.orders.create(
            timestamp = order.timestamp,
            price     = order.price,
            volume    = new_volume,
            is_bid    = order.is_bid,
            pcode     = order.pcode
        )
        self._send_enter_confirmation(new_order)

    #Changed by Kaushik
    def _handle_bid_market_order(self, volume, pcode):
        '''enter a bid market order'''
        # if there are no asks, just exit without doing anything
        if volume == 0 or not self._get_best_ask(pcode):
            return
        
        # use one datetime object for all timestamp updates so that
        # all the timestamps agree exactly
        now = timezone.now()
        taking_order = self.orders.create(
            timestamp = now,
            time_inactive = now,
            status = OrderStatusEnum.MARKET_TAKER,
            price  = 0,
            # this price field doesn't really matter, but it makes sense that a bid market order would have
            # the min possible price
            volume = volume,
            is_bid = True,
            pcode  = pcode,
        )
        trade = self.trades.create(timestamp=now, taking_order=taking_order)

        asks = self._get_asks_qset()
        cur_volume = volume
        for ask in asks:
            if ask.pcode != pcode:
                if cur_volume == 0:
                    break
                if cur_volume >= ask.volume:
                    cur_volume -= ask.volume
                    ask.traded_volume = ask.volume
                else:
                    self._enter_partial(ask, ask.volume - cur_volume)
                    ask.traded_volume = cur_volume
                    cur_volume = 0
                ask.making_trade = trade
                ask.status = OrderStatusEnum.MARKET_MAKER
                ask.time_inactive = now
                ask.save()
        taking_order.traded_volume = volume - cur_volume
        taking_order.time_inactive = now
        taking_order.save()
        self._send_trade_confirmation(trade)

    def _handle_ask_market_order(self, volume, pcode):
        '''enter an ask market order'''
        # if there are no asks, just exit without doing anything
        if volume == 0 or not self._get_best_bid(pcode):
            return

        # use one datetime object for all timestamp updates so that
        # all the timestamps agree exactly
        now = timezone.now()
        taking_order = self.orders.create(
            timestamp = now,
            time_inactive = now,
            status = OrderStatusEnum.MARKET_TAKER,
            price  = 0x7FFFFFFF, 
            # this is the max 4-byte signed integer, the biggest number IntegerField can hold
            # this price field doesn't really matter, but it makes sense that an ask market order would have
            # the max possible price
            volume = volume,
            is_bid = False,
            pcode  = pcode,
        )
        trade = self.trades.create(timestamp=now, taking_order=taking_order)

        bids = self._get_bids_qset()
        cur_volume = volume
        for bid in bids:
            if bid.pcode != pcode:
                if cur_volume == 0:
                    break
                if cur_volume >= bid.volume:
                    cur_volume -= bid.volume
                    bid.traded_volume = bid.volume
                else:
                    self._enter_partial(bid, bid.volume - cur_volume)
                    bid.traded_volume = cur_volume
                    cur_volume = 0
                bid.making_trade = trade
                bid.status = OrderStatusEnum.MARKET_MAKER
                bid.time_inactive = now
                bid.save()
        taking_order.traded_volume = volume - cur_volume
        taking_order.time_inactive = now
        taking_order.save()
        self._send_trade_confirmation(trade)
    
    #Changed by Kaushik for asks
    '''This is custom function to calcuate ask price required to fill the market order'''
    def calculate_ask_price_for_market_order(self,volume,pcode):
        bids = self._get_bids_qset()
        curr_volume = volume 
        required_money = 0
        for bid in bids:
            if bid.pcode != pcode:
                if curr_volume == 0:
                    break
                if curr_volume >= bid.volume:
                    required_money = required_money + bid.price*bid.volume
                    curr_volume -= bid.volume
                    print(required_money)
                else:
                    required_money = required_money + bid.price*curr_volume
                    print(required_money)
        return required_money

    #Changed by Kaushik for bids
    '''This is custom function to calcuate bid price required to fill the market order'''
    def calculate_bid_price_for_market_order(self,volume,pcode):
        asks = self._get_asks_qset()
        curr_volume = volume 
        required_money = 0
        for ask in asks:
            if ask.pcode != pcode:
                if curr_volume == 0:
                    break
                if curr_volume >= ask.volume:
                    required_money = required_money + ask.price*ask.volume
                    curr_volume -= ask.volume
                    print(required_money)
                else:
                    required_money = required_money + ask.price*curr_volume
                    print(required_money)
        return required_money
    

    def _send_enter_confirmation(self, order):
        '''send an order enter confirmation to the group'''
        self.group.confirm_enter(order)

    def _send_trade_confirmation(self, trade):
        '''send a trade confirmation to the group'''
        self.group.confirm_trade(trade)
    
    def __str__(self):
        return '\n'.join(' ' + str(e) for e in chain(self._get_bids_qset(), self._get_asks_qset()))

    
