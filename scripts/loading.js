/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true*/

var Loading = (function () {

	'use strict';

	var waiting		= false,
		progress	= false,
		bar			= false,
		status		= false;

	/*
	* Create the loading box and append it to the body
	*/
	var create = function () {

		// dom elements
		waiting		= new Element('div', {'id': 'waiting'}),
		progress	= new Element('div', {'class': 'progress'}),
		bar			= new Element('div', {'class': 'bar'}),
		status		= new Element('span');

		waiting.appendChild(status);
		waiting.appendChild(progress);
		progress.appendChild(bar);

		document.body.appendChild(waiting);
	}

	return {

		/*
		* Start the loading wait messages
		*/
		start: function () {
			create();
		},

		/*
		* Update the progress bar
		*
		* @param Progress int (0-100)
		*/
		update: function (progress) {
			progress >= 100 ? waiting.hide() : waiting.show();
			bar.setStyle({'width': progress + '%'});
		},

		/*
		* Update the progress bar message
		*/
		updateMessage: function (message) {
			status.update(message);
		},

		/*
		* Remove the big loading bar and move to the bottom left. This is
		* useful for when we have enough data to render but haven't completed
		* loading the data yet
		*/
		minimise: function () {
			waiting.addClassName('small');
		}
	}
})();