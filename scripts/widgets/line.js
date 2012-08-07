/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true, 
  smarttabs:true*/
/*global DataSift:true, Loading:true, Data:true, Available:true, Login:true,
  Thread:true, Widget:true, Pie:true, CSV:true, Interactions:true, console:true,
  d3:true*/


/**
 * Render a line chart
 *
 * We are using D3 to render a line chart
 *
 * @return {Object} init & refresh
 */
var Line = (function () {


	var data	= false,
		dataHash = false,
		div		= false,
		format = '',
		options = {},
		min = false,
		max = false;

	var render = function () {

		// find the max time
		max = data.max(function (i) {
			return i.time;
		});

		// find the min time
		min = data.min(function (i) {
			return i.time;
		});

		// get the max count
		var maxCount = data.max(function (i) {
			return i.value;
		});

		var minCount = data.min(function (i) {
			return i.value;
		});

		// x and y functions
		var x		= d3.time.scale().domain([min, max]).range([0, options.width - options.padding]),
			y		= d3.scale.linear().domain([minCount, maxCount]).range([options.height - options.padding, 0]);


		// make sure the data is sorted by time
		data.sort(function (a, b) {
			return a.time - b.time;
		});

		// build the chart
		var chart = d3.select(div)
			.append('svg')
			.attr('width', options.width)
			.attr('height', options.height)
			.append('g');

		// render the gridline
		chart.append('g').selectAll('line')
			.data(y.ticks(5))
			.enter()
				.append('line')
				.attr("x1", 0)
			    .attr("x2", options.width - options.padding)
			    .attr("y1", y)
			    .attr("y2", y)
			    .attr('class', 'line-gridline');

		// add a wrapper for the points
		var points = chart
			.append('g')
			.attr('id', 'points');
			//.attr("transform", "translate(30," + options.padding + ")");

		// create the line function
		var line = d3.svg.line()
			.x(function (value, index) { return x(value.time); })
			.y(function (value) { return y(value.value); });

		// render the line
		points.append('path')
			.attr('d', line(data))
			.attr('class', 'line-points');
		    
		// x axis function
		var xAxis = d3.svg.axis()
			.scale(x)
			.orient('bottom')
			.ticks(5);

		// render x axis
		chart.append('g')
		    .call(xAxis)
		    .attr("transform", "translate(0," + (options.height - options.padding) + ")")
		    .attr('class', 'line-axis');

		// y axis function
		var yAxis = d3.svg.axis()
			.scale(y)
			.orient('left')
			.ticks(5);
			//.tickFormat(d3.format(',.0e'));

		// render y axis
		chart.append('g')
			.call(yAxis)
			.attr("transform", "translate(" + (100) + ",0)")
			.attr('class', 'line-axis y')
			.attr('text-anchor', 'start');
	};

	
	return {

		init: function (_widget, _data, _options) {

			div = _widget.getBody();

			data = _data;

			options = _options ? _options : {};
			options.width = options.width ? options.width : div.getWidth();
			options.height = options.height ? options.height : 300;
			options.padding = options.padding ? options.padding : 20;

			//timeframe(_data);

			render();

		},

		refresh: function (_data) {

			data = _data;
			div.update('');
			render();

		}

	};

});