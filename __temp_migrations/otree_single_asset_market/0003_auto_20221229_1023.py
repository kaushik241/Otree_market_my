# Generated by Django 2.2.12 on 2022-12-29 04:53

from django.db import migrations
import otree.db.models


class Migration(migrations.Migration):

    dependencies = [
        ('otree_single_asset_market', '0002_auto_20221229_1021'),
    ]

    operations = [
        migrations.AlterField(
            model_name='player',
            name='available_cash',
            field=otree.db.models.IntegerField(null=True),
        ),
        migrations.AlterField(
            model_name='player',
            name='settled_cash',
            field=otree.db.models.IntegerField(null=True),
        ),
    ]
