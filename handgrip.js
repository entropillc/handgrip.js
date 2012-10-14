;'use strict';

/**

*/
var Handgrip = function Handgrip(element) {
  if (!element) return;
  
  var $element = this.$element = $(element);
  element = this.element = $element[0];
  
  var handgrip = element.handgrip;
  if (handgrip) return handgrip;
  
  var self = element.handgrip = this;
  
  var x = window.parseInt($element.attr('data-position-x') || '0', 10);
  var y = window.parseInt($element.attr('data-position-y') || '0', 10);
  
  var position = this._position = { x: x, y: y };
  this.setPosition(position);
  
  var width  = window.parseInt($element.attr('data-size-width')  || '0', 10);
  var height = window.parseInt($element.attr('data-size-height') || '0', 10);
  
  var size = this._size = { width: width, height: height };
  this.setSize(size);
  
  var rotation = window.parseFloat($element.attr('data-rotation') || '0');
  this.setRotation(rotation);
  
  var $handles = this.$handles = {
    N : $('<div contenteditable="false" class="hg-handle hg-handle-n"/>' ).appendTo($element),
    NE: $('<div contenteditable="false" class="hg-handle hg-handle-ne"/>').appendTo($element),
    E : $('<div contenteditable="false" class="hg-handle hg-handle-e"/>' ).appendTo($element),
    SE: $('<div contenteditable="false" class="hg-handle hg-handle-se"/>').appendTo($element),
    S : $('<div contenteditable="false" class="hg-handle hg-handle-s"/>' ).appendTo($element),
    SW: $('<div contenteditable="false" class="hg-handle hg-handle-sw"/>').appendTo($element),
    W : $('<div contenteditable="false" class="hg-handle hg-handle-w"/>' ).appendTo($element),
    NW: $('<div contenteditable="false" class="hg-handle hg-handle-nw"/>').appendTo($element),
    R:  $('<div contenteditable="false" class="hg-handle hg-handle-r"/>' ).appendTo($element)
  }, handle;
  
  for (var handleType in $handles) {
    handle = $handles[handleType][0];
    handle.handgrip = this;
    handle.handleType = Handgrip.HandleType[handleType];
  }
};

/**
  Event types for Handgrip.
*/
Handgrip.EventType = {
  DidFocusElement: 'Handgrip:DidSetFocus',
  DidBlurElement:  'Handgrip:DidBlurElement'
};

/**

*/
Handgrip.HandleType = { N: 'n', NE: 'ne', E: 'e', SE: 'se', S: 's', SW: 'sw', W: 'w', NW: 'nw', R: 'r' };

Handgrip.activeHandgrip = null;

Handgrip.isTouchSupported = !!('ontouchstart' in window);

Handgrip.vendorPrefix = (function() {
  if ('result' in arguments.callee) return arguments.callee.result;

  var regExp = /^(Moz|Webkit|Khtml|O|ms|Icab)(?=[A-Z])/;
  var script = document.createElement('script');

  for (var prop in script.style) {
    if (regExp.test(prop)) return arguments.callee.result = prop.match(regExp)[0];
  }

  if ('WebkitOpacity' in script.style) return arguments.callee.result = 'Webkit';
  if ('KhtmlOpacity' in script.style) return arguments.callee.result = 'Khtml';

  return arguments.callee.result = '';
})().toLowerCase();

Handgrip.getPositionForEvent = function(evt, identifier) {
  if (evt.type.indexOf('mouse') !== -1) return { x: evt.pageX, y: evt.pageY };
  
  evt = evt.originalEvent;
  
  var touch = (identifier) ? this.getTouchWithIdentifier(evt.touches, identifier) : this.getTouchWithIdentifier(evt.targetTouches);
  return (touch) ? { x: touch.pageX, y: touch.pageY } : { x: -1, y: -1 };
};

Handgrip.getDeltaForPositions = function(positionA, positionB) {
  return { x: positionA.x - positionB.x, y: positionA.y - positionB.y };
};

Handgrip.getTouchWithIdentifier = function(touches, identifier) {
  if (!touches || touches.length === 0) return null;
  if (!identifier) return touches[0];
  
  for (var i = 0, length = touches.length, touch; i < length; i++) {
    if ((touch = touches[i]).identifier === identifier) return touch;
  }
  
  return null;
};

Handgrip.calculateAutoFontSize = function(element, minFontSize, maxFontSize) {
  var $content = $(element);
  var $parent = $content.parent();
  
  var maxHeight = $parent.height() - 36;
  
  minFontSize = minFontSize || 8;
  maxFontSize = maxFontSize || 300;
  
  var originalMinFontSize = minFontSize;
  var originalMaxFontSize = maxFontSize;
  
  $content.css('position', 'relative');
  
  var fontSize;
  
  while (minFontSize < maxFontSize - 1) {
    fontSize = Math.floor((minFontSize + maxFontSize) / 2);
    $content.css('font-size', fontSize + 'px');
    
    if ($content.height() < maxHeight) minFontSize = fontSize;
    else maxFontSize = fontSize;
  }
  
  fontSize = minFontSize;
  
  $content.css({
    'position': '',
    'font-size': fontSize + 'px'
  });
};

Handgrip.prototype = {
  constructor: Handgrip,
  
  element: null,
  $element: null,
  
  $handles: null, // { n: ..., ne: ..., e: ..., se: ..., s: ..., sw: ..., w: ..., nw: ..., r: ... }
  
  _activeHandle: null,
  
  _isMoving: false,
  _isResizing: false,
  _isRotating: false,
  
  _lastMousePosition: null,
  _lastTouchIdentifier: null,
  
  _mouseDownHandler: function(evt) {
    var handgrip = Handgrip.activeHandgrip;
    var $target = $(evt.target);
    
    if ($target.hasClass('hg-handle')) {
      if ($target.hasClass('hg-handle-r'))
        handgrip._isRotating = true;
      else
        handgrip._isResizing = true;
      
      handgrip._activeHandle = evt.target.handleType;
      
      evt.preventDefault();
    }
    
    else if ($target.hasClass('hg-element')) {
      handgrip._isMoving = true;
     
      evt.preventDefault();
    }
    
    handgrip._lastMousePosition = Handgrip.getPositionForEvent(evt);
    handgrip._lastTouchIdentifier = (Handgrip.isTouchSupported) ? evt.originalEvent.targetTouches[0].identifier : null;
    
    var $window = $(window.addEventListener ? window : document.body);
    $window.bind(Handgrip.isTouchSupported ? 'touchmove' : 'mousemove', handgrip._mouseMoveHandler);
    $window.bind(Handgrip.isTouchSupported ? 'touchend'  : 'mouseup'  , handgrip._mouseUpHandler);
  },
  
  _mouseMoveHandler: function(evt) {
    var handgrip = Handgrip.activeHandgrip;
    var isMoving = handgrip._isMoving, isResizing = handgrip._isResizing, isRotating = handgrip._isRotating;
    if (!isMoving && !isResizing && !isRotating) return;
    
    evt.preventDefault();
    
    var offset, size, rotation;
    
    var mousePosition = Handgrip.getPositionForEvent(evt, handgrip._lastTouchIdentifier);
    var mouseDelta = Handgrip.getDeltaForPositions(mousePosition, handgrip._lastMousePosition);
    
    if (isMoving)
      handgrip.addToPosition(mouseDelta);
    
    else if (isResizing) {
      switch (handgrip._activeHandle) {
        case Handgrip.HandleType.N:
          handgrip.addToPosition({ x: 0, y: mouseDelta.y });
          handgrip.addToSize({ width: 0, height: -mouseDelta.y });
          break;
        case Handgrip.HandleType.NE:
          handgrip.addToPosition({ x: 0, y: mouseDelta.y });
          handgrip.addToSize({ width: mouseDelta.x, height: -mouseDelta.y });
          break;
        case Handgrip.HandleType.E:
          handgrip.addToSize({ width: mouseDelta.x, height: 0 });
          break;
        case Handgrip.HandleType.SE:
          handgrip.addToSize({ width: mouseDelta.x, height: mouseDelta.y });
          break;
        case Handgrip.HandleType.S:
          handgrip.addToSize({ width: 0, height: mouseDelta.y });
          break;
        case Handgrip.HandleType.SW:
          handgrip.addToPosition({ x: mouseDelta.x, y: 0 });
          handgrip.addToSize({ width: -mouseDelta.x, height: mouseDelta.y });
          break;
        case Handgrip.HandleType.W:
          handgrip.addToPosition({ x: mouseDelta.x, y: 0 });
          handgrip.addToSize({ width: -mouseDelta.x, height: 0 });
          break;
        case Handgrip.HandleType.NW:
          handgrip.addToPosition({ x: mouseDelta.x, y: mouseDelta.y });
          handgrip.addToSize({ width: -mouseDelta.x, height: -mouseDelta.y });
          break;
      }
    }
    
    else if (isRotating) {
      offset = handgrip.getOffset();
      size = handgrip.getSize();
      
      offset.x += size.width / 2;
      offset.y += size.height / 2;
      
      rotation = ((Math.atan2(mousePosition.y - offset.y, mousePosition.x - offset.x) / Math.PI) * 180) + 90;
      
      handgrip.setRotation(rotation);
    }
    
    handgrip._lastMousePosition = mousePosition;
  },
  
  _mouseUpHandler: function(evt) {
    var handgrip = Handgrip.activeHandgrip;
    handgrip._isMoving = handgrip._isResizing = handgrip._isRotating = false;
    handgrip._activeHandle = null;
    
    var $window = $(window.addEventListener ? window : document.body);
    $window.unbind(Handgrip.isTouchSupported ? 'touchmove' : 'mousemove', handgrip._mouseMoveHandler);
    $window.unbind(Handgrip.isTouchSupported ? 'touchend'  : 'mouseup'  , handgrip._mouseUpHandler);
  },
  
  _focused: false,
  
  /**
  
  */
  getFocused: function() { return this._focused; },
  
  /**
  
  */
  setFocused: function(focused) {
    if (this._focused === focused) return;
    
    var $element = this.$element;
    if ((this._focused = !!focused)) {
      if (Handgrip.activeHandgrip) Handgrip.activeHandgrip.setFocused(false);
      Handgrip.activeHandgrip = this;
      
      $element.addClass('hg-focus');
      $element.bind(Handgrip.isTouchSupported ? 'touchstart' : 'mousedown', this._mouseDownHandler);
    
      $element.trigger($.Event(Handgrip.EventType.DidFocusElement, {
        handgrip: this
      }));
    } else {
      $element.removeClass('hg-focus');
      $element.unbind(Handgrip.isTouchSupported ? 'touchstart' : 'mousedown', this._mouseDownHandler);

      $element.trigger($.Event(Handgrip.EventType.DidBlurElement, {
        handgrip: this
      }));
    }
  },
  
  _position: null, // { x: 0, y: 0 }
  
  /**
  
  */
  getPosition: function() { return this._position; },
  
  /**
  
  */
  getOffset: function() {
    var offset = this.$element.offset();
    return { x: offset.left, y: offset.top };
  },
  
  /**
  
  */
  setPosition: function(positionOrX, y) {
    var position = this._position;
    
    if (y || y === 0) {
      position.x = positionOrX;
      position.y = y;
    } else {
      position.x = positionOrX.x;
      position.y = positionOrX.y;
    }
    
    this.$element.css({
      left: position.x + 'px',
      top:  position.y + 'px'
    });
  },
  
  /**
  
  */
  addToPosition: function(deltaPosition) {
    var position = this._position;
    this.setPosition(position.x + deltaPosition.x, position.y + deltaPosition.y);
  },
  
  _size: null, // { width: 0, height: 0 }
  
  /**
  
  */
  getSize: function() { return this._size; },
  
  /**
  
  */
  setSize: function(sizeOrWidth, height) {
    var size = this._size;
    
    if (height || height === 0) {
      size.width  = sizeOrWidth;
      size.height = height;
    } else {
      size.width  = sizeOrWidth.width;
      size.height = sizeOrWidth.height;
    }
    
    size.width  = (size.width  > 0) ? size.width  : 0;
    size.height = (size.height > 0) ? size.height : 0;
    
    var $element = this.$element;
    $element.css({
      width:  size.width  + 'px',
      height: size.height + 'px'
    });
    
    var $content = $element.children('.hg-content').first();
    var autoFontSize = $content.attr('data-auto-font-size');
    if (autoFontSize && (autoFontSize + '').toLowerCase() !== 'false') Handgrip.calculateAutoFontSize($content);
  },
  
  /**
  
  */
  addToSize: function(deltaSize) {
    var size = this._size;
    this.setSize(size.width + deltaSize.width, size.height + deltaSize.height);
  },
  
  _rotation: 0,
  
  /**
  
  */
  getRotation: function() { return this._rotation; },
  
  /**
  
  */
  setRotation: function(rotation) {
    this._rotation = rotation;
    
    var styles = {};
    styles['-' + Handgrip.vendorPrefix + '-transform'] = styles['transform'] = 'rotate(' + rotation + 'deg)';
    
    this.$element.css(styles);
  },
  
  /**
  
  */
  addToRotation: function(deltaRotation) {
    var rotation = this._rotation;
    this.setRotation(rotation + deltaRotation);
  },
  
  /**
  
  */
  getRect: function() {
    var position = this.getPosition();
    var size = this.getSize();
    
    return { x: position.x, y: position.y, width: size.width, height: size.height };
  },
  
  /**
  
  */
  getHtml: function() { return $('<div/>').append(this.$element.children('.hg-content').first().clone()).html(); }
};

$(function() {
  $('.hg-element').each(function(index, element) { new Handgrip(element); });
  
  // Handle mouse/touch events globally to reduce the overall number of event listeners.
  var $body = $(document.body);
  $body.bind(Handgrip.isTouchSupported ? 'touchstart' : 'mousedown', function(evt) {
    $('.hg-focus').each(function(index, element) {
      var handgrip = element.handgrip;
      if (handgrip) handgrip.setFocused(false);
    });
    
    Handgrip.activeHandgrip = null;
  });
  
  $body.delegate('.hg-element', Handgrip.isTouchSupported ? 'touchstart' : 'mousedown', function(evt) {
    var handgrip = this.handgrip;
    if (!handgrip) return;
    
    evt.stopImmediatePropagation();
    
    handgrip.setFocused(true);
  });
  
  // Handle auto-font-sizing globally to reduce the overall number of event listeners.
  $body.delegate('.hg-content[data-auto-font-size="true"]', 'keypress', function(evt) {
    Handgrip.calculateAutoFontSize(this);
  });
  
  $('.hg-content[data-auto-font-size="true"]').each(function(index, element) {
    Handgrip.calculateAutoFontSize(element);
  });
});
