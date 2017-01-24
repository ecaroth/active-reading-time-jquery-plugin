'use strict';

//module for working with user interface & event binding
const readTime = (() => {

	const READ_SPEED_COOKIE_NAME = 'activeReadTimeWPM', 	// cookie name for storing updated reading speed
		  READ_SPEED_COOKIE_DAYS = 30,						// how long to store the read speed cookie
		  TIME_UPDATE_THROTTLE_MS = 800,					// milliseconds to throttle time (text) update fn
		  READ_TIME_CALC_INTERVAL = 5000;					// how frequently to update read time

    const READ_TIME_CALC_TOLERANCES = {		// tolerances for relistic calculations of scroll/read activity
    	minWordsPerMin:  	20,				// calculation min		
    	maxWordsPerMin: 	1200,			// calculation max
    	maxScrollDistance:  1800			// max acceptible scroll distance (to remove jitter scroll)
    };

	//ongoing data used for read speed and completion calculation
    var data = {
    	readLineYPos: null,					// y position of the calculated readline based on sliding window
    	readLineMaxPercentage: null,		// Max percentage read line has gotten to
    	readLinePercentage: null,			// Percentage of the way through the $el that user has read, based on sliding window
    	readSpeedWordsPerMin: parseFloat( 	// reading speed (words per min, float) set by default or cookie
    		monster.get(READ_SPEED_COOKIE_NAME) || 
    		options.defaultWordsPerMinute
    	),
    	doneReading: false,					// has the viewer finished reading
    	textNodes: [],						// text nodes with calculated top offsets
    	lastScrollY: $(window).scrollTop(),	// Y scroll position as of last scroll interval
    	lastRemainingWords: null,			// # of remaining words as of last scroll interval
    	recalcReadSpeedTMO: null			// ref for calculation setTimeout
    };

	//function to handle calculation of reading speed as user reads
	function _updateRecalculateReadSpeed(){
		var curScrollPos = $(window).scrollTop(),
			remainingWords = _calculateRemainingWords(),
			scrollDist = curScrollPos - data.lastScrollY,
			now = new Date().getTime();

		if(data.lastRemainingWords > 0 && scrollDist > 0 && scrollDist <= READ_TIME_CALC_TOLERANCES.maxScrollDistance){
			//reading forwards & within tolerances
			var words = data.lastRemainingWords - remainingWords,
				readSpeedSample = (60 / (READ_TIME_CALC_INTERVAL/1000)) * words;
			
			if(readSpeedSample >= READ_TIME_CALC_TOLERANCES.minWordsPerMin && readSpeedSample <= READ_TIME_CALC_TOLERANCES.maxWordsPerMin){
				var newReadspeed = Math.floor( (data.readSpeedWordsPerMin + readSpeedSample) / 2 );
				_setReadspead(newReadspeed);
			}
		}

		data.lastScrollY = curScrollPos;	
		data.lastRemainingWords = remainingWords;
	}
	data.recalcReadSpeedTMO = setInterval(_updateRecalculateReadSpeed, READ_TIME_CALC_INTERVAL);


    // Set the read speed locally and in the cookie
	function _setReadspead(wordsPerMin){
		$('#readSpeed b').text(wordsPerMin); //**REM**/
		data.readSpeedWordsPerMin = wordsPerMin;
		monster.set(READ_SPEED_COOKIE_NAME, wordsPerMin, READ_SPEED_COOKIE_DAYS);
	}

    //accessor for page info
    const _page = () => {
    	return page.getPageData();
    };

	//recrsively traverse children and mark offsets/words of text nodes for calculcation
	function _recurseThroughTextNodesAndBuildLines(node, scrollY){
		if(node.nodeName === '#text'){
			//text node, count the words and mark the top offset
			var trimmedVal = node.nodeValue.replace(/(\r\n|\n|\r|)/gm,"").trim();
			if(trimmedVal.length > 0){
				var offset = utils.getTextNodeOffset(node, scrollY);
				data.textNodes.push({
					top: offset.top,
					bottom: offset.bottom,
					words: trimmedVal.match(/\S+\s*/g).length
				});
			}
		}else{
			//not text node, recurse on children
			$(node).contents().each((ind,el) => {
				_recurseThroughTextNodesAndBuildLines(el, scrollY);
			});
		}
	}

	//calculate and update remaining time displayed
	function _updateRemainingTime(){
		//determine remaining words & update text
		var remainingWords = _calculateRemainingWords(),
			secondsLeft = Math.floor( remainingWords / (data.readSpeedWordsPerMin / 60) );

		UI.updateText(secondsLeft);
		return remainingWords;
	}

	//throttled function of the one above
	var _updateRemainingTimeThrottled = utils.throttle( _updateRemainingTime, TIME_UPDATE_THROTTLE_MS );

	// calculate the # of remaining words and update UI w/ proper text
	function _calculateRemainingWords(){
		var remainingWords = 0,
			hitFirst = false;

		data.textNodes.forEach((node) => {
			if(data.readLineYPos <= node.bottom){
				if(data.readLineYPos >= node.top && !hitFirst){
					//partal node, determine # of words read based on scroll %
					var percentReadOfNode = (((data.readLineYPos - node.top) * 100) / (node.bottom - node.top)) / 100;
					remainingWords += Math.round( node.words - (node.words * percentReadOfNode) );
					hitFirst = true;
				}else{
					remainingWords += node.words;
				}
			}
		});
		return remainingWords;
	}

    //get the Y position of the current read line based on sliding window
	function _calculateReadLineAndPercentage(curScrollPos){
	    		
		var minY = Math.max(0, _page().yTopStart),
			maxY = _page().yVizStop - _page().windowHeight;

		if( curScrollPos < minY){
			//hide, scrolled above start vis
			UI.hideFlag();
		}else if(curScrollPos > maxY){
			//hide, scrolled below start vis
			UI.hideFlag();
		}else{
			UI.showFlag();
		}

		//calculate current readline percentage
		data.readLinePercentage = Math.max(0, Math.min(1, (((curScrollPos - minY) * 100) / (maxY - minY)) / 100));
		
		//calculate the readline position based on percentage from sliding window
		data.readLineYPos = _page().readLineStart + (data.readLinePercentage * (_page().readLineStop - _page().readLineStart));
		
		$('#readline').css('top', data.readLineYPos + 'px'); /**REM**/

		if(data.readLinePercentage > data.readLineMaxPercentage){
			data.readLineMaxPercentage = data.readLinePercentage;
			$('#readlineMax').css('top', data.readLineYPos + 'px'); /**REM**/
		}
	}

	// Reposition the flag on the page and show/hide if needed
	function updateView(calledFromScroll){
		var curScrollPos = $(window).scrollTop();

		//recalculate readline position
		_calculateReadLineAndPercentage(curScrollPos);

		//throttle text update if coming from scroll event
		var remainingWords = calledFromScroll ? _updateRemainingTimeThrottled() : _updateRemainingTime();
		
		//reposition based on current scroll
		var maxYPos = (_page().documentHeight-_page().windowHeight),
			scrollPerc = (((curScrollPos - 0) * 100) / maxYPos) / 100;

		//calc page top (verify it's not clipping on top of viewport)
	    var flagTop = Math.max(0, ((scrollPerc * _page().windowHeight) - (UI.getFlagHeight()/2)) );
	    //verify its not clipping bottom of viewport
	    flagTop = Math.min( flagTop, (_page().windowHeight - UI.getFlagHeight()) );

	    UI.setFlagPosition( flagTop );
	}

	//recalculate the lines+offsets from text contents then update the view
    function buildTextNodeListAndUpdateView(){
		var scrollY = $(window).scrollTop();
		data.textNodes = [];

		_recurseThroughTextNodesAndBuildLines($el[0], scrollY);

		updateView(false);
    }

    return {
    	buildTextNodeListAndUpdateView,
    	updateView
    };

})();