from otree.api import (
    models, BaseConstants
)
from otree_markets import models as markets_models
from .configmanager import ConfigManager
import random 

class Constants(BaseConstants):
    name_in_url = 'otree_single_asset_market'
    players_per_group = None ##Changed None
    num_rounds = 5 ##Changed 99

    # the columns of the config CSV and their types
    # this dict is used by ConfigManager
    config_fields = {
        'period_length': int,
        'asset_endowment': int,
        'cash_endowment': int,
        'allow_short': bool,
    }


class Subsession(markets_models.Subsession):

    @property
    def config(self):
        config_addr = Constants.name_in_url + '/configs/' + self.session.config['config_file']
        return ConfigManager(config_addr, self.round_number, Constants.config_fields)
    
    def allow_short(self):
        return self.config.allow_short

    def creating_session(self):
        if self.round_number > self.config.num_rounds:
            return
        return super().creating_session()



class Group(markets_models.Group):
    pass


class Player(markets_models.Player):


    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        Player.first_round_counter = 1
        Player.true_ans = random.uniform(0, 1)

    #Changed by Kaushik to set counter

    def asset_endowment(self):
        return self.subsession.config.asset_endowment
        
    
    def cash_endowment(self):
        return self.subsession.config.cash_endowment


    #Changed by Kaushik to implement the first question
    def first_round_info(self):

        first_round_info_dict = self.question_info_func()
        
        payout = first_round_info_dict['payout']
        probabilities = first_round_info_dict['probabilities']
        true_ans = Player.true_ans
        true_ans_index = 0
        for index,prob in enumerate(probabilities):
            if true_ans < prob:
                true_ans_index = index 
            else:
                continue    
        print('kashik')
        print(true_ans_index)
        true_ans = payout[true_ans_index]
        true_prob = probabilities[true_ans_index]
        # [50, 490]
        # [0.35, 0.20]
        payout_string = ""
        for i,j in zip(payout,probabilities):
            payout_string = payout_string + f"${i} ({j*100}% Chance) or "
            
        payout_string = 'or'.join(payout_string.split('or')[:-1])
        payout.remove(true_ans)
        probabilities.remove(true_prob)
        
        hint_payout_index = (Player.first_round_counter - 1)%len(payout)
        hing_payout = payout[hint_payout_index]
        
        hint_string = f"The asset will not pay ${hing_payout}"
        
        Player.first_round_counter += 1
        print(f"Hi this is player counter {Player.first_round_counter}")

        #returning true answer also to get this true answer in the front end
        return [payout_string, hint_string, true_ans]


