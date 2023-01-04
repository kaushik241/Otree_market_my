<script src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
<script src="http://code.highcharts.com/highcharts.js"></script>

<dom-module id="bar-chart">
    <template>
        <div id="container" style="max-width: 600px; height: 360px;"></div>
    </template>

    <script>
        Polymer({
        is: "bar-chart",
        ready: function () {


            $(this.$.container).highcharts({
            chart: {
                type: 'bar',
                renderTo: 'container'
            },
            title: {text:  'HI'},
            xAxis: {
                categories: ['London', 'Paris', 'Madrid']
            },
            yAxis: {
                title: {
                    text: 'Sales'
                }
            },
            series: [{
                name: 'Cities',
                data: [1000, 2500, 1500]
            }]
        })
      }
    });
    </script>
</dom-module>