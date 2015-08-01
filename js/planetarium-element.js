'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var PlanetariumElement = (function (_HTMLDivElement) {
    function PlanetariumElement() {
        _classCallCheck(this, PlanetariumElement);

        _get(Object.getPrototypeOf(PlanetariumElement.prototype), 'constructor', this).apply(this, arguments);
    }

    _inherits(PlanetariumElement, _HTMLDivElement);

    _createClass(PlanetariumElement, [{
        key: 'createdCallback',
        value: function createdCallback() {
            var _this = this;

            this.container = document.createElement('div');
            this.container.style.width = this.container.style.height = '100%';

            this.root = this.createShadowRoot();
            this.root.appendChild(this.container);

            this.getLocation(function (location) {
                _this.planetarium = new Planetarium(_this.container, { location: location });
            });
        }
    }, {
        key: 'fullScreen',
        value: function fullScreen() {
            return this.planetarium.requestFullScreen();
        }
    }, {
        key: 'setTimeSpeed',
        value: function setTimeSpeed(val) {
            return this.planetarium.setTimeSpeed(val);
        }
    }, {
        key: 'getLocation',
        value: function getLocation(callback, defaultLocation) {
            defaultLocation = defaultLocation || {
                latitude: 0,
                longitude: 0
            };
            var setDefault = function setDefault() {
                return callback(defaultLocation);
            };
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (position) {
                    callback({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                }, setDefault);
            } else {
                setDefault();
            }
        }
    }]);

    return PlanetariumElement;
})(HTMLDivElement);

document.registerElement('x-planetarium', PlanetariumElement);
