/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true, 
  smarttabs:true*/
/*global DataSift:true, Loading:true, Data:true, Available:true, Login:true,
  Thread:true, Widget:true, Pie:true, Map:true, Line:true, CSV:true, Interactions:true, console:true*/

/**
 * VESPA
 *
 * A dashboard to visulise information from DataSift. This project allows you
 * to either use a live stream or an export (either JSON or CSV) and analyse 
 * the results.
 */
var Dashboard = (function () {

	'use strict';

	var objects			= new Hash(),
		charts			= new Hash(),
		widgets			= [],
		width			= false,
		interactions	= false,
		total			= 0;

	/**
	 * Start streaming from DataSift
	 * 
	 * @param  {string} username DataSift Username
	 * @param  {string} apikey   DataSift Api Key
	 * @param  {string} hash     Stream hash
	 */
	var streaming = function (username, apikey, hash) {

		Loading.updateMessage('Connecting to DataSift');
		Loading.update(10);

		// start the stream
		DataSift.connect(username, apikey);
		DataSift.register(hash, {
			'onMessage': onMessage
		});

		var startStreaming = function () {

			var data = Data.get();

			if (Object.keys(data).length > 0) {
				Loading.minimise();
				Loading.update(80);
				build();
				Thread.start(startStreaming, 'startstreaming', 6000);
			} else {
				Loading.updateMessage('Waiting for Interactions ...');
				Thread.start(startStreaming, 'startstreaming', 1000);
			}
		};

		Thread.start(startStreaming, 'startstreaming', 5000);

		var func = function () {
			Loading.updateMessage('Sampling Stream');
			Loading.update(10 + this * 14);
		};

		for (var i = 1; i < 5; i++) {
			Thread.start(func.bindAsEventListener(i), 'counter', i * 1000);
		}
	};
	
	/**
	 * Recieved some data from DataSift
	 * 
	 * @param  {Object} data Interaction object from DataSift
	 */
	var onMessage = function (data) {
		// flatten the data
		Data.flatten(data.data);
		// tell the widgets we have data
		Event.fire(document, 'dashboard:message', data);
		// update the total
		total = total + 1;
	};

	/**
	 * Load in and read a static file
	 * 
	 * @param  {Object} fileList the filelist object
	 */
	var staticfile = function (fileList) {

		// update our loading message
		Loading.updateMessage('Reading File');

		var reader	= new FileReader(),
			type	= fileList[0].type;

		reader.onload = function (evt) {
			staticLoaded(evt, type);
		};

		reader.onprogress = function (evt) {
			// update the progress
			Loading.update(Math.round(((evt.loaded / evt.total) * 100) / 10));
		};
		reader.readAsText(fileList[0]);
	};

	/*
	* Once the static file has been loaded we need to process it all
	*
	* @param FileReader event
	*/
	var staticLoaded = function (event, type) {

		// get the file
		var file				= event.target.result,
			dataArray			= [],
			interactionCount	= 0,
			headings			= [];

		// start formatting
		Loading.updateMessage('Formatting File');

		// remove all the line breaks and white space
		dataArray = file.split(/(\r\n|\n|\r)/);
		dataArray = dataArray.filter(function (row) {
			var rg = new RegExp(/^(\r\n|\n|\r)$/);
			return rg.test(row) ? false : true;
		});

		interactionCount = dataArray.length;
		total = interactionCount;

		if (type === 'text/csv') {
			headings = dataArray.shift();
			headings = headings.split(',');
			headings.invoke('replace', /\./g, '_');
		}

		// update progress
		Loading.updateMessage('Processing Data');
		Loading.update(20);

		var counter = 0;
		var totalLength = dataArray.length;

		var processInteraction = function () {

			if (counter % 8 === 0) {
				var length		= dataArray.length;
				var percentage	= Math.floor(((interactionCount - length) / interactionCount) * 100);

				Loading.updateMessage('Processing ' + (interactionCount - length) + ' of ' + interactionCount);
				Loading.update(20 + Math.round(percentage * 0.6));
			}

			var interaction = dataArray.shift();

			try {
				if (type === 'text/csv') {
					// csv
					interaction = processCSV(interaction, headings);
				} else {
					// json
					interaction = interaction.evalJSON();
				}
				// add it to the global data
				Data.flatten(interaction);
			} catch (exp) {}

			// call it again if we have data
			if (counter < totalLength) {
				Thread.start(processInteraction, 'loadStatic');
			} else {
				Loading.updateMessage('Building Charts');
				Loading.minimise();
				build();
			}

			counter++;
		};

		Thread.start(processInteraction, 'loadStatic');

	};

	/*
	* Take a CSV line and run it through our CSV library, this method is ~10 times
	* slower than JSON. We convert to an array and then loop through all the
	* headers to convert it into the correctly flattened object
	*
	* @param row, current row
	* @param header, a list of all the headers
	*/
	var processCSV = function (row, headers) {

		row = CSV.csvToArray(row);
		row = row[0];

		var obj = {};
		// go through each of the headers
		headers.each(function (head, i) {

			if (!row[i]) {
				return;
			}

			var title = head.replace(/\./g, '_');
			obj[title] = row[i];
		});

		return obj;
	};

	/*
	* Take our flattened data and start building the widgets we want to render
	*/
	var build = function () {

		document.body.removeClassName('processing');
		document.body.addClassName('visulise');

		var data			= Data.get(),
			timeData		= Data.getTime(),
			buffer			= [],
			bufferLength	= 0;


		// push the data into the buffer
		for (var type in data) {
			if (data.hasOwnProperty(type)) {
				for (var key in data[type]) {
					if (data[type].hasOwnProperty(key)) {
						buffer.push([type, key, data[type][key]]);
					}
				}
			}
		}
		// cache the buffer length
		bufferLength = buffer.length;

		if (bufferLength > 0) {
			// render the interactions charts
			if (!interactions) {
				interactions = Interactions.init('interactions', timeData);
			} else {
				interactions.update(timeData);
			}
		}

		// calculate which ones should be removed
		widgets.each(function (wid, i) {

			var found = false;

			// do we have this widget
			for (var type in data) {
				if (data.hasOwnProperty(type)) {
					for (var key in data[type]) {
						if (data[type].hasOwnProperty(key)) {
							if (wid.getKey() === key) {
								found = true;
							}
						}
					}
				}
			}

			if (!found) {
				wid.remove();
				widgets.splice(i, 1);
			}
		});

		// render the buffer
		var renderData = function () {

			var length		= buffer.length;
			var percentage	= Math.floor(((bufferLength - length) / bufferLength) * 100);
			// update the progress bar percentage
			Loading.update(80 + Math.ceil(percentage * 0.2));

			var d = buffer.shift();

			// render the items
			render(d[0], d[1], d[2]);

			// if we have some remaining, process the next one
			if (buffer.length > 0) {
				Thread.start(renderData, 'render', 4000 / bufferLength);
			}
		};

		Thread.start(renderData, 'render', 500);
	};

	/*
	* Render the data into widgets
	*
	* @param key, the current key name e.g. interaction_id
	* @param data, the data object we are trying to show
	*/
	var render = function (type, key, data) {

		var dArray	= [],
			totalNumber = 0;

		
		if (type === 'string') {
			// build up the array for D3
			data = new Hash(data);
			data.each(function (pair) {
				dArray.push({
					'label': pair.key,
					'value': pair.value
				});
				totalNumber += pair.value;
			});
			if (totalNumber === 1) {
				return;
			}
		} else if (type === 'latlong') {
			// latlong is already in the correct format
			dArray = data;
		} else if (type === 'number') {
			data = new Hash(data);
			data.each(function (pair) {
				dArray.push({
					'time': new Date(parseInt(pair.key, 10)),
					'value': pair.value
				});
			});

			if (dArray.length <= 2) {
				return;
			}
		}

		// do we already have this object
		if (!charts[key + '_' + type]) {

			var size = 1;

			switch (type) {
			case 'string': 
				size = 1; 
				break;
			case 'latlong': 
				size = 2; 
				break;
			case 'number': 
				size = 2;
				break;
			}

			// create the widget
			var widget = new Widget();
			widget.init(key, key, 'g' + size);
			objects.section.appendChild(widget.get());
			widgets.push(widget);


			if (type === 'string') {
				// create the pie chart
				charts[key + '_' + type] = new Pie();
				charts[key + '_' + type].init(widget, dArray, total, {
					radius: (widget.getBody().getWidth() / 2)
				});
			} else if (type === 'latlong') {
				// create map
				charts[key + '_' + type] = new Map();
				charts[key + '_' + type].init(widget, dArray, {});
			} else if (type === 'number') {
				// create line chart
				charts[key + '_' + type] = new Line();
				charts[key + '_' + type].init(widget, dArray);
			}

		} else {
			charts[key + '_' + type].refresh(dArray, total);
		}
	};

	/*
	* Calculate the width of the widgets
	*/
	var calculateWidth = function () {
		// calculate how many we can fit with the min width
		var screenwidth = document.viewport.getWidth();
		var number = Math.floor((screenwidth - 40) / 440);
		width = (screenwidth - 40) / number - 40 - (2 * number);
		//widgets.invoke('setWidth', width);
	};

	return {

		init: function () {

			// cache the objects, save the DOM requests
			objects.signin = $('signin');
			objects.section = $('grid');
			objects.header = $('header');
			objects.interactions = $('interactions');
			objects.upload = $('upload');

			calculateWidth();
			Event.observe(window, 'resize', calculateWidth);

			// start the login
			Login.init(function (apikey, username, hash, fileList) {
				// finished logging in
				objects.signin.remove();

				document.body.addClassName('processing');

				// start loading
				Loading.start();
				// static or streaming
				if (fileList) {
					staticfile(fileList);
				} else {
					streaming(apikey, username, hash);
				}
			});
		}
	};

})();

$(document).observe('dom:loaded', function () {

	'use strict';

	Dashboard.init();
	new Available();
});

