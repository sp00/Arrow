/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true*/

/*
* Create a new widget
*/
var Widget = (function () {

	'use strict';

	var header		= false,
		title		= false,
		remove		= false,
		body		= false,
		widget		= false,
		name		= false,
		overlay		= false,
		key			= false,
		wrap		= false,
		className	= '';

	/*
	* Create a new widget
	*
	* @param Width of the widget
	*/
	var create = function (width) {

		// build the objects
		wrap = new Element('div', {'class': 'wrap'}),
		header = new Element('div', {'class': 'header'}),
		title = new Element('h3'),
		remove = new Element('div', {'class': 'remove'}),
		body = new Element('div', {'class': 'body'}),
		overlay = new Element('div', {'class': 'overlay'}),
		widget = new Element('div', {
			'class': 'widget ' + className
		});

		// format the name
		name = name.replace(/_/g, ' ');
		// ucwords it
		name = name.replace(/^([a-z])|\s+([a-z])/g, function (one) {
			return one.toUpperCase();
		});
		// update the title
		title.update(name);

		// build
		header.appendChild(title);
		header.appendChild(remove);
		wrap.appendChild(header);
		wrap.appendChild(body);
		widget.appendChild(wrap);
		body.appendChild(overlay);
	};

	return {

		/*
		* Create a new widget
		*
		* @param widgetName, the name of the widget
		* @param widgetWidth, the width of the widget
		*/
		init: function (_key, _name, _className) {
			key = _key;
			name = _name;
			className = _className;
			// create
			create();
			// bind events
			remove.observe('click', this.hide.bindAsEventListener(this));
		},

		/*
		* Get the DOM widget element
		*/
		get: function () {
			return widget;
		},

		/*
		* Get the nice name of the widget
		*/
		getName: function () {
			return name;
		},

		/*
		* Get the key name
		*/
		getKey: function () {
			return key;
		},

		/*
		* Get the body of the widget
		*/
		getBody: function () {
			return body;
		},

		/*
		* Set the width of the widget
		*
		* @param width of the widget
		*/
		setWidth: function (widgetWidth) {
			widget.setStyle({'width': widgetWidth + 'px'});
		},

		/*
		* Show the widget
		*/
		show: function () {
			Event.fire(document, 'dashboard:widgetshow', this);
			widget.show();
		},

		/*
		* Hide the widget
		*/
		hide: function () {
			Event.fire(document, 'dashboard:widgethide', this);
			widget.hide();
		},

		/*
		* Remove the widget
		*/
		remove: function () {
			widget.addClassName('deleting');
			setTimeout(function () {
				this.remove();
			}.bind(widget), 2000);
		}
	};
});