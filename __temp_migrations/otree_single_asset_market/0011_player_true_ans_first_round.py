# Generated by Django 2.2.12 on 2023-01-12 06:33

from django.db import migrations
import otree.db.models


class Migration(migrations.Migration):

    dependencies = [
        ('otree_single_asset_market', '0010_remove_player_first_round_counter'),
    ]

    operations = [
        migrations.AddField(
            model_name='player',
            name='true_ans_first_round',
            field=otree.db.models.FloatField(null=True),
        ),
    ]
