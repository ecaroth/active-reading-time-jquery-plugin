/* Version 1.0.0 active-reading-time (https://github.com/ecaroth/active-reading-time-jquery-plugin), Authored by Evan Carothers (https://github.com/ecaroth) */

"use strict";

(function ($) {

    var activeReadingTime = function activeReadingTime($el, options, isMobile) {

        var utils = function () {

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

            function getTextNodeOffset(node, scrollY) {
                var range = document.createRange();
                range.selectNode(node);
                var rect = range.getBoundingClientRect(),
                    top = rect.top + scrollY,
                    bottom = rect.bottom + scrollY;
                range.detach(); 
                return { top: top, bottom: bottom };
            }

            return {
                throttle: throttle,
                getTextNodeOffset: getTextNodeOffset
            };
        }();

        var page = function () {

            var page = {
                windowHeight: null, 
                documentHeight: null, 
                yTopStart: null, 
                yVizStop: null, 
                readLineStart: null, 
                readLineStop: null 
            };

            function setPageData() {
                page.windowHeight = $(window).height();
                page.documentHeight = $(document).height();
                page.readLineStart = $el.offset().top;
                page.readLineStop = page.readLineStart + $el.height();
                page.yTopStart = Math.max(page.readLineStart - options.topMargin, 0);
                page.yVizStop = Math.min(page.readLineStop + options.bottomMargin, $(document).height());

                $('#readlineStart').css('top', page.readLineStart + 'px'); 
                $('#readlineStop').css('top', page.readLineStop + 'px'); 
                $('#vizStart').css('top', page.yTopStart + 'px'); 
                $('#vizStop').css('top', page.yVizStop + 'px'); 
            }

            return {
                setPageData: setPageData,
                getPageData: function getPageData() {
                    return page;
                }
            };
        }();

        var UI = function () {

            var FADE_WAIT_MS = 1500,
            SCROLL_THROTTLE_MS = 50; 

            var $flag = null,
            flagShown = false,
            fadeTMO = null,
            flagHeight = null; 

            function hideFlag() {
                var _this2 = this;

                if (!flagShown) return;

                $flag.fadeOut(500, function () {
                    $(_this2).addClass('art-hide');
                });

                flagShown = false;
            }

            function showFlag() {
                var _this3 = this;

                if (flagShown) return;

                $flag.fadeIn(500, function () {
                    $(_this3).removeClass('art-hide');
                });

                flagShown = true;
            }

            var throttledOnScroll = utils.throttle(function () {
                readTime.updateView(true);
            }, SCROLL_THROTTLE_MS);

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
                showFlag: showFlag,
                hideFlag: hideFlag,
                removeFlag: removeFlag,
                drawFlagAndBindEventListeners: function drawFlagAndBindEventListeners() {
                    $flag = $("<div/>").attr("id", "ativeReadingTimeFlag").append($('<div/>').append($("<b/>").text("5m40s left")).append($("<span/>")));
                    $('body').append($flag);
                    flagHeight = $flag.height(); 

                    $(window).on('resize.active-reading-time', updateOnResize); 
                    $(window).on('scroll.active-reading-time', throttledOnScroll); 
                    $flag.on('click.active-reading-time', removeFlag); 
                },
                setFlagPosition: function setFlagPosition(top) {
                    $flag.css('top', top + "px");
                    clearTimeout(fadeTMO);
                    fadeTMO = setTimeout(hideFlag, FADE_WAIT_MS);
                },
                getFlagHeight: function getFlagHeight() {
                    return flagHeight;
                },
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

        var readTime = function () {

            var READ_SPEED_COOKIE_NAME = 'activeReadTimeWPM',
            READ_SPEED_COOKIE_DAYS = 30,
            TIME_UPDATE_THROTTLE_MS = 800,
            READ_TIME_CALC_INTERVAL = 5000; 

            var READ_TIME_CALC_TOLERANCES = { 
                minWordsPerMin: 20, 
                maxWordsPerMin: 1200, 
                maxScrollDistance: 1800 
            };

            var data = {
                readLineYPos: null, 
                readLineMaxPercentage: null, 
                readLinePercentage: null, 
                readSpeedWordsPerMin: parseFloat( 
                monster.get(READ_SPEED_COOKIE_NAME) || options.defaultWordsPerMinute),
                doneReading: false, 
                textNodes: [], 
                lastScrollY: $(window).scrollTop(), 
                lastRemainingWords: null, 
                recalcReadSpeedTMO: null 
            };

            function _updateRecalculateReadSpeed() {
                var curScrollPos = $(window).scrollTop(),
                    remainingWords = _calculateRemainingWords(),
                    scrollDist = curScrollPos - data.lastScrollY,
                    now = new Date().getTime();

                if (data.lastRemainingWords > 0 && scrollDist > 0 && scrollDist <= READ_TIME_CALC_TOLERANCES.maxScrollDistance) {
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

            function _setReadspead(wordsPerMin) {
                $('#readSpeed b').text(wordsPerMin); 
                data.readSpeedWordsPerMin = wordsPerMin;
                monster.set(READ_SPEED_COOKIE_NAME, wordsPerMin, READ_SPEED_COOKIE_DAYS);
            }

            var _page = function _page() {
                return page.getPageData();
            };

            function _recurseThroughTextNodesAndBuildLines(node, scrollY) {
                if (node.nodeName === '#text') {
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
                    $(node).contents().each(function (ind, el) {
                        _recurseThroughTextNodesAndBuildLines(el, scrollY);
                    });
                }
            }

            function _updateRemainingTime() {
                var remainingWords = _calculateRemainingWords(),
                    secondsLeft = Math.floor(remainingWords / (data.readSpeedWordsPerMin / 60));

                UI.updateText(secondsLeft);
                return remainingWords;
            }

            var _updateRemainingTimeThrottled = utils.throttle(_updateRemainingTime, TIME_UPDATE_THROTTLE_MS);

            function _calculateRemainingWords() {
                var remainingWords = 0,
                    hitFirst = false;

                data.textNodes.forEach(function (node) {
                    if (data.readLineYPos <= node.bottom) {
                        if (data.readLineYPos >= node.top && !hitFirst) {
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

            function _calculateReadLineAndPercentage(curScrollPos) {

                var minY = Math.max(0, _page().yTopStart),
                    maxY = _page().yVizStop - _page().windowHeight;

                if (curScrollPos < minY) {
                    UI.hideFlag();
                } else if (curScrollPos > maxY) {
                    UI.hideFlag();
                } else {
                    UI.showFlag();
                }

                data.readLinePercentage = Math.max(0, Math.min(1, (curScrollPos - minY) * 100 / (maxY - minY) / 100));

                data.readLineYPos = _page().readLineStart + data.readLinePercentage * (_page().readLineStop - _page().readLineStart);

                $('#readline').css('top', data.readLineYPos + 'px'); 

                if (data.readLinePercentage > data.readLineMaxPercentage) {
                    data.readLineMaxPercentage = data.readLinePercentage;
                    $('#readlineMax').css('top', data.readLineYPos + 'px'); 
                }
            }

            function updateView(calledFromScroll) {
                var curScrollPos = $(window).scrollTop();

                _calculateReadLineAndPercentage(curScrollPos);

                var remainingWords = calledFromScroll ? _updateRemainingTimeThrottled() : _updateRemainingTime();

                var maxYPos = _page().documentHeight - _page().windowHeight,
                    scrollPerc = (curScrollPos - 0) * 100 / maxYPos / 100;

                var flagTop = Math.max(0, scrollPerc * _page().windowHeight - UI.getFlagHeight() / 2);
                flagTop = Math.min(flagTop, _page().windowHeight - UI.getFlagHeight());

                UI.setFlagPosition(flagTop);
            }

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

        UI.drawFlagAndBindEventListeners();

        page.setPageData();

        readTime.buildTextNodeListAndUpdateView();
    };

    $.fn.activeReadingTime = function (options) {

        if (isMobileOrTablet) return this;

        options = $.extend({
            topMargin: 40,
            bottomMargin: 40,
            defaultWordsPerMinute: 200,
            minutesOnly: false
        }, options || {});

        var _art = activeReadingTime($(this), options);

        return this;
    };

    var isMobileOrTablet = function (a) {
        return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))
        );
    }(navigator.userAgent || navigator.vendor || window.opera);
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
})(jQuery);