/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true, 
  smarttabs:true*/
/*global DataSift:true, Loading:true, Data:true, Available:true, Login:true,
  Thread:true, Widget:true, Pie:true, CSV:true, Interactions:true, console:true,
  d3:true, worldData:true*/

var Map = (function () {

	"use strict";

	var div		= false,
		lat		= false,
		lng		= false,
		options = {},
		data	= [];


	var renderMap = function () {

		var projection = d3.geo.mercator()
			.translate([options.width / 2, options.height / 2])
			.scale(700);

		var path = d3.geo.path()
			.projection(projection);

		var svg = d3.select(div).append("svg")
			.attr("width", options.width)
			.attr("height", options.height);

		var pane = svg.append('g')
			.attr("class", "pane");

		var countries = pane.append("g")
			.attr("class", "countries");

		var points = pane.append("g")
			.attr('class', 'points');

		// actual render
		countries.selectAll("path")
			.data(worldData.features)
			.enter()
				.append("path")
				.attr("class", 'country')
				.attr("d", path)
				.attr("id", function (feature) {
					return feature.id;
				});

		// insert all the points
		points.selectAll('circle')
			.data(data)
			.enter()
				.append('circle')
				.attr("transform", function (d) {
					return "translate(" + projection([d.lon, d.lat]) + ")";
				})
				.attr('r', 10)
				.attr('class', 'circle');

	};

	var formatData = function (_data) {
		_data.each(function (latlong) {
			data.push({
				lat: latlong.split(',')[0],
				lon: latlong.split(',')[1]
			});
		});
	};



	return { 

		init: function (_div, _data, _options) {
			div = _div.getBody();
			options = _options;

			formatData(_data);

			options.width = div.getWidth();
			options.height = 400;

			renderMap();
		},

		refresh: function (_data) {

		}

	};


});