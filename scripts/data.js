/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true, 
  smarttabs:true*/
/*global DataSift:true, Loading:true, Data:true, Available:true, Login:true,
  Thread:true, Widget:true, Pie:true, CSV:true, Interactions:true, console:true*/

var Data = (function () {

	"use strict";

	var formattedData = {
		'string': {},
		'number': {},
		'latlong': {}
	};

	var blacklist	= [],
		timeData	= {},
		time		= false,
		counter		= 0;

	/*
	* We store strings in a format that represents them as a pie chart, we
	* create a key and append an array counting the number of times a string
	* appears
	*
	* @param key, the current name
	* @param value, the value
	*/
	var storeString = function (key, value) {
		// create the key
		if (!formattedData.string[key]) {
			formattedData.string[key] = {};
		}
		// create the value
		if (!formattedData.string[key][value]) {
			formattedData.string[key][value] = 0;
		}
		// increment
		formattedData.string[key][value] += 1;
	};

	/**
	* Store an integer against a timestamp
	*
	* @param key, the current name
	* @param value, the value
	*/
	var storeInt = function (key, value) {
		if (!formattedData.number[key]) {
			formattedData.number[key] = {};
		}
		if (!formattedData.number[key][time]) {
			formattedData.number[key][time] = 0;
		}
		formattedData.number[key][time] += value;
	};

	/*
	* Store an Lat Long
	*
	* @param key, the current name
	* @param value, the value
	*/
	var storeLatLong = function (key, value) {
		if (!formattedData.latlong[key]) {
			formattedData.latlong[key] = [];
		}
		formattedData.latlong[key].push(value);
	};

	/*
	* Store an Array
	*
	* @param key, the current name
	* @param value, the value
	*/
	var storeArray = function (key, value) {
		// first splice so we only have 10 items
		value.splice(10);

		// store each of them as a string
		value.each(function (item) {
			storeString(key, item);
		});
	};

	/*
	* Some sections of the data are really badly thought through and should be
	* changed, this is where we are doing this
	*
	* @param Data, the data object
	*/
	var fixes = function (data) {

		// demographic.age_range
		if (data && data.demographic && data.demographic.age_range) {
			var start = data.demographic.age_range.start;
			var end = data.demographic.age_range.end;
			data.demographic.age_range = start + '-' + end;
		}

		// fix demographic for CSV
		// 
		

		// compensation when lat and long come through as numbers
		var lat = false,
			lng = false;

		if (data && data.interaction && data.interaction.geo && data.interaction.geo.latitude) {
			lat = data.interaction.geo.latitude;
			lng = data.interaction.geo.longitude;
			data.interaction.geo = lat + ',' + lng;
		}

		if (data && data.twitter && data.twitter.geo && data.twitter.geo.latitude) {
			lat = data.twitter.geo.latitude;
			lng = data.twitter.geo.longitude;
			data.twitter.geo = lat + ',' + lng;
		}

		if (data && data.twitter && data.twitter.retweeted && data.twitter.retweeted.geo) {
			lat = data.twitter.retweeted.geo.latitude;
			lng = data.twitter.retweeted.geo.longtitude;
			data.twitter.geo = lat + ',' + lng;
		}

	};

	return {

		/*
		* Take an interaction object and flatten it, we are taking all the nested
		* objects of objects and converting them into the format of object_object
		* so we can easily count them. This function recurses quite a bit.
		*
		* @param data, data Object
		* @param name, the current name we are on
		*/
		flatten: function (data, name) {

			// fix the data
			fixes(data);

			var copyName = name;

			if ((data && data.interaction && data.interaction.created_at) || data.interaction_created_at) {

				var date = data.interaction_created_at ? data.interaction_created_at : data.interaction.created_at;

				time = new Date(date);
				time.setMilliseconds(0);
				time = time.getTime();

				if (!timeData[time]) {
					timeData[time] = {
						count: 0
					};
				}

				timeData[time].count += 1;
			}

			data = new Hash(data);

			data.each(function (pair) {

				name = name ? name += '_' + pair.key : pair.key;

				if (blacklist.indexOf(name) !== -1) {
					name = copyName;
					return;
				}

				
				// if it grows too large, remove it but only for strings
				if (formattedData.string[name] && Object.keys(formattedData.string[name]).length > 500) {
					blacklist.push(name);
					delete(formattedData.string[name]);
					name = copyName;
					return;
				}


				// comparisons
				if (Object.isString(pair.value)) {

					// is a latlong?
					if (pair.value.match(/^(\-?\d+(\.\d+)?),\s*(\-?\d+(\.\d+)?)$/)) {
						// latlong
						storeLatLong(name, pair.value);
					} else {
						// string
						storeString(name, pair.value);
					}

				} else if (Object.isNumber(pair.value)) {
					// number
					storeInt(name, pair.value);
				} else if (Object.isArray(pair.value)) {
					// array
					storeArray(name, pair.value);
				} else {
					this.flatten(pair.value, name);
				}

				name = copyName;

			}.bind(this));
		},

		/*
		* Get all the formatted data in it's current state
		*
		* @return Object of data
		*/
		get: function () {
			return formattedData;
		},

		getTime: function () {
			return timeData;
		}
	};
})();