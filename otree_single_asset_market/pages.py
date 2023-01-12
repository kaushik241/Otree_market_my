from otree_markets.pages import BaseMarketPage

class Market(BaseMarketPage):

    timeout_seconds = 600
    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds

class Results1(BaseMarketPage):
    timeout_seconds = 1200
    def is_displayed(self):
        return self.round_number <= self.subsession.config.num_rounds


page_sequence = [Market, Results1, Market] # I guess this will be useful to create page sequences in the html files
