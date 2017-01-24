"use strict";

(function ($) {

	var activeReadingTime = function activeReadingTime($el, options, isMobile) {
		/* jshint ignore:start */

		//module for general utilities
		var utils = function () {

			//throttle function (pulled from underscore.js lib)
			function throttle(func, wait) {
				var _this = this,
				    _arguments = arguments;

				var context, args, result;
				var timeout = null;
				var previous = 0;
				var later = function later() {
					previous = new Date().getTime();
					timeout = null;
					result = func.apply(context, args);
					if (!timeout) context = args = null;
				};
				return function () {
					var now = new Date().getTime();
					if (!previous) previous = now;
					var remaining = wait - (now - previous);
					context = _this;
					args = _arguments;
					if (remaining <= 0 || remaining > wait) {
						if (timeout) {
							clearTimeout(timeout);
							timeout = null;
						}
						previous = now;
						result = func.apply(context, args);
						if (!timeout) context = args = null;
					} else if (!timeout) {
						timeout = setTimeout(later, remaining);
					}
					return result;
				};
			}

			//get top/bottom position for a text node
			function getTextNodeOffset(node, scrollY) {
				var range = document.createRange();
				range.selectNode(node);
				var rect = range.getBoundingClientRect(),
				    top = rect.top + scrollY,
				    bottom = rect.bottom + scrollY;
				range.detach(); // frees up memory in older browsers
				return { top: top, bottom: bottom };
			}

			return {
				throttle: throttle,
				getTextNodeOffset: getTextNodeOffset
			};
		}();

		//module for working with all the data that defines the page/environment
		var page = function () {

			//data describing view/read window setup, set statically every time window/viewport is resized
			var page = {
				windowHeight: null, // current height of the viewport
				documentHeight: null, // height of the document
				yTopStart: null, // y position to show reading time
				yVizStop: null, // y position visible on screen to hide reading time
				readLineStart: null, // y position of where readline calc will start (top of $el)
				readLineStop: null // y position of where readline calc will stop (bottom of $el)
			};

			function setPageData() {
				page.windowHeight = $(window).height();
				page.documentHeight = $(document).height();
				page.readLineStart = $el.offset().top;
				page.readLineStop = page.readLineStart + $el.height();
				page.yTopStart = Math.max(page.readLineStart - options.topMargin, 0);
				page.yVizStop = Math.min(page.readLineStop + options.bottomMargin, $(document).height());

				//for debugging, draw the start/stop read
				$('#readlineStart').css('top', page.readLineStart + 'px'); /**REM**/
				$('#readlineStop').css('top', page.readLineStop + 'px'); /**REM**/
				$('#vizStart').css('top', page.yTopStart + 'px'); /**REM**/
				$('#vizStop').css('top', page.yVizStop + 'px'); /**REM**/
			}

			return {
				setPageData: setPageData,
				getPageData: function getPageData() {
					return page;
				}
			};
		}();

		//module for working with user interface & event binding
		var UI = function () {

			var FADE_WAIT_MS = 1500,
			    // milliseconds to wait after no scrolling to fade flag
			SCROLL_THROTTLE_MS = 50; //milliseconds to throttle scroll function for

			var $flag = null,
			    // jquery reference to flag to prevent frequet lookups
			flagShown = false,
			    // tmo for waiting to hide flag when user stops scrolling
			fadeTMO = null,
			    // is the flag currently shown?
			flagHeight = null; // height of the div flag element (based on standard or user css)

			//hide the flag (w/ fade then display)
			function hideFlag() {
				var _this2 = this;

				if (!flagShown) return;

				$flag.fadeOut(500, function () {
					$(_this2).addClass('art-hide');
				});

				flagShown = false;
			}

			//show the flag (w/ fade then display)
			function showFlag() {
				var _this3 = this;

				if (flagShown) return;

				$flag.fadeIn(500, function () {
					$(_this3).removeClass('art-hide');
				});

				flagShown = true;
			}

			//debounced scroll function - called at max once every half second
			var throttledOnScroll = utils.throttle(function () {
				readTime.updateView(true);
			}, SCROLL_THROTTLE_MS);

			//remove the flag from the UI & unbind event listeners
			function removeFlag() {
				hideFlag();
				setTimeout(function () {
					$flag.remove();
				}, 500);

				$(window).off('resize.active-reading-time', updateOnResize);
				$(window).off('scroll.active-reading-time', throttledOnScroll);
				$flag.off('click.active-reading-time', removeFlag);
			}

			function updateOnResize() {
				page.setPageData();
				readTime.buildTextNodeListAndUpdateView();
			}

			return {
				//show (fade in) the flag
				showFlag: showFlag,
				//hide (fade out) the flag
				hideFlag: hideFlag,
				//remove the flag from the DOM entirely, and unbind events
				removeFlag: removeFlag,
				//create the flag in the DOM and bind the event listeners
				drawFlagAndBindEventListeners: function drawFlagAndBindEventListeners() {
					$flag = $("<div/>").attr("id", "ativeReadingTimeFlag").append($('<div/>').append($("<b/>").text("5m40s left")).append($("<span/>")));
					$('body').append($flag);
					flagHeight = $flag.height(); //get height (in case user used custom CSS)

					//bind needed event listeners
					$(window).on('resize.active-reading-time', updateOnResize); //on window resize, recalculate/redraw
					$(window).on('scroll.active-reading-time', throttledOnScroll); //update the view information and calculate needed info
					$flag.on('click.active-reading-time', removeFlag); //when user clicks the flag, remove it
				},
				//set the flag CSS top position and setup fade listener
				setFlagPosition: function setFlagPosition(top) {
					$flag.css('top', top + "px");
					//set timeout to see if we need to fade flag
					clearTimeout(fadeTMO);
					fadeTMO = setTimeout(hideFlag, FADE_WAIT_MS);
				},
				//get the height of the flag
				getFlagHeight: function getFlagHeight() {
					return flagHeight;
				},
				//set the text for remaining read time
				updateText: function updateText(secondsLeft) {
					var mins = Math.floor(secondsLeft / 60),
					    minsRounded = Math.round(secondsLeft / 60),
					    secs = secondsLeft % 60;

					var text = mins + "m, " + secs + "s left";
					if (options.minutesOnly) {
						if (minsRounded === 0) {
							text = 'seconds left';
						} else {
							text = minsRounded + " minute" + (minsRounded === 1 ? '' : 's') + " left";
						}
					}

					$flag.find('b').text(text);
				}
			};
		}();

		//module for working with user interface & event binding
		var readTime = function () {

			var READ_SPEED_COOKIE_NAME = 'activeReadTimeWPM',
			    // cookie name for storing updated reading speed
			READ_SPEED_COOKIE_DAYS = 30,
			    // how long to store the read speed cookie
			TIME_UPDATE_THROTTLE_MS = 800,
			    // milliseconds to throttle time (text) update fn
			READ_TIME_CALC_INTERVAL = 5000; // how frequently to update read time

			var READ_TIME_CALC_TOLERANCES = { // tolerances for relistic calculations of scroll/read activity
				minWordsPerMin: 20, // calculation min		
				maxWordsPerMin: 1200, // calculation max
				maxScrollDistance: 1800 // max acceptible scroll distance (to remove jitter scroll)
			};

			//ongoing data used for read speed and completion calculation
			var data = {
				readLineYPos: null, // y position of the calculated readline based on sliding window
				readLineMaxPercentage: null, // Max percentage read line has gotten to
				readLinePercentage: null, // Percentage of the way through the $el that user has read, based on sliding window
				readSpeedWordsPerMin: parseFloat( // reading speed (words per min, float) set by default or cookie
				monster.get(READ_SPEED_COOKIE_NAME) || options.defaultWordsPerMinute),
				doneReading: false, // has the viewer finished reading
				textNodes: [], // text nodes with calculated top offsets
				lastScrollY: $(window).scrollTop(), // Y scroll position as of last scroll interval
				lastRemainingWords: null, // # of remaining words as of last scroll interval
				recalcReadSpeedTMO: null // ref for calculation setTimeout
			};

			//function to handle calculation of reading speed as user reads
			function _updateRecalculateReadSpeed() {
				var curScrollPos = $(window).scrollTop(),
				    remainingWords = _calculateRemainingWords(),
				    scrollDist = curScrollPos - data.lastScrollY,
				    now = new Date().getTime();

				if (data.lastRemainingWords > 0 && scrollDist > 0 && scrollDist <= READ_TIME_CALC_TOLERANCES.maxScrollDistance) {
					//reading forwards & within tolerances
					var words = data.lastRemainingWords - remainingWords,
					    readSpeedSample = 60 / (READ_TIME_CALC_INTERVAL / 1000) * words;

					if (readSpeedSample >= READ_TIME_CALC_TOLERANCES.minWordsPerMin && readSpeedSample <= READ_TIME_CALC_TOLERANCES.maxWordsPerMin) {
						var newReadspeed = Math.floor((data.readSpeedWordsPerMin + readSpeedSample) / 2);
						_setReadspead(newReadspeed);
					}
				}

				data.lastScrollY = curScrollPos;
				data.lastRemainingWords = remainingWords;
			}
			data.recalcReadSpeedTMO = setInterval(_updateRecalculateReadSpeed, READ_TIME_CALC_INTERVAL);

			// Set the read speed locally and in the cookie
			function _setReadspead(wordsPerMin) {
				$('#readSpeed b').text(wordsPerMin); //**REM**/
				data.readSpeedWordsPerMin = wordsPerMin;
				monster.set(READ_SPEED_COOKIE_NAME, wordsPerMin, READ_SPEED_COOKIE_DAYS);
			}

			//accessor for page info
			var _page = function _page() {
				return page.getPageData();
			};

			//recrsively traverse children and mark offsets/words of text nodes for calculcation
			function _recurseThroughTextNodesAndBuildLines(node, scrollY) {
				if (node.nodeName === '#text') {
					//text node, count the words and mark the top offset
					var trimmedVal = node.nodeValue.replace(/(\r\n|\n|\r|)/gm, "").trim();
					if (trimmedVal.length > 0) {
						var offset = utils.getTextNodeOffset(node, scrollY);
						data.textNodes.push({
							top: offset.top,
							bottom: offset.bottom,
							words: trimmedVal.match(/\S+\s*/g).length
						});
					}
				} else {
					//not text node, recurse on children
					$(node).contents().each(function (ind, el) {
						_recurseThroughTextNodesAndBuildLines(el, scrollY);
					});
				}
			}

			//calculate and update remaining time displayed
			function _updateRemainingTime() {
				//determine remaining words & update text
				var remainingWords = _calculateRemainingWords(),
				    secondsLeft = Math.floor(remainingWords / (data.readSpeedWordsPerMin / 60));

				UI.updateText(secondsLeft);
				return remainingWords;
			}

			//throttled function of the one above
			var _updateRemainingTimeThrottled = utils.throttle(_updateRemainingTime, TIME_UPDATE_THROTTLE_MS);

			// calculate the # of remaining words and update UI w/ proper text
			function _calculateRemainingWords() {
				var remainingWords = 0,
				    hitFirst = false;

				data.textNodes.forEach(function (node) {
					if (data.readLineYPos <= node.bottom) {
						if (data.readLineYPos >= node.top && !hitFirst) {
							//partal node, determine # of words read based on scroll %
							var percentReadOfNode = (data.readLineYPos - node.top) * 100 / (node.bottom - node.top) / 100;
							remainingWords += Math.round(node.words - node.words * percentReadOfNode);
							hitFirst = true;
						} else {
							remainingWords += node.words;
						}
					}
				});
				return remainingWords;
			}

			//get the Y position of the current read line based on sliding window
			function _calculateReadLineAndPercentage(curScrollPos) {

				var minY = Math.max(0, _page().yTopStart),
				    maxY = _page().yVizStop - _page().windowHeight;

				if (curScrollPos < minY) {
					//hide, scrolled above start vis
					UI.hideFlag();
				} else if (curScrollPos > maxY) {
					//hide, scrolled below start vis
					UI.hideFlag();
				} else {
					UI.showFlag();
				}

				//calculate current readline percentage
				data.readLinePercentage = Math.max(0, Math.min(1, (curScrollPos - minY) * 100 / (maxY - minY) / 100));

				//calculate the readline position based on percentage from sliding window
				data.readLineYPos = _page().readLineStart + data.readLinePercentage * (_page().readLineStop - _page().readLineStart);

				$('#readline').css('top', data.readLineYPos + 'px'); /**REM**/

				if (data.readLinePercentage > data.readLineMaxPercentage) {
					data.readLineMaxPercentage = data.readLinePercentage;
					$('#readlineMax').css('top', data.readLineYPos + 'px'); /**REM**/
				}
			}

			// Reposition the flag on the page and show/hide if needed
			function updateView(calledFromScroll) {
				var curScrollPos = $(window).scrollTop();

				//recalculate readline position
				_calculateReadLineAndPercentage(curScrollPos);

				//throttle text update if coming from scroll event
				var remainingWords = calledFromScroll ? _updateRemainingTimeThrottled() : _updateRemainingTime();

				//reposition based on current scroll
				var maxYPos = _page().documentHeight - _page().windowHeight,
				    scrollPerc = (curScrollPos - 0) * 100 / maxYPos / 100;

				//calc page top (verify it's not clipping on top of viewport)
				var flagTop = Math.max(0, scrollPerc * _page().windowHeight - UI.getFlagHeight() / 2);
				//verify its not clipping bottom of viewport
				flagTop = Math.min(flagTop, _page().windowHeight - UI.getFlagHeight());

				UI.setFlagPosition(flagTop);
			}

			//recalculate the lines+offsets from text contents then update the view
			function buildTextNodeListAndUpdateView() {
				var scrollY = $(window).scrollTop();
				data.textNodes = [];

				_recurseThroughTextNodesAndBuildLines($el[0], scrollY);

				updateView(false);
			}

			return {
				buildTextNodeListAndUpdateView: buildTextNodeListAndUpdateView,
				updateView: updateView
			};
		}();
		/* jshint ignore:end */

		//draw the initial element
		UI.drawFlagAndBindEventListeners();

		//run unitial calc functions
		page.setPageData();

		//recalculate the lines+offsets from text nodes
		readTime.buildTextNodeListAndUpdateView();
	};

	//define the jquery plugin
	$.fn.activeReadingTime = function (options) {

		//only run if desktop browser
		if (isMobileOrTablet) return this;

		//setup options/defaults
		options = $.extend({
			topMargin: 40,
			bottomMargin: 40,
			defaultWordsPerMinute: 200,
			minutesOnly: false
		}, options || {});

		var _art = activeReadingTime($(this), options);

		// allow jQuery chaining
		return this;
	};

	//include detect mobile & cookie monster
	/* jshint ignore:start */
	//modified from http://detectmobilebrowsers.com/
	var isMobileOrTablet = function (a) {
		return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))
		);
	}(navigator.userAgent || navigator.vendor || window.opera);
	/*!
 * cookie-monster - a simple cookie library
 * v0.3.0
 * https://github.com/jgallen23/cookie-monster
 * copyright Greg Allen 2014
 * MIT License
 */
	var monster = {
		set: function set(name, value, days, path, secure) {
			var date = new Date(),
			    expires = '',
			    type = typeof value,
			    valueToUse = '',
			    secureFlag = '';
			path = path || "/";
			if (days) {
				date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
				expires = "; expires=" + date.toUTCString();
			}
			if (type === "object" && type !== "undefined") {
				if (!("JSON" in window)) throw "Bummer, your browser doesn't support JSON parsing.";
				valueToUse = encodeURIComponent(JSON.stringify({ v: value }));
			} else {
				valueToUse = encodeURIComponent(value);
			}
			if (secure) {
				secureFlag = "; secure";
			}

			document.cookie = name + "=" + valueToUse + expires + "; path=" + path + secureFlag;
		},
		get: function get(name) {
			var nameEQ = name + "=",
			    ca = document.cookie.split(';'),
			    value = '',
			    firstChar = '',
			    parsed = {};
			for (var i = 0; i < ca.length; i++) {
				var c = ca[i];
				while (c.charAt(0) == ' ') {
					c = c.substring(1, c.length);
				}if (c.indexOf(nameEQ) === 0) {
					value = decodeURIComponent(c.substring(nameEQ.length, c.length));
					firstChar = value.substring(0, 1);
					if (firstChar == "{") {
						try {
							parsed = JSON.parse(value);
							if ("v" in parsed) return parsed.v;
						} catch (e) {
							return value;
						}
					}
					if (value == "undefined") return undefined;
					return value;
				}
			}
			return null;
		},
		remove: function remove(name) {
			this.set(name, "", -1);
		},
		increment: function increment(name, days) {
			var value = this.get(name) || 0;
			this.set(name, parseInt(value, 10) + 1, days);
		},
		decrement: function decrement(name, days) {
			var value = this.get(name) || 0;
			this.set(name, parseInt(value, 10) - 1, days);
		}
	};
	/* jshint ignore:end */
})(jQuery);