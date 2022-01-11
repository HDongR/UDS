/**
 * Get event's position from the top-left corner of the dom container
 * @param {Event} ev    event
 * @return {Point}
 * @memberOf DomUtil
 */
 export function getEventContainerPoint(ev, dom) {
    if (!ev) {
        ev = window?.event;
    }
    let domPos = dom.__position;
    //if (!domPos) {
        //domPos = computeDomPosition(dom);
    //}
    // div by scaleX, scaleY to fix #450
    return new Point(
        (ev.clientX - dom.clientLeft) ,
        (ev.clientY - dom.clientTop)
    );
}

/**
 * Adds a event listener to the dom element.
 * @param {HTMLElement} obj     - dom element to listen on
 * @param {String} typeArr      - event types, seperated by space
 * @param {Function} handler    - listener function
 * @param {Object} context      - function context
 * @memberOf DomUtil
 */
 export function addDomEvent(obj, typeArr, handler, context) {
    if (!obj || !obj.addEventListener || !typeArr || !handler) {
        return this;
    }
    const eventHandler = function (e) {
        if (!e) {
            e = window.event;
        }
        handler.call(context || obj, e);
        return;
    };
    const types = typeArr.split(' ');
    for (let i = types.length - 1; i >= 0; i--) {
        const type = types[i];
        if (!type) {
            continue;
        }

        if (!obj['Z__' + type]) {
            obj['Z__' + type] = [];

        }
        const hit = listensDomEvent(obj, type, handler);
        if (hit >= 0) {
            removeDomEvent(obj, type, handler);
        }
        obj['Z__' + type].push({
            callback: eventHandler,
            src: handler
        });
        // https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
        obj.addEventListener(type, eventHandler, { capture: false, passive: false });
        
    }
    return this;
}

/**
 * Removes event listener from a dom element
 * @param {HTMLElement} obj         - dom element
 * @param {String} typeArr          - event types, separated by space
 * @param {Function} handler        - listening function
 * @memberOf DomUtil
 */
export function removeDomEvent(obj, typeArr, handler) {
    function doRemove(type, callback) {
        //mouse wheel in firefox
        if (type === 'mousewheel' && Browser.gecko) {
            type = 'DOMMouseScroll';
        }
        obj.removeEventListener(type, callback, false);
    }
    if (!obj || !obj.removeEventListener || !typeArr) {
        return this;
    }
    const types = typeArr.split(' ');
    for (let i = types.length - 1; i >= 0; i--) {
        const type = types[i];
        if (!type) {
            continue;
        }
        //remove all the listeners if handler is not given.
        if (!handler && obj['Z__' + type]) {
            const handlers = obj['Z__' + type];
            for (let j = 0, jlen = handlers.length; j < jlen; j++) {
                doRemove(handlers[j].callback);
            }
            delete obj['Z__' + type];
            return this;
        }
        const hit = listensDomEvent(obj, type, handler);
        if (hit < 0) {
            return this;
        }
        const hitHandler = obj['Z__' + type][hit];
        doRemove(type, hitHandler.callback);
        obj['Z__' + type].splice(hit, 1);
    }
    return this;
}

/**
 * Check if event type of the dom is listened by the handler
 * @param {HTMLElement} obj     - dom element to check
 * @param {String} typeArr      - event
 * @param {Function} handler    - the listening function
 * @return {Number} - the handler's index in the listener chain, returns -1 if not.
 * @memberOf DomUtil
 */
export function listensDomEvent(obj, type, handler) {
    if (!obj || !obj['Z__' + type] || !handler) {
        return -1;
    }
    const handlers = obj['Z__' + type];
    for (let i = 0, len = handlers.length; i < len; i++) {
        if (handlers[i].src === handler) {
            return i;
        }
    }
    return -1;
}

/**
 * Prevent default behavior of the browser. <br/>
 * preventDefault Cancels the event if it is cancelable, without stopping further propagation of the event.
 * @param {Event} event - browser event
 * @memberOf DomUtil
 */
export function preventDefault(event) {
    if (event.preventDefault) {
        event.preventDefault();
    } else {
        event.returnValue = false;
    }
    return this;
}

/**
 * Stop browser event propagation
 * @param  {Event} e - browser event.
 * @memberOf DomUtil
 */
export function stopPropagation(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    } else {
        e.cancelBubble = true;
    }
    return this;
}

/**
 * Alias for [addDomEvent]{@link DomUtil.addDomEvent}
 * @param {HTMLElement} obj     - dom element to listen on
 * @param {String} typeArr      - event types, seperated by space
 * @param {Function} handler    - listener function
 * @param {Object} context      - function context
 * @static
 * @function
 * @return {DomUtil}
 * @memberOf DomUtil
 */
 export const on = addDomEvent;

 /**
  * Alias for [removeDomEvent]{@link DomUtil.removeDomEvent}
  * @param {HTMLElement} obj         - dom element
  * @param {String} typeArr          - event types, separated by space
  * @param {Function} handler        - listening function
  * @static
  * @function
  * @return {DomUtil}
  * @memberOf DomUtil
  */
 export const off = removeDomEvent;