'use strict';

//module for general utilities
const utils = (() => {

    //throttle function (pulled from underscore.js lib)
    function throttle(func, wait){
        var context, args, result;
        var timeout = null;
        var previous = 0;
        var later = () => {
            previous = (new Date().getTime());
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        return () => {
            var now = (new Date().getTime());
            if (!previous) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
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
    function getTextNodeOffset(node, scrollY){
        var range = document.createRange();
        range.selectNode(node);
        var rect = range.getBoundingClientRect(),
            top = rect.top + scrollY,
            bottom = rect.bottom + scrollY;
        range.detach(); // frees up memory in older browsers
        return { top, bottom };
    }

    return {
        throttle,
        getTextNodeOffset
    };

})();