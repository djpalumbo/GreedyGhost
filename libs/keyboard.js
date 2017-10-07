window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);


var Key =
  {
    _pressed: {},

    SPACE      : 32,
    LEFTARROW  : 37,
    RIGHTARROW : 39,
    A          : 65,
    D          : 68,
    H          : 72,
    M          : 77,
    S          : 83,
    W          : 87,

    isDown: function(keyCode) {
      return this._pressed[keyCode];
    },

    onKeydown: function(event) {
      this._pressed[event.keyCode] = true;
    },

    onKeyup: function(event) {
      delete this._pressed[event.keyCode];
    }
  };

