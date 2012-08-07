/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true*/
/*globals
  Cookie*/


var Login = (function () {

	'use strict';

	var callback	= false,
		apikey		= false,
		username	= false,
		hash		= false,
		remember	= false,
		fileList    = false,
		cookieName	= 'vespa';

	// signin the user
	var signin = function (event) {

		if (event) {
			// stop the event
			event.stop();
		}

		// fetch the values out of the form
		username	= $F('username');
		apikey		= $F('apikey');
		hash		= $F('hash');
		remember	= $F('remember');

		if (remember === 'on') {
			// save the cookie
			Cookie.create(cookieName, [apikey, username].join('-'), 7);
		}

		// call the callback with the details
		callback(username, apikey, hash, fileList);
	};

	return {

		// start the login
		init: function (_callback) {

			var contents = Cookie.read(cookieName);

			callback = _callback;

			if (contents) {
				// if we have data populate the form
				contents = contents.split('-');
				$('apikey').value = contents[0];
				$('username').value = contents[1];
			}

			// watch for the submit button
			$('signin').observe('submit', signin);

			// watch for file uploads
			$('upload').observe('change', function(event) {
				fileList = event.target.files;
				signin();
			});

			$('fileSelect').observe('click', function() {
				$('upload').click();
			});
		}
	};
})();