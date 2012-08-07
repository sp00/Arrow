/*jshint
  forin:true, noarg:true, noempty:false, eqeqeq:true, bitwise:true, strict:true,
  undef:true, curly:true, browser:true, indent:4, maxerr:50, prototypejs:true*/

/*
* The available dialog box
*/
var Available = (function () {

	'use strict';

	var button		= $$('#available h2').first(),
		list		= $('list'),
		available	= $('available');

	/*
	* Create a new entty in the available box
	*
	* @param widget, the Widget we are hiding
	*/
	var create = function (widget) {

		var li = new Element('li').update(widget.getName());

		li.observe('click', function (event) {
			var element = Event.element(event);
			element.remove();
			widget.show();
		});

		list.appendChild(li);
	};

	/*
	* Hide a widget
	*
	* @param Prototype type fire event from removing the widget
	*/
	var widgetHide = function (event) {

		if (!available.visible()) {
			available.addClassName('enter');
			available.show();
		}

		setTimeout(function () {
			available.removeClassName('enter');
		}, 500);

		create(event.memo);
	};

	var widgetShow = function (event) {

		if (list.childNodes.length != 0) {
			return;
		}

		available.addClassName('exit');

		setTimeout(function () {
			available.removeClassName('exit');
			available.hide();
		}, 500);

	};

	// bind the events
	$(document).observe('dashboard:widgethide', widgetHide);
	$(document).observe('dashboard:widgetshow', widgetShow);
	button.observe('click', function () {
		list.toggle();
	});
});