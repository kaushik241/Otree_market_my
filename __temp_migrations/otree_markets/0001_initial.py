# Generated by Django 2.2.12 on 2022-12-17 18:38

from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone
import otree_markets.exchange.base


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('contenttypes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Order',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
                ('status', models.PositiveSmallIntegerField(default=otree_markets.exchange.base.OrderStatusEnum(1))),
                ('price', models.IntegerField()),
                ('volume', models.IntegerField()),
                ('is_bid', models.BooleanField()),
                ('pcode', models.CharField(max_length=32)),
                ('traded_volume', models.IntegerField(null=True)),
                ('time_inactive', models.DateTimeField(null=True)),
                ('object_id', models.PositiveIntegerField()),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
        migrations.CreateModel(
            name='Trade',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField(default=django.utils.timezone.now)),
                ('object_id', models.PositiveIntegerField()),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
                ('taking_order', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='taking_trade', to='otree_markets.Order')),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
        migrations.AddField(
            model_name='order',
            name='making_trade',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='making_orders', to='otree_markets.Trade'),
        ),
        migrations.CreateModel(
            name='CDAExchange',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('object_id', models.PositiveIntegerField()),
                ('asset_name', models.CharField(max_length=32)),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='contenttypes.ContentType')),
            ],
            options={
                'abstract': False,
                'unique_together': {('asset_name', 'content_type', 'object_id')},
            },
        ),
    ]
