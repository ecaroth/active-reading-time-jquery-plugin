'use strict';

(function($){

    const activeReadingTime = ($el, options, isMobile) => {
        /* jshint ignore:start */
        <<MODULE_UTILS_JS>>
        <<MODULE_PAGE_JS>>
        <<MODULE_UI_JS>>
        <<MODULE_READTIME_JS>>
        /* jshint ignore:end */

        //draw the initial element
        UI.drawFlagAndBindEventListeners();

        //run unitial calc functions
        page.setPageData();

        //recalculate the lines+offsets from text nodes
        readTime.buildTextNodeListAndUpdateView();
    };


    //define the jquery plugin
    $.fn.activeReadingTime = function(options){
        
        //only run if desktop browser
        if(isMobileOrTablet) return this;

        //setup options/defaults
        options = $.extend({
            topMargin: 40,
            bottomMargin: 40,
            defaultWordsPerMinute: 200,
            minutesOnly: false
        }, options || {} );

        var _art = activeReadingTime($(this), options);

        // allow jQuery chaining
        return this;
    };

    //include detect mobile & cookie monster
    /* jshint ignore:start */
    <<DETECT_MOBILE_JS>>
    <<COOKIE_MONSTER_JS>>
    /* jshint ignore:end */

})(jQuery);