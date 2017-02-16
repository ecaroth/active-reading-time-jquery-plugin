'use strict';

//module for working with user interface & event binding
const UI = (() => {

    const FADE_WAIT_MS = 1500,      // milliseconds to wait after no scrolling to fade flag
          SCROLL_THROTTLE_MS = 50;  //milliseconds to throttle scroll function for

    let $flag = null,       // jquery reference to flag to prevent frequet lookups
        flagShown = false,  // tmo for waiting to hide flag when user stops scrolling
        fadeTMO = null,     // is the flag currently shown?
        flagHeight = null;  // height of the div flag element (based on standard or user css)
    
    //hide the flag (w/ fade then display)
    function hideFlag(){
        if(!flagShown) return;

        $flag.fadeOut(500, () => {
            $(this).addClass('art-hide');
        });

        flagShown = false;
    }

    //show the flag (w/ fade then display)
    function showFlag(){
        if(flagShown) return;

        $flag.fadeIn(500, () => {
            $(this).removeClass('art-hide');
        });

        flagShown = true;
    }

    //debounced scroll function - called at max once every half second
    var throttledOnScroll = utils.throttle(() => {
        readTime.updateView(true);
    }, SCROLL_THROTTLE_MS );

    //remove the flag from the UI & unbind event listeners
    function removeFlag(){
        hideFlag();
        setTimeout(() => {
            $flag.remove();
        },500);

        $(window).off('resize.active-reading-time', updateOnResize );
        $(window).off('scroll.active-reading-time', throttledOnScroll);
        $flag.off('click.active-reading-time', removeFlag);
    }

    function updateOnResize(){
        page.setPageData();
        readTime.buildTextNodeListAndUpdateView();
    }

    return {
        //show (fade in) the flag
        showFlag,
        //hide (fade out) the flag
        hideFlag,
        //remove the flag from the DOM entirely, and unbind events
        removeFlag,
        //create the flag in the DOM and bind the event listeners
        drawFlagAndBindEventListeners: () => {
            $flag = $("<div/>").attr("id","ativeReadingTimeFlag").append(
                $('<div/>').append(
                    $("<b/>").text("5m40s left")
                ).append(
                    $("<span/>")
                )
            );
            $('body').append($flag);
            flagHeight = $flag.height(); //get height (in case user used custom CSS)

            //bind needed event listeners
            $(window).on('resize.active-reading-time', updateOnResize); //on window resize, recalculate/redraw
                $(window).on('scroll.active-reading-time', throttledOnScroll); //update the view information and calculate needed info
            $flag.on('click.active-reading-time', removeFlag); //when user clicks the flag, remove it
        },
        //set the flag CSS top position and setup fade listener
        setFlagPosition: (top) => {
            $flag.css('top', top + "px");
            //set timeout to see if we need to fade flag
            clearTimeout(fadeTMO);
            fadeTMO = setTimeout(hideFlag, FADE_WAIT_MS);
        },
        //get the height of the flag
        getFlagHeight: () => {
            return flagHeight;
        },
        //set the text for remaining read time
        updateText: (secondsLeft) => {
            var mins = Math.floor(secondsLeft / 60),
                minsRounded = Math.round(secondsLeft / 60),
                secs = secondsLeft % 60;

            var text = mins+"m, "+secs+"s left";
            if(options.minutesOnly){
                if(minsRounded === 0){
                    text = 'seconds left';
                }else{
                    text = minsRounded+" minute"+(minsRounded === 1 ? '' : 's')+" left";
                }
            }

            $flag.find('b').text(text);
        }
    };
})();