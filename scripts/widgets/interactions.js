/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true, 
  smarttabs:true*/
/*global DataSift:true, Loading:true, Data:true, Available:true, Login:true,
  Thread:true, Widget:true, Pie:true, CSV:true, Interactions:true, console:true
  d3:true*/
var Interactions = (function () {

	"use strict";

	var	div			= false,
		data		= false,
		options		= false,
		width		= false,
		height		= 300,
		currentTime = 0,
		timeCount	= 0,
		format		= '',
		total		= 0;

	// parts
	var chart = false,
		rectangles = false;

	var render = function () {

		var maxCount = d3.max(data, function (d) {
			return d.count;
		});

		var parse	= d3.time.format(format),
			x		= d3.time.scale().domain([0, data.length - 1]).range([0, width]),
			y		= d3.scale.linear().domain([0, maxCount]).range([0, height]);

		// build the chart
		chart = d3.select(div)
			.append('svg')
			.attr('width', width)
			.attr('height', height)
			.append('g');

		rectangles = chart
			.append('g')
			.attr('id', 'rectangles')
			.attr("transform", "translate(0, " + height + ")");

		var line = d3.svg.line()
			.x(function (value, index) { return x(index); })
			.y(function (value) { return -1 * y(value.count); });

		var area = d3.svg.area()
			.x(line.x())
			.y1(line.y())
			.y0(y(0));

		rectangles.append("path")
			.attr("d", area(data))
			.attr("class", 'interactions-area');

		rectangles.append('path')
			.attr('d', line(data))
			.attr('class', 'interactions');

		// add some labels
		chart.selectAll('text')
			.data(data)
		.enter()
			.append('text')
			.text(function (value, i) {
				if (i % Math.round(data.length / 10)) {
					return '';
				}
				return parse(value.time);
			}.bind(this))
			.attr('x', function (value, index) { return x(index); })
			.attr('y', height)
			.attr("dx", 0)
			.attr("text-anchor", "middle")
			.attr('class', 'interactions-label');

		var number = new Element('div', {'class': 'interactions-total'});
		number.update(total + ' <span>total analyzed interactions</span>');
		div.appendChild(number);
	};

	var timeframe = function (_data) {

		var tempdata	= {},
			dataHash	= new Hash(_data),
			range		= 0,
			wrap		= 0;

		// find the smallest time
		var min = dataHash.min(function (pair) {
			return parseInt(pair.key, 10);
		});

		// find the largest time
		var max = dataHash.max(function (pair) {
			return parseInt(pair.key, 10);
		});

		data = [];
		range = (max - min) / 1000;

		// work out the timeframe of the chart, we need at least 10
		if (range >= 60 * 60 * 24 * 365 * 10) {
			// years
			wrap = 1000 * 60 * 60 * 60 * 24 * 365;
			format = '%x';
		} else if (range >= 60 * 60 * 24 * 7 * 10) {
			// weeks
			wrap = 1000 * 60 * 60 * 24 * 7;
			format = '%d %b';
		} else if (range >= 60 * 60 * 24 * 10) {
			// days
			wrap = 1000 * 60 * 60 * 24;
			format = '%d %b';
		} else if (range >= 60 * 60 * 10) {
			// hours
			wrap = 1000 * 60 * 60;
			format = '%m/%d %H:%M';
		} else if (range >= 60 * 3) {
			// mins
			wrap = 1000 * 60;
			format = '%H:%M';
		} else {
			// seconds
			wrap = 1000;
			format = '%H:%M:%S';
		}

		total = 0;
		dataHash.each(function (pair) {
			var time = Math.floor(pair.key / wrap) * wrap;
			if (!tempdata[time]) {
				tempdata[time] = 0;
			}
			tempdata[time] += pair.value.count;
			total += pair.value.count;
		});

		tempdata = new Hash(tempdata);

		tempdata.each(function (pair) {
			data.push({
				'time': new Date(parseInt(pair.key, 10)),
				'count': pair.value
			});
		});

	};


	return {
		init: function (_div, _data, _options) {

			width = document.viewport.getWidth();
			div = $(_div);
			options = _options;

			timeframe(_data);

			if (data.length > 0) {
				render();
			}

			return this;
		},

		update: function (_data) {
			timeframe(_data);
			div.update('');
			render();
		},

		getTotal: function () {
			return total;
		}
	};

})();

/*
var liveInteractions = {


	width: document.viewport.getWidth(),
	height: 300,
	currentTime: 0,
	timeCount: 0,

	init: function(div, options) {

		this.div = div;
		this.options = options;
		this.interactions = [];

		// how many bars can we fit in?
		this.bars = Math.floor(this.width/80);

		for (var i = 0; i < this.bars; i++) {
			this.interactions.push(0);
		}

		this.render();

		setInterval(this.update.bindAsEventListener(this), 1000);

		// listen for events
		$(document).observe('dashboard:message', this.onMessage.bindAsEventListener(this));
	},

	onMessage: function() {
		var d = new Date();
		var currentTime = Math.floor(d.getTime()/1000);

		if (currentTime == this.currentTime) {
			this.timeCount++;
		} else {
			this.currentTime = currentTime;
			this.interactions.push(this.timeCount);
			this.timeCount = 1;
		}

		if (this.interactions.length > this.bars) {
			this.interactions.shift();
		}
	},

	render: function() {



	},

	update: function() {
		this.y = d3.scale.linear().domain([0, d3.max(this.interactions)]).range([0, this.height]);

		this.rectangles.selectAll('rect')
			.data(this.interactions)
		.transition()
			.duration(1000)
			.attr('y', function(value) { return this.height - this.y(value); }.bind(this))
			.attr('height', function(value) { return this.y(value); }.bind(this));
	}
}*/