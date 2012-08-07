/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true, 
  smarttabs:true*/
/*global DataSift:true, Loading:true, Data:true, Available:true, Login:true,
  Thread:true, Widget:true, Pie:true, CSV:true, Interactions:true, console:true,
  d3:true*/

/**
 * Render a Pie chart
 *
 * We use D3 to render an array of the format 
 * [{
 *   label: '',
 *   value: 0
 * }]
 * 
 * @return {Object} init & refresh
 */
var Pie = (function () {

	"use strict";

	var div			      = false,
		data              = [],
		options           = {},
		colour            = d3.scale.category20c(),
		total             = 0,
		totalInteractions = 0;

	// SVG parts
	var svg		= false,
		arcs    = false,
		text    = false,
		tooltip = false,
		legend  = false;

	/**
	 * Render the SVG object
	 */
	var render = function () {

		// pie layout function
		var pie = d3.layout.pie().sort(null).value(function (value) {
			return value.value;
		});

		// arc layout function
		var arc = d3.svg.arc().innerRadius(options.radius - options.width).outerRadius(options.radius);

		// build the SVG
		svg = d3.select(div)
			.append('svg:svg')
			.attr('width', options.radius * 2)
			.attr('height', options.radius * 2)
			.append('svg:g')
			.attr('transform', 'translate(' + (options.radius) + ',' + (options.radius) + ')')
			.attr('class', 'pie');

		// build the arcs
		arcs = svg.selectAll('path')
			.data(pie(data))
		.enter()
			.append('svg:path')
			.attr('fill', function (d, i) { return d.data.colour; })
			.attr('d', arc)
			.attr('class', 'pie-segment')
			.on('mouseover', mouseOver)
			.on('mouseout', mouseOut);

		// add the center percentage
		svg.append('text')
			.text(((total / totalInteractions) * 100).toFixed(2) + '%')
			.attr('class', 'percentage')
			.attr('dy', 5)
			.attr('text-anchor', 'middle')
			.attr('font-style', 'italic');

		// add the legend
		d3.select(div)
		.append('div')
		.attr('class', 'labels')
			.selectAll('div.label')
				.data(data)
			.enter()
				.append('div')
				.attr('class', 'label')
				.html(function (d) { 
					return '<div class="key" style="background-color:' + d.colour + '"></div>' + formatLabel(d.label); 
				});

	};

	/**
	 * Update the pie chart
	 *
	 * This is a bit of a cheat, we just remove the chart and redraw it.
	 * I did attempt to use animations, but these started to break down when
	 * we were updating 100's of charts in a page.
	 * 
	 * @return {[type]} [description]
	 */
	var update = function () {
		d3.select(div).selectAll("svg").remove();
		render();
	};

	/**
	 * When we hover over the pie, show a tooltip with the current key we are
	 * hovering
	 * 
	 * @param  {Object} evt Mouse hover event
	 */
	var mouseOver = function (evt) {
		tooltip = new Element('div', {'id': 'tooltip'}).update(evt.data.label);
		tooltip.setStyle({
			'left': (window.pageXOffset + d3.event.clientX) + 'px',
			'top': (window.pageYOffset + d3.event.clientY) + 'px'
		});
		document.body.appendChild(tooltip);
	};

	/**
	 * Just remove the tooltip when we mouse out
	 *
	 * @todo This could be down a lot better, currently this will flickr if you hover
	 * the tooltip
	 * 
	 * @param  {Object} evt mouse out event
	 */
	var mouseOut = function (evt) {
		tooltip.remove();
	};

	/**
	 * Take an ugly label and make it pretty
	 *
	 * When we past labels into the chart they are strings in the format of
	 * <code>_this_is_my_key</code>
	 * They need to be converted to
	 * <code>This Is My Key</code>
	 *
	 * @param  {String} label The label we want to format nicely
	 * 
	 * @return {String}       The nice label
	 */
	var formatLabel = function (label) {

		var sanitised = '';
		// remove all the <br/>
		sanitised = label.replace('<br/>', '');
		// remove all the HTML comments
		sanitised = sanitised.replace(/<!--(.|\s)*?-->/, '');
		// strip tags
		sanitised = sanitised.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
		// strip scripts
		sanitised = sanitised.replace(new RegExp('<script[^>]*>([\\S\\s]*?)<\/script>'), '');
		// trim off everything after 100 characters
		sanitised = sanitised.substring(0, 100);
		// update the object
		sanitised = sanitised.replace(/&amp;#/gi, '&#');
		// uppercase the first letter in each word
		sanitised = sanitised.replace(/^([a-z])|\s+([a-z])/g, function (one) {
			return one.toUpperCase();
		});

		return sanitised;
	};


	/**
	 * We can't display 1000's of items in the pie chart, because it will be 
	 * useless. There for we do a bit of processing to the data to make it
	 * look better.
	 *
	 * Data is sorted descending, everything after the 9th item is combined
	 * to form an other group. We also look through our existing data so we 
	 * don't loose any of the colours we have set up.
	 *
	 * @todo  investigate what these look like when other is removed from the 
	 * chart but is kept for the values
	 * 
	 * @param  {Object} _data Our data array
	 * 
	 */
	var formatData = function (_data) {


		// first we need to loop through our data to see if we already have
		// the data, if we do update it so we keep the colour
		_data.each(function (d) {
			var found = false;

			data.each(function (obj) {
				if (obj.label === d.label) {
					obj.value = d.value;
					found = true;
					throw $break;
				}
			});

			// if not, lets add it and give it a colour
			if (!found) {
				d.colour = colour(data.length);
				data.push(d);
			}

		});

		// iterate through to find the other
		var other = 0;
		data.each(function (obj, i) {
			if (obj.label === 'other') {
				other = i;
			}
		});
		// remove the other
		if (other) {
			data.splice(other, 1);
		}

		// attempt to sort the data
		data.sort(function (a, b) {
			return b.value - a.value;
		});

		total = 0;
		// find the total
		data.each(function (i) {
			total += i.value;
		});

		// cut them all off and round them up
		if (data.length > 9) {
			var removed = data.splice(9);
			var removedCount = 0;
			removed.each(function (r) {
				removedCount += r.value;
			});

			data.push({
				'label': 'other',
				'value': removedCount,
				'colour': colour(10)
			});
		}
	};

	return {

		/**
		 * Start a pie chart
		 *
		 * <h2>Useage</h2>
		 * <pre>
		 *     var p = new Pie();
		 *     p.init(div, data, {});
		 * </pre>
		 * 
		 * @param  {Object [Widget]} _div	The widget object to place this chart in
		 * @param  {Array}  _data			The Data array		
		 * @param  {Int}    _total          The total number of interactions so far
		 * @param  {Object} _options		An array of options
		 * 
		 * @return {[type]}          [description]
		 */
		init: function (_div, _data, _total, _options) {

			div = _div.getBody();
			options = _options ? _options : {};

			if (options.radius > 100) {
				options.radius = 100;
			}


			options.width = options.radius / 2.5;
			totalInteractions = _total;

			formatData(_data);

			// render the pie
			render();
		},

		/**
		 * Refresh the pie chart with new data
		 * 
		 * @param  {Array} _data    Our data array
		 * @param  {Int}   _total   The total number of interactions so far
		 */
		refresh: function (_data, _total) {
			totalInteractions = _total;
			formatData(_data);
			div.update('');
			update();
		}
	};
});