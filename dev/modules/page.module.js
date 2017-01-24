'use strict';

//module for working with all the data that defines the page/environment
const page = (() => {

	//data describing view/read window setup, set statically every time window/viewport is resized
	var page = {
		windowHeight: null,				// current height of the viewport
		documentHeight: null,			// height of the document
		yTopStart: null,   				// y position to show reading time
    	yVizStop: null,    				// y position visible on screen to hide reading time
    	readLineStart: null,			// y position of where readline calc will start (top of $el)
    	readLineStop: null				// y position of where readline calc will stop (bottom of $el)
    };
    	
    function setPageData(){
    	page.windowHeight = $(window).height();
		page.documentHeight = $(document).height();
		page.readLineStart = $el.offset().top;
		page.readLineStop = page.readLineStart + $el.height();
		page.yTopStart = Math.max( page.readLineStart - options.topMargin, 0);
		page.yVizStop = Math.min( page.readLineStop + options.bottomMargin, $(document).height() );

		//for debugging, draw the start/stop read
		$('#readlineStart').css('top',page.readLineStart+'px'); /**REM**/
		$('#readlineStop').css('top',page.readLineStop+'px'); /**REM**/
		$('#vizStart').css('top',page.yTopStart+'px'); /**REM**/
		$('#vizStop').css('top',page.yVizStop+'px'); /**REM**/
    }

    return {
    	setPageData,
    	getPageData: () =>{
    		return page;
    	}
    };
})();