/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true*/

/*
* Cookie
*
* Really simple cookie management for JavaScript, taken from Quirksmode
* {http://www.quirksmode.org/js/cookies.html} excellent article on cookies,
* adapted so that it works with jshint.
*/
var Cookie = (function () {

	'use strict';

	return {

		/**
		* Create Cookie
		*
		* Create a new cookie
		*
		* @param name, the name of the cookie
		* @param value, the value of the cookie
		* @param days, the number of days to keep the cookie for
		*/
		create: function (name, value, days) {
			var date	= new Date(),
				expires = '';

			if (days) {
				date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			}
			document.cookie = name + '=' + value + expires + '; path=/';
		},

		/**
		* Read Cookie
		*
		* If the user has the cookie read it
		*
		* @param name, the name of the cookie to read
		* @returns cookie value | NULL
		*/
		read: function (name) {

			var nameEQ	= name + '=',
				ca		= document.cookie.split(';');

			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) === ' ') {
					c = c.substring(1, c.length);
				}
				if (c.indexOf(nameEQ) === 0) {
					return c.substring(nameEQ.length, c.length);
				}
			}

			return null;
		},

		/**
		* Erase a cookie
		*
		* Remove the cookie
		*
		* @param name, the name of the cookie you want to remove
		*/
		erase: function (name) {
			this.create(name, '', -1);
		}
	};
})();