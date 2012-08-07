/**
 * <h2>Example</h2>
 *
 * We need to call two functions to start this off
 *
 * The first is DataSift.connect, which we can pass the username and API key,
 * this will instanitate the DataSift object
 *
 * DataSift.connect(false, false);
 *
 * Secondly we need to register hashes and callback to the function
 *
 * 	DataSift.register('e4941c3a0b4a905314ce806dea26e0d7', {
 *		onMessage: function(data) {console.log(data);}
 *	});
 *
 */
(function() {

	window.DataSiftGoogleLoaded = function(){
		window.DataSift.googleLoadedCallbacks.forEach(function(callback){
			callback(true);
		});
	}

	window.DataSift = {

		username: null,
		apikey: null,
		host:null,
		options: {},
		storage: {},
		storageMax: 50,
		googleLoadedState: 0, //0 -> not loaded, 1 -> loading, 2 -> loaded
		googleLoadedCallbacks: [],
		jsonpStarted: false,
		jsonpConnected: false,

		wsTimeoutTimer: null,
		wsTimeoutCount:0,
		wsTimeoutMax: 2,
		wsCloseCount:0,
		wsCloseMax: 5,
		wsConnected: false,
		wsConnectCallbacks: [],

		/**
		 * Dynamically load Google API's
		 *
		 * @param callback Function. A function that will be called when the library is loaded
		 */
		loadGoogleApis: function(callback){
			if (this.googleLoadedState == 0) {

				// Put into loading state
				this.googleLoadedState == 1;

				var script = document.createElement("script");
				script.src = "http://www.google.com/jsapi?callback=window.DataSiftGoogleLoaded";
				script.type = "text/javascript";
				document.getElementsByTagName("head")[0].appendChild(script);
				if (typeof callback == "function") {
					this.googleLoadedCallbacks.push(callback);
				}

			} else if (this.googleLoadedState == 1) {
				// Loading
				if (typeof callback == "function") {
					this.googleLoadedCallbacks.push(callback);
				}

			} else {
				// Loaded
				if (typeof callback == "function") {
					callback(true);
				}
			}
		},

		/**
		 * Check to see if websockets is supported
		 */
		websocketSupported: function() {

			if ("WebSocket" in window) {
				//Standard support
				return true;
			} else if ("MozWebSocket" in window) {
				//Firefox implementation
				return true;
			} else {
				//No support
				return false;
			}
		},


		/**
		 * Start a new DS connection
		 *
		 * @param username(string): username
		 * @param apikey(string): apikey of the user
		 * @param endpoint An alternative endpoint to use. defaults to stream.ds
		 */
		connect: function(username, apikey, host) {

			// check to see if it already exsits
			if (window.Datasift) {
				return;
			} else {
				window.Datasift = {};
			}

			this.username = username;
			this.apikey = apikey;
			this.host = host;

			//Use websockets if supported
			if (this.websocketSupported()) {
				host = host ? 'ws://' + host : false;
				this.websocket(host);
			} else {
				// JSONP start the timer
				this.jsonp();
			}
		},

		/**
		 * Register a new set of callback for DS
		 *
		 * @param hash(string): The hash of the stream
		 * @param options(object):
		 *		onOpen(function): What to do when we open a connection
		 *		onMessage(function): What to do when we recieve a message
		 *		onError(function): What to do when we error
		 */
		register: function(hash, options) {

			// register the callback options
			options.onOpen = options.onOpen ? options.onOpen : function() {};
			options.onMessage = options.onMessage ? options.onMessage : function() {};
			options.onError = options.onError ? options.onError : function(data) {this.error(data);}.bind(this);
			options.onClose = options.onClose ? options.onClose : function() {};

			// do we already have this hash
			if (!window.Datasift[hash]) {
				window.Datasift[hash] = {
					data: function(data) {
						//If we have a stream then break it up and distribute
						if (data.stream !== undefined) {
							if (!this.jsonpConnected) {
								this.jsonpConnected = true;
								this.broadcast('Open');
							}

							data.stream.forEach(function(d){
								this.broadcast('Message', {hash: hash, data: d});
								window.Datasift[hash].lastInteractionId = d.interaction.id;
							}.bind(this));
						} else {
							this.distribute(data, hash)
						}


					}.bind(this),
					callbacks: new Array()
				};
			}

			// push the callbacks onto the hash
			window.Datasift[hash].callbacks.push(options);

		},

		isJSON: function(str) {
			if (str.length == 0) return false;
			str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
			str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
			str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
			return (/^[\],:{}\s]*$/).test(str);
		},

		/**
		 * Attempt to evaulate the JSON, this will first attempt to sanitize
		 * the script before evaluating it.
		 *
		 * @params data The string you want to parse
		 */
		evalJSON: function(data) {
			var json = data.replace(/^\/\*-secure-([\s\S]*)\*\/\s*$/, '$1');
			cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

			if (cx.test(json)) {
				json = json.replace(cx, function (a) {
					return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
				});
			}

			try {
				if (!data || this.isJSON(json)) return eval('(' + json + ')');
			} catch (e) { }
			throw('Badly formed JSON string');
		},

		/**
		 * Start a new websocket call
		 *
		 * @throws If the browser doesn't support websockets
		 *
		 * @TODO Need to add support for firefox websockets
		 */
		websocket: function(endpoint) {
			if (window['WebSocket'] == undefined && window['MozWebSocket'] == undefined) {
				throw 'Websocket not implemented in this browser';
			}
			var url = endpoint;
			if (url == undefined || !url){
				url = 'ws://websocket.datasift.com';
			}

			if (this.username && this.apikey) {
				url += '/?username=' + this.username + '&api_key=' + this.apikey;
			}

			try {
				this.socket = new WebSocket(url);
			} catch (e) {
				this.socket = new MozWebSocket(url);
			}

			//Start the timeout timer
			this.wsTimeoutTimer = setTimeout(function() {
				this.wsTimeoutCount++;

				//Try to close
				try {
					this.socket.onopen = null;
					this.socket.onmessage = null;
					this.socket.onclose = null;
					this.socket.onerror = null;

					//If open or connecting we can close
					this.socket.close();
				} catch (e) {}

				//Clear timer
				clearTimeout(this.wsTimeoutTimer);
				this.wsTimeoutTimer = null;

				//Check if we are over the limit
				if (this.wsTimeoutCount > this.wsTimeoutMax) {
					//Close and go to JSONP
					console.log("WebSocket connection timed out " + this.wsTimeoutMax + " times. Falling back to JSONP");
					//Call the callbacks telling them they have not got a ws connection
					this.wsConnectCallbacks.each(function(cb){
						cb(false);
					}.bind(this));
					this.jsonp();
				} else {
					//Reconnect
					console.log("WebSocket connection timed out. Retrying WebSocket");
					this.websocket(endpoint);
				}

			}.bind(this), 1000);

			//When the socket is open
			this.socket.onopen = function(data) {
				this.wsConnected = true;
				//Clear the timeout timer
				clearTimeout(this.wsTimeoutTimer);
				this.wsTimeoutTimer = null;

				//Call the callbacks telling them they have not got a ws connection
				this.wsConnectCallbacks.forEach(function(cb){
					cb(true);
				}.bind(this));

				//Broadcast the open message
				this.broadcast('Open', data);

				// subscribe all registered hashes to the datasift service AKA multi stream
				this.subscribe();

			}.bind(this);

			this.socket.onmessage = function(data) {
				this.broadcast('Message', this.evalJSON(data.data));
			}.bind(this);

			this.socket.onerror = function(data) {
				this.wsConnected = false;
				this.broadcast('Error', data);
				this.connectionCount++;
			}.bind(this);

			this.socket.onclose=function(data) {
				this.wsConnected = false;
				//Clear the timeout timer
				clearTimeout(this.wsTimeoutTimer);
				this.wsTimeoutTimer = null;

				//If we have closed too many times then fallback to JSONP
				//Start the timeout timer
				this.wsCloseCount++;

				//Check if we are over the limit
				if (this.wsCloseCount > this.wsCloseMax) {
					//Close and go to JSONP
					console.log("WebSocket connection closed " + this.wsCloseMax + " times. Falling back to JSONP");
					this.wsConnectCallbacks.forEach(function(cb){
						cb(false);
					}.bind(this));
					this.jsonp();
				} else {
					//Reconnect
					console.log("WebSocket connection closed. Retrying.");
					//Wait a second before trying
					setTimeout(function(){
						this.websocket(endpoint);
					}.bind(this), 500);
				}

				//Broadcast close
				this.broadcast('Close', data);
				this.connectionCount++;
			}.bind(this);

		},

		/**
		 * Jsonp call, this will create the script tag on the page, with a id
		 * related to the hash of the stream
		 */
		jsonp: function() {
			this.jsonpStarted = true;

			for (hash in window.Datasift) {
					if (window.Datasift[hash].pollCount === undefined) {
						window.Datasift[hash].pollCount = 0;
					}
					window.Datasift[hash].pollCount++;

					var script = document.createElement('script');
					//Count set to 20 as anymore will get dropped from the queue
					//Random number used to stop the browser caching the result
					//Interaction ID set to make sure old data is not re-displayed
					script.src = 'http://api.datasift.com/stream.jsonp?username=' + this.username + '&api_key=' + this.apikey + '&hash=' + hash + '&count=200&callback=window.Datasift[\'' + hash + '\'].data' + (window.Datasift[hash].lastInteractionId !== undefined ? '&interaction_id=' + window.Datasift[hash].lastInteractionId : '') + '&random=' + Math.random() ;
					script.id = 'ds-' + hash;
					document.body.appendChild(script);

					if (window.Datasift[hash].pollCount == 1) {
						this.broadcast('Open');
					}
			}

			setTimeout(function() {
				this.jsonp();
			}.bind(this), 5000);
		},

		/**
		 * Once we recieve the data from the stream we need to destroy the tags
		 *
		 * @param data(object): The data we recieve
		 * @param hash(string): The hash of the stream
		 */
		distribute: function(data, hash) {
			// remove the scripts
			var script = document.getElementById('ds-' + hash);
			script.parentNode.removeChild(script);

			if (data.error !== undefined) {
				this.broadcast('Error', data, hash);
			} else {
				this.broadcast('Message', data, hash);
			}
		},

		/**
		 * Broadcast to all the binded apps that we have recieved an action for
		 * them. It is then up to the specific apps to handle that message. They
		 * will recieve notifications of:
		 *		- Message Recieved
		 *		- Connection Opened
		 *		- Connection Closed
		 *		- Error Recieved
		 *
		 * @params data(object): The data to send
		 * @params hash(string): The string to send
		 */
		broadcast: function(action, data, h) {
			// warning, failure
			if (data && data.status && (data.status == 'warning' || data.status == 'failure')) {
				action = 'Error';
			}

			if (action == 'Error' && typeof data !== 'string') {
				//Data should be a string
				if (data.error !== undefined) {
					data.message = data.error;
				} else if (data.warning !== undefined) {
					data.message = data.warning;
				}
			}

			if(!h){
				for (hash in window.Datasift){
					var l = window.Datasift[hash].callbacks.length;
					for (var i = 0; i < l; i++) {
						window.Datasift[hash].callbacks[i]['on' + action](data);
					}
				}
			} else {
				var l = window.Datasift[h].callbacks.length;
				for (var i = 0; i < l; i++) {
					window.Datasift[h].callbacks[i]['on' + action](data);
				}
			}
		},

		/**
		 * Even if the subscribers call register we can't actually regiser them
		 * with the datasift service until the onopen even occurs otherwise we'll
		 * get an invalid state exception so this is invoked automatically after broadcasting
		 * the onopen event
		 */
		subscribe:function(){
			for (var hash in window.Datasift){
				var msg = '{ "action":"subscribe", "hash":"'+hash+'", "token":"d39j2vyur9832"}';
				this.socket.send(msg);
			}
		},

		/**
		 * Even if the subscribers call register we can't actually regiser them
		 * with the datasift service until the onopen even occurs otherwise we'll
		 * get an invalid state exception so this is invoked automatically after broadcasting
		 * the onopen event
		 */
		unsubscribe:function(){
			for (var hash in window.Datasift){
				var msg = '{ "action":"unsubscribe", "hash":"'+hash+'", "token":"d39j2vyur9832"}';
				this.socket.send(msg);
			}
		},

		/**
		 * Store a message temporarily
		 *
		 * @params data(object): The data to send
		 * @params hash(string): The string to send
		 */
		storeMessage: function(data, h) {
			var hash=h;

			//check the has storage exists
			if (this.storage[hash] === undefined) {
				this.storage[hash] = [];
			}

			//Add new item to the array
			this.storage[hash].push(data);

			//Check the limit is less than storageMax
			if (this.storage[hash].length > this.storageMax) {
				//Remove excess items
				for (var i=0; i< (this.storage[hash].length - this.storageMax); i++)  {
					this.storage[hash].shift();
				}
			}
		},

		error: function(data) {
			if (data.message) {
				//alert(data.message);
			}
		},

		/**
		 * Even if the subscribers call register we can't actually regiser them
		 * with the datasift service until the onopen even occurs otherwise we'll
		 * get an invalid state exception so this is invoked automatically after broadcasting
		 * the onopen event
		 **/
		start:function(){
			var sub = function(wsSuccess){
				for (var hash in window.Datasift){
					if (wsSuccess) {
						var msg = '{ "action":"subscribe", "hash":"'+hash+'", "token":"d39j2vyur9832"}';
						this.socket.send(msg);
					} else {
						//Start JSONP if it isn't already
						if (!this.jsonpStarted) {
							this.jsonp();
						}
					}
				}
			}.bind(this);

			if (this.wsConnected) {
				sub(true);
			} else if (this.jsonpStarted) {
				sub(false);
			} else {
				this.wsConnectCallbacks.push(function(wsSuccess){
					sub(wsSuccess);
				}.bind(this));
			}
		},

		/**
		 * Unsubscribe from the given hash
		 **/
		stop:function(){

			var unsub = function(wsSuccess){

				for (var hash in window.Datasift){
					if (wsSuccess) {
						var msg = '{ "action":"unsubscribe", "hash":"'+hash+'", "token":"d39j2vyur9832"}';
						this.socket.send(msg);
						window.Datasift[hash] = null;
						delete window.Datasift[hash];
					} else {
						//Start JSONP if it isn't already
						window.Datasift[hash] = null;
						delete window.Datasift[hash];
					}
				}

			}.bind(this);

			if (this.wsConnected) {
				unsub(true);
			} else if (this.jsonpStarted) {
				unsub(false);
			} else {
				this.wsConnectCallbacks.push(function(wsSuccess){
					unsub(wsSuccess);
				}.bind(this));
			}

		}
	}

	if (window.DataSiftLoaded !== undefined) {
		window.DataSiftLoaded();
	}
})();
