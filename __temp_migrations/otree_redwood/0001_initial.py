# Generated by Django 2.2.12 on 2022-12-17 18:38

from django.db import migrations, models
import django.db.models.deletion
import jsonfield.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('otree', '0001_initial'),
        ('contenttypes', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('timestamp', models.DateTimeField()),
                ('group_pk', models.PositiveIntegerField()),
                ('channel', models.CharField(max_length=100)),
                ('value', jsonfield.fields.JSONField()),
                ('content_type', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='content_type_events', to='contenttypes.ContentType')),
                ('participant', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='+', to='otree.Participant')),
            ],
            options={
                'ordering': ['timestamp'],
            },
        ),
        migrations.CreateModel(
            name='Connection',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('participant', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='+', to='otree.Participant')),
            ],
        ),
    ]
