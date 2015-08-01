'use strict';

var _bind = Function.prototype.bind;

var _get = function get(_x3, _x4, _x5) { var _again = true; _function: while (_again) { var object = _x3, property = _x4, receiver = _x5; desc = parent = getter = undefined; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x3 = parent; _x4 = property; _x5 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

(function (root, factory) {
    root.Planetarium = factory();
})(window, function () {

    var ANGLE_90 = Math.PI / 2;
    var CELESTIAL_DISTANCE = 1000;
    var START_TIME = Date.now();

    var CURRENT_TIME = START_TIME;

    var EVENTS = {
        render: 'onrender'
    };

    var OPTS = {
        use_sensors: false,
        textures_path: '/textures',
        translation_func: function translation_func(text) {
            return text;
        },
        time: null,
        location: {
            latitude: 0,
            longitude: 0
        },
        camera: {
            foV: 50
        },
        stars: {
            visible: true,
            fontSize: 36, // for labels
            magnitude: {
                limit: 8,
                mobile_limit: 6,
                canvas_limit: 6.5,
                has_label: 4.5,
                full_label: 3.5
            }
        },
        constellations: {
            visible: true,
            fontSize: 38, // for labels
            fontColor: 0x673AB7,
            line: {
                color: 0x333366,
                opacity: 0.7,
                width: 1
            }
        },
        milkyway: {
            visible: true
        },
        cardinal_points: {
            visible: true,
            opacity: 0.7,
            fontSize: 42,
            fontColor: 0x66ff66
        },
        solar_system: {
            visible: true,
            fontSize: 40,
            fontColor: 0xffc107,
            planets_color: 0xffff00
        },
        atmosphere: {
            visible: true
        },
        ground: {
            visible: true,
            opacity: 0.95
        }
    };

    var PARAMS = { // internal options
        renderer: {
            color: 0x0e041c,
            size: {
                width: window.innerWidth,
                height: window.innerHeight
            }
        },
        camera: {
            near: 1,
            far: 2000,
            aspectRatio: window.innerWidth / window.innerHeight
        },
        controls: {
            mouse: {
                minFoV: 5,
                maxFoV: 70,
                theta: -ANGLE_90,
                noPan: true,
                noKeys: true
            },
            sensors: {
                azimuth_offset: ANGLE_90
            }
        },
        cardinal_points: {
            distance: CELESTIAL_DISTANCE - 10,
            offset: 15
        },
        labels: {
            distance: CELESTIAL_DISTANCE - 53
        },
        stars: {
            distance: CELESTIAL_DISTANCE,
            scales: [15, 13, 11, 8, 4, 3, 2, 1],
            colors: { 'O': 0x9bb0ff, 'B': 0xaabfff, 'A': 0xcad8ff, 'F': 0xfbf8ff, 'G': 0xfff4e8, 'K': 0xffddb4, 'M': 0xffbd6f }, // Harvard spectral classification
            magnitude: {
                round_limits: [0, 7]
            }
        },
        constellations: {
            distance: CELESTIAL_DISTANCE + 20
        },
        milkyway: {
            distance: CELESTIAL_DISTANCE + 500
        },
        solar_system: {
            distance: CELESTIAL_DISTANCE - 50
        },
        atmosphere: {
            distance: CELESTIAL_DISTANCE - 51
        },
        ground: {
            distance: CELESTIAL_DISTANCE - 52,
            offset: -15
        }
    };

    var TEXTURES = {
        milkyway: 'milkyway.png',
        ground: 'grass.jpg',
        sun: 'sun.png',
        moon: 'moon.png'
    };

    var Updater = (function () {
        function Updater() {
            _classCallCheck(this, Updater);
        }

        _createClass(Updater, null, [{
            key: 'updateParams',
            value: function updateParams(el) {
                PARAMS = Utils.mergeObjectsRecursive(PARAMS, {
                    is_mobile: Utils.isMobile(),
                    use_webGL: Utils.isWebglAvailable(),
                    camera: {
                        aspectRatio: typeof el !== 'undefined' ? el.offsetWidth / el.offsetHeight : window.innerWidth / window.innerHeight
                    },
                    renderer: {
                        size: {
                            width: typeof el !== 'undefined' ? el.offsetWidth : window.innerWidth,
                            height: typeof el !== 'undefined' ? el.offsetHeight : window.innerHeight
                        }
                    }
                });
            }
        }, {
            key: 'updateOpts',
            value: function updateOpts(opts) {
                opts = opts || {};
                OPTS = Utils.mergeObjectsRecursive(OPTS, opts);
            }
        }, {
            key: 'updateTextures',
            value: function updateTextures() {
                for (var i in TEXTURES) {
                    if (TEXTURES[i].startsWith(OPTS.textures_path)) continue;
                    TEXTURES[i] = OPTS.textures_path + '/' + TEXTURES[i];
                }
            }
        }]);

        return Updater;
    })();

    var SceneObjectManager = (function () {
        function SceneObjectManager() {
            _classCallCheck(this, SceneObjectManager);

            this._container = new THREE.Group();
        }

        _createClass(SceneObjectManager, [{
            key: 'addObject',
            value: function addObject(obj) {
                this._container.add(obj);
            }
        }, {
            key: 'container',
            get: function get() {
                return this._container;
            }
        }]);

        return SceneObjectManager;
    })();

    var MilkyWayMgr = (function (_SceneObjectManager) {
        function MilkyWayMgr() {
            _classCallCheck(this, MilkyWayMgr);

            _get(Object.getPrototypeOf(MilkyWayMgr.prototype), 'constructor', this).call(this);
            this.init();
        }

        _inherits(MilkyWayMgr, _SceneObjectManager);

        _createClass(MilkyWayMgr, [{
            key: 'init',
            value: function init() {
                this.milky_way = {};

                this.milky_way.geometry = new THREE.SphereGeometry(PARAMS.milkyway.distance, 60, 40);
                this.milky_way.geometry.applyMatrix(new THREE.Matrix4().makeScale(-1, 1, 1));

                this.milky_way.texture = THREE.ImageUtils.loadTexture(TEXTURES.milkyway);
                this.milky_way.texture.minFilter = THREE.NearestFilter;

                this.milky_way.material = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    map: this.milky_way.texture,
                    transparent: true,
                    blending: THREE.AdditiveBlending
                });

                this.milky_way.mesh = new THREE.Mesh(this.milky_way.geometry, this.milky_way.material);
                this.milky_way.mesh.applyMatrix(new THREE.Matrix4().makeRotationY(MathUtils.normalizeAzimuthalAngle(0)));

                this.addObject(this.milky_way.mesh);
            }
        }]);

        return MilkyWayMgr;
    })(SceneObjectManager);

    var StarsMgr = (function (_SceneObjectManager2) {
        function StarsMgr(stars_data) {
            _classCallCheck(this, StarsMgr);

            _get(Object.getPrototypeOf(StarsMgr.prototype), 'constructor', this).call(this);
            this.stars = {};
            this.initShaders();
            this.populateData(stars_data);
        }

        _inherits(StarsMgr, _SceneObjectManager2);

        _createClass(StarsMgr, [{
            key: 'populateData',
            value: function populateData(stars_data) {
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = stars_data[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var star_data = _step.value;

                        var star = {
                            id: star_data[0],
                            ra: THREE.Math.degToRad(star_data[1]),
                            dec: THREE.Math.degToRad(star_data[2]),
                            mag: star_data[3],
                            type: star_data[4]
                        };
                        this.stars[star.id] = star;
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator['return']) {
                            _iterator['return']();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }
            }
        }, {
            key: 'initVisual',
            value: function initVisual(star_names) {
                var star_layers = {}; // sorted by magnitude/spectrum       

                for (var id in this.stars) {
                    var star = this.stars[id];

                    if (star.mag > OPTS.stars.magnitude.limit) continue;
                    if (PARAMS.is_mobile && star.mag > OPTS.stars.magnitude.mobile_limit) continue;
                    if (!PARAMS.use_webGL && star.mag > OPTS.stars.magnitude.canvas_limit) continue;

                    var names = star_names[star.id] || [''];
                    star.name = names[names.length - 1];

                    star.round_mag = Math.max(PARAMS.stars.magnitude.round_limits[0], Math.min(PARAMS.stars.magnitude.round_limits[1], Math.round(star.mag)));
                    star.spectral_class = star.type[0] || 'M';
                    star.layer_id = star.spectral_class + star.round_mag;
                    star.scale = this.getScale(star.round_mag);
                    star.color = this.getColor(star.spectral_class);
                    star.coords = MathUtils.sphereToCartesian(star.ra, star.dec, PARAMS.stars.distance);

                    if (PARAMS.use_webGL) {
                        if (typeof star_layers[star.layer_id] === 'undefined') {
                            star_layers[star.layer_id] = new THREE.Geometry();
                        }
                        star_layers[star.layer_id].vertices.push(star.coords);
                    } else {
                        if (typeof star_layers[star.spectral_class] === 'undefined') {
                            star_layers[star.spectral_class] = new THREE.SpriteMaterial({
                                color: 0x000000,
                                map: new THREE.Texture(this.generateSprite(star.color)),
                                blending: THREE.AdditiveBlending,
                                fog: false,
                                transparent: true,
                                opacity: 0.9
                            });
                        }
                        var particle = new THREE.Sprite(star_layers[star.spectral_class]);
                        particle.position.copy(star.coords);
                        var scale = star.scale * 3;
                        particle.scale.set(scale, scale, scale);
                        particle.layer_id = star.layer_id;
                        this.addObject(particle);
                    }

                    if (star.mag <= OPTS.stars.magnitude.has_label && star.name.length > 0) {
                        star.label = star.mag < OPTS.stars.magnitude.full_label ? star.name : star.name.substr(0, 6);
                        star.label_particle = DrawerUtils.addLabel(star.label, { theta: star.ra, phi: star.dec, distance: PARAMS.labels.distance }, { size: OPTS.stars.fontSize }, this.container);
                    }
                }

                if (PARAMS.use_webGL) {
                    for (var layer_id in star_layers) {
                        var layer = star_layers[layer_id];
                        var spectral_class = layer_id[0];
                        var round_mag = +layer_id.slice(1);
                        var material = new THREE.ShaderMaterial({
                            uniforms: {
                                color: { type: 'c', value: new THREE.Color(this.getColor(spectral_class)) },
                                scale: { type: 'f', value: this.getScale(round_mag) }
                            },
                            vertexShader: this.vertex_shader,
                            fragmentShader: this.fragment_shader,
                            sizeAttenuation: false,
                            blending: THREE.AdditiveBlending,
                            transparent: true,
                            depthTest: true
                        });
                        var particles = new THREE.PointCloud(layer, material);
                        particles.layer_id = layer_id;
                        this.addObject(particles);
                    }
                }
            }
        }, {
            key: 'initShaders',
            value: function initShaders() {
                this.vertex_shader = 'uniform float scale;\n            void main() {\n                gl_PointSize = scale;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n            }';

                this.fragment_shader = 'uniform vec3 color;\n            void main() {\n                float cutoff = 0.15;\n                float radius = distance(vec2(0.5, 0.5), gl_PointCoord);\n                float alpha = 1.0 - min((radius - cutoff) / (0.5 - cutoff), 1.0);\n                gl_FragColor = vec4(color, alpha);\n            }';
            }
        }, {
            key: 'getScale',
            value: function getScale(i) {
                return PARAMS.stars.scales[i] || PARAMS.stars.scales[PARAMS.stars.scales.length - 1];
            }
        }, {
            key: 'getColor',
            value: function getColor(spectral_class) {
                return PARAMS.stars.colors[spectral_class] || PARAMS.stars.colors['M'];
            }
        }, {
            key: 'generateSprite',
            value: function generateSprite(color) {
                var canvas = document.createElement('canvas');
                canvas.width = 16;
                canvas.height = 16;

                var context = canvas.getContext('2d');
                var gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
                gradient.addColorStop(0, 'rgba(255,255,255,1)');
                gradient.addColorStop(0.1, DrawerUtils.numberToCSSColor(color));
                gradient.addColorStop(0.6, 'rgba(0,0,0,1)');

                context.fillStyle = gradient;
                context.fillRect(0, 0, canvas.width, canvas.height);

                return canvas;
            }
        }]);

        return StarsMgr;
    })(SceneObjectManager);

    var ConstellationsMgr = (function (_SceneObjectManager3) {
        function ConstellationsMgr(stars, constellations_data) {
            _classCallCheck(this, ConstellationsMgr);

            _get(Object.getPrototypeOf(ConstellationsMgr.prototype), 'constructor', this).call(this);
            this.stars = stars;
            this.init(constellations_data);
        }

        _inherits(ConstellationsMgr, _SceneObjectManager3);

        _createClass(ConstellationsMgr, [{
            key: 'init',
            value: function init(constellations_data) {
                var material = new THREE.LineBasicMaterial({
                    color: OPTS.constellations.line.color,
                    opacity: OPTS.constellations.line.opacity,
                    linewidth: OPTS.constellations.line.width,
                    vertexColors: false,
                    fog: false,
                    transparent: true
                });

                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = constellations_data[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var constellation = _step2.value;

                        var star_pairs = constellation[2];
                        var _stars = this.findConstellationStars(star_pairs);

                        if (_stars.length <= 0) continue;

                        var label_coords_accum = new THREE.Vector3();
                        var accum_c = 0;
                        var _iteratorNormalCompletion3 = true;
                        var _didIteratorError3 = false;
                        var _iteratorError3 = undefined;

                        try {
                            for (var _iterator3 = _stars[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                var star_pair = _step3.value;

                                var geometry = new THREE.Geometry();
                                var _iteratorNormalCompletion4 = true;
                                var _didIteratorError4 = false;
                                var _iteratorError4 = undefined;

                                try {
                                    for (var _iterator4 = star_pair[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                                        var star = _step4.value;

                                        var coords = MathUtils.sphereToCartesian(star.ra, star.dec, PARAMS.constellations.distance);
                                        geometry.vertices.push(coords);
                                        label_coords_accum.add(MathUtils.sphereToCartesian(star.ra, star.dec, PARAMS.labels.distance));
                                        accum_c++;
                                    }
                                } catch (err) {
                                    _didIteratorError4 = true;
                                    _iteratorError4 = err;
                                } finally {
                                    try {
                                        if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                                            _iterator4['return']();
                                        }
                                    } finally {
                                        if (_didIteratorError4) {
                                            throw _iteratorError4;
                                        }
                                    }
                                }

                                this.addObject(new THREE.Line(geometry, material));
                            }
                        } catch (err) {
                            _didIteratorError3 = true;
                            _iteratorError3 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                                    _iterator3['return']();
                                }
                            } finally {
                                if (_didIteratorError3) {
                                    throw _iteratorError3;
                                }
                            }
                        }

                        label_coords_accum.divideScalar(accum_c);
                        DrawerUtils.addLabel(constellation[1], label_coords_accum, { size: OPTS.constellations.fontSize, color: OPTS.constellations.fontColor }, this.container);
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                            _iterator2['return']();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
                    }
                }
            }
        }, {
            key: 'findConstellationStars',
            value: function findConstellationStars(star_pairs) {
                var stars = [];
                var _iteratorNormalCompletion5 = true;
                var _didIteratorError5 = false;
                var _iteratorError5 = undefined;

                try {
                    for (var _iterator5 = star_pairs[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                        var star_pair = _step5.value;

                        var temp = [];
                        var _iteratorNormalCompletion6 = true;
                        var _didIteratorError6 = false;
                        var _iteratorError6 = undefined;

                        try {
                            for (var _iterator6 = star_pair[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                                var star_id = _step6.value;

                                var star = this.stars[star_id];
                                if (typeof star === 'undefined') return [];
                                temp.push(star);
                            }
                        } catch (err) {
                            _didIteratorError6 = true;
                            _iteratorError6 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion6 && _iterator6['return']) {
                                    _iterator6['return']();
                                }
                            } finally {
                                if (_didIteratorError6) {
                                    throw _iteratorError6;
                                }
                            }
                        }

                        stars.push(temp);
                    }
                } catch (err) {
                    _didIteratorError5 = true;
                    _iteratorError5 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                            _iterator5['return']();
                        }
                    } finally {
                        if (_didIteratorError5) {
                            throw _iteratorError5;
                        }
                    }
                }

                return stars;
            }
        }]);

        return ConstellationsMgr;
    })(SceneObjectManager);

    var CardinalPointsMgr = (function (_SceneObjectManager4) {
        function CardinalPointsMgr() {
            _classCallCheck(this, CardinalPointsMgr);

            _get(Object.getPrototypeOf(CardinalPointsMgr.prototype), 'constructor', this).call(this);
            this.init();
        }

        _inherits(CardinalPointsMgr, _SceneObjectManager4);

        _createClass(CardinalPointsMgr, [{
            key: 'init',
            value: function init() {
                var transl = OPTS.translation_func;
                this.addPoint(transl('East'), 0, 0, -1);
                this.addPoint(transl('South'), 1, 0, 0);
                this.addPoint(transl('West'), 0, 0, 1);
                this.addPoint(transl('North'), -1, 0, 0);
            }
        }, {
            key: 'addPoint',
            value: function addPoint(text) {
                for (var _len = arguments.length, xyz = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    xyz[_key - 1] = arguments[_key];
                }

                var coords = new (_bind.apply(THREE.Vector3, [null].concat(xyz)))();
                coords.multiplyScalar(PARAMS.cardinal_points.distance);
                coords.applyMatrix4(new THREE.Matrix4().makeTranslation(0, PARAMS.cardinal_points.offset, 0));
                var label = DrawerUtils.addLabel(text, coords, {
                    size: OPTS.cardinal_points.fontSize,
                    color: OPTS.cardinal_points.fontColor,
                    opacity: OPTS.cardinal_points.opacity
                }, this.container);
            }
        }]);

        return CardinalPointsMgr;
    })(SceneObjectManager);

    var SolarSystemObjectMgr = (function (_SceneObjectManager5) {
        function SolarSystemObjectMgr() {
            _classCallCheck(this, SolarSystemObjectMgr);

            _get(Object.getPrototypeOf(SolarSystemObjectMgr.prototype), 'constructor', this).call(this);
            this.distance = PARAMS.solar_system.distance;
            this.position = {
                ecliptic: {
                    geocentric: {
                        spherical: { lon: null, lat: null },
                        cartesian: new THREE.Vector3()
                    },
                    heliocentric: {
                        spherical: { lon: null, lat: null },
                        cartesian: new THREE.Vector3()
                    }
                },
                equatorial: {
                    spherical: { ra: null, dec: null },
                    cartesian: MathUtils.sphereToCartesian(0, 0, this.distance)
                }
            };
        }

        _inherits(SolarSystemObjectMgr, _SceneObjectManager5);

        _createClass(SolarSystemObjectMgr, [{
            key: 'init',
            value: function init() {
                this.setMaterial();
                this.initObject3D();
                this.initLabelObject();
            }
        }, {
            key: 'setPos',
            value: function setPos() {
                for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    args[_key2] = arguments[_key2];
                }

                this.setEclipticHeliocentricPosition.apply(this, [this.JD].concat(args));
                this.setEclipticGeocentricPosition.apply(this, [this.JD].concat(args));
                this.position.equatorial.spherical = MathUtils.eclipticToEquatorial(this.JD, this.position.ecliptic.geocentric.spherical.lat, this.position.ecliptic.geocentric.spherical.lon);
                this.position.equatorial.cartesian.copy(MathUtils.sphereToCartesian(this.position.equatorial.spherical.ra, this.position.equatorial.spherical.dec, this.distance));
            }
        }, {
            key: 'setObjPos',
            value: function setObjPos() {
                if (PARAMS.use_webGL) {
                    this.gl_setObjPos();
                } else {
                    this._object3D.position.copy(this.position.equatorial.cartesian);
                }
            }
        }, {
            key: 'gl_setObjPos',
            value: function gl_setObjPos() {
                this._object3D.geometry.vertices[0].copy(this.position.equatorial.cartesian);
                this._object3D.geometry.verticesNeedUpdate = true;
            }
        }, {
            key: 'setLabelPos',
            value: function setLabelPos() {
                var label_pos = undefined;
                if (PARAMS.use_webGL) {
                    label_pos = this._labelObject3D.geometry.vertices[0];
                    this._labelObject3D.geometry.verticesNeedUpdate = true;
                } else {
                    label_pos = this._labelObject3D.position;
                }
                label_pos.copy(MathUtils.sphereToCartesian(this.position.equatorial.spherical.ra, this.position.equatorial.spherical.dec, PARAMS.labels.distance));
            }
        }, {
            key: 'update',
            value: function update(JD) {
                this.JD = JD;
                this.D = MathUtils.getDaysSinceEpoch2010(JD);

                for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
                    args[_key3 - 1] = arguments[_key3];
                }

                this.setPos.apply(this, args);
                this.setObjPos();
                this.setLabelPos();
            }
        }, {
            key: 'setEclipticGeocentricPosition',
            value: function setEclipticGeocentricPosition(JD) {
                throw 'Not implemented';
            }
        }, {
            key: 'setEclipticHeliocentricPosition',
            value: function setEclipticHeliocentricPosition(JD) {}
        }, {
            key: 'initObject3D',
            value: function initObject3D() {
                if (PARAMS.use_webGL) {
                    this.gl_initObject3D();
                } else {
                    this._object3D = new THREE.Sprite(this.material);
                    this._object3D.position.copy(this.position.equatorial.cartesian);
                    this._object3D.scale.set(this.material.scale, this.material.scale, this.material.scale);
                }
                this.addObject(this._object3D);
            }
        }, {
            key: 'gl_initObject3D',
            value: function gl_initObject3D() {
                var geometry = new THREE.Geometry();
                geometry.vertices.push(this.position.equatorial.cartesian);
                this._object3D = new THREE.PointCloud(geometry, this.material);
            }
        }, {
            key: 'initLabelObject',
            value: function initLabelObject() {
                this._labelObject3D = DrawerUtils.addLabel(this.label, { theta: 0, phi: 0, distance: PARAMS.labels.distance }, { size: OPTS.solar_system.fontSize, color: OPTS.solar_system.fontColor });
                this.addObject(this._labelObject3D);
            }
        }, {
            key: 'setMaterial',
            value: function setMaterial(sun) {
                throw 'Not implemented';
            }
        }, {
            key: 'calculateBrightLimbPositionAngle',
            value: function calculateBrightLimbPositionAngle(sun) {
                var position_angle = Math.atan2(Math.cos(sun.position.equatorial.spherical.dec) * Math.sin(sun.position.equatorial.spherical.ra - this.position.equatorial.spherical.ra), Math.cos(this.position.equatorial.spherical.dec) * Math.sin(sun.position.equatorial.spherical.dec) - Math.sin(this.position.equatorial.spherical.dec) * Math.cos(sun.position.equatorial.spherical.dec) * Math.cos(sun.position.equatorial.spherical.ra - this.position.equatorial.spherical.ra));
                var norm_position_angle = position_angle + ANGLE_90;
                return norm_position_angle;
            }
        }, {
            key: 'calculateDailyMotion',
            value: function calculateDailyMotion(period) {
                return 360 / 365.242191 / period;
            }
        }, {
            key: 'calculateMeanAnomaly',

            /**
            * D - Number of days since the epoch of 2010 January 0.0
            * return - Mean Anomaly (degrees 0..360)
            */
            value: function calculateMeanAnomaly(D, epochLongitude, perihelionLongitude) {
                var period = arguments[3] === undefined ? 1 : arguments[3];

                var n = this.calculateDailyMotion(period);
                var M = n * D + epochLongitude - perihelionLongitude;
                return MathUtils.normalizeAngle360(M);
            }
        }, {
            key: 'calculateTrueAnomaly',

            /**
            * M - Mean Anomaly (degrees)
            * e - Eccentricity
            * return - True Anomaly (degrees 0..360)
            */
            value: function calculateTrueAnomaly(M, e) {
                M = THREE.Math.degToRad(M);
                var e_p3 = Math.pow(e, 3);
                var v = M + (2 * e - e_p3 / 4) * Math.sin(M) + 5 / 4 * e * e * Math.sin(2 * M) + 13 / 12 * e_p3 * Math.sin(3 * M);
                v = THREE.Math.radToDeg(v);
                return MathUtils.normalizeAngle360(v);
            }
        }, {
            key: 'calculateRadiusVector',

            /**
            * a - semi-major axis
            * e - Eccentricity
            * v - true anomaly
            */
            value: function calculateRadiusVector(a, e, v) {
                return a * (1 - e * e) / (1 + e * Math.cos(THREE.Math.degToRad(v)));
            }
        }]);

        return SolarSystemObjectMgr;
    })(SceneObjectManager);

    var SunMgr = (function (_SolarSystemObjectMgr) {
        function SunMgr() {
            _classCallCheck(this, SunMgr);

            _get(Object.getPrototypeOf(SunMgr.prototype), 'constructor', this).call(this);
            this.label = OPTS.translation_func('Sun');
            this.init();
        }

        _inherits(SunMgr, _SolarSystemObjectMgr);

        _createClass(SunMgr, [{
            key: 'setMaterial',
            value: function setMaterial() {
                this.texture = THREE.ImageUtils.loadTexture(TEXTURES.sun);
                var scale = 160;
                if (PARAMS.use_webGL) {
                    this.material = new THREE.PointCloudMaterial({
                        size: scale,
                        map: this.texture,
                        transparent: true,
                        blending: THREE.AdditiveBlending,
                        sizeAttenuation: false,
                        fog: false,
                        depthTest: true,
                        depthWrite: false
                    });
                } else {
                    this.material = new THREE.SpriteMaterial({
                        color: 0x000000,
                        map: this.texture,
                        fog: false,
                        transparent: true,
                        blending: THREE.AdditiveBlending
                    });
                    this.material.scale = scale;
                }
            }
        }, {
            key: 'setEclipticGeocentricPosition',

            // Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
            value: function setEclipticGeocentricPosition(JD) {
                var eg = undefined,
                    wg = undefined,
                    e = undefined,
                    Mo = undefined,
                    v = undefined,
                    lon = undefined,
                    lat = undefined;
                // Calculated for epoch 2010.0. If T is the number of Julian centuries since 1900 January 0.5 = (JD-2415020.0)/36525
                eg = 279.557208; // mean ecliptic longitude in degrees = (279.6966778 + 36000.76892*T + 0.0003025*T*T)%360;
                wg = 283.112438; // longitude of the Sun at perigee in degrees = 281.2208444 + 1.719175*T + 0.000452778*T*T;
                e = 0.016705; // eccentricity of the Sun-Earth orbit in degrees = 0.01675104 - 0.0000418*T - 0.000000126*T*T;
                this.Mo = this.calculateMeanAnomaly(this.D, eg, wg);
                v = this.calculateTrueAnomaly(this.Mo, e);
                lon = THREE.Math.degToRad(MathUtils.normalizeAngle360(v + wg));
                lat = 0; // ecliptic latitude is zero because the Sun is in the ecliptic
                this.position.ecliptic.geocentric.spherical = { lon: lon, lat: lat };
            }
        }]);

        return SunMgr;
    })(SolarSystemObjectMgr);

    var MoonMgr = (function (_SolarSystemObjectMgr2) {
        function MoonMgr() {
            _classCallCheck(this, MoonMgr);

            _get(Object.getPrototypeOf(MoonMgr.prototype), 'constructor', this).call(this);
            this.label = OPTS.translation_func('Moon');
            this.initShaders();
            this.init();
        }

        _inherits(MoonMgr, _SolarSystemObjectMgr2);

        _createClass(MoonMgr, [{
            key: 'setPos',
            value: function setPos(sun) {
                _get(Object.getPrototypeOf(MoonMgr.prototype), 'setPos', this).call(this, sun);
                if (PARAMS.use_webGL) {
                    this.position_angle = this.calculateBrightLimbPositionAngle(sun);
                    this.phase = this.getPhase(sun);

                    // TODO: do more testing for phase, position angle and its shaders
                    var shader_phase = MathUtils.mapToRange(this.phase, 0.0, 1.0, -1.0, 1.0);
                    var shader_position_angle = this.position_angle;

                    if (OPTS.location.latitude < 0) shader_position_angle += Math.PI;
                    if (shader_phase < 0) shader_position_angle += Math.PI;

                    this.material.uniforms.phase.value = shader_phase;
                    this.material.uniforms.position_angle.value = shader_position_angle;
                }
            }
        }, {
            key: 'setMaterial',
            value: function setMaterial() {
                var scale = 25;
                this.texture = THREE.ImageUtils.loadTexture(TEXTURES.moon);
                if (PARAMS.use_webGL) {
                    this.material = new THREE.ShaderMaterial({
                        uniforms: {
                            scale: { type: 'f', value: scale },
                            map: { type: 't', value: this.texture },
                            phase: { type: 'f', value: 0 },
                            position_angle: { type: 'f', value: 0 }
                        },
                        vertexShader: this.vertex_shader,
                        fragmentShader: this.fragment_shader,
                        sizeAttenuation: false,
                        transparent: true,
                        depthTest: true
                    });
                } else {
                    this.material = new THREE.SpriteMaterial({
                        color: 0x000000,
                        map: this.texture,
                        fog: false
                    });
                    this.material.scale = scale * 2;
                }
            }
        }, {
            key: 'initShaders',
            value: function initShaders() {
                this.vertex_shader = 'uniform float scale;\n            void main() {\n                gl_PointSize = scale;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n            }';

                this.fragment_shader = 'uniform sampler2D map;\n            uniform float phase;\n            uniform float position_angle;\n\n            // Corrections for internal coordinate system\n            float normalizeAngle(float angle) {\n                return -angle;\n            }\n\n            float normalizePhase(float phase) {\n                float res = phase;\n                if(res == 0.0) res = 1e-7;\n                return res;\n            }\n\n            void main() {\n                float norm_phase = normalizePhase(phase);                \n                float norm_position_angle = normalizeAngle(position_angle);\n\n                float moon_radius = 0.5;\n                vec2 moon_pos = vec2(0.5, 0.5);               \n\n                float shadow_radius = moon_radius / sqrt(abs(norm_phase));\n                float shadow_distance = sqrt(shadow_radius*shadow_radius - moon_radius*moon_radius);\n                vec2 shadow_pos = moon_pos + vec2(shadow_distance * cos(norm_position_angle), shadow_distance * sin(norm_position_angle));\n\n                // circle equation\n                bool has_shadow_test = pow(gl_PointCoord.x - shadow_pos.x, 2.0) + pow(gl_PointCoord.y - shadow_pos.y, 2.0) > shadow_radius*shadow_radius;\n                if(norm_phase < 0.0) has_shadow_test = !has_shadow_test;\n\n                gl_FragColor = texture2D(map, gl_PointCoord);\n                if(has_shadow_test) {\n                    gl_FragColor *= vec4(0.0, 0.0, 0.0, 0.3);\n                }\n            }';
            }
        }, {
            key: 'setEclipticHeliocentricPosition',
            value: function setEclipticHeliocentricPosition(JD, sun) {
                var lo = undefined,
                    Po = undefined,
                    e = undefined,
                    l = undefined,
                    Mm = undefined,
                    C = undefined,
                    Ev = undefined,
                    Ae = undefined,
                    A3 = undefined,
                    Mprimem = undefined,
                    Ec = undefined,
                    A4 = undefined,
                    lprime = undefined,
                    V = undefined,
                    lprimeprime = undefined,
                    sinMo = undefined;

                lo = 91.929336; // Moon's mean longitude at epoch 2010.0
                Po = 130.143076; // mean longitude of the perigee at epoch       
                e = 0.0549; // eccentricity of the Moon's orbit   

                sinMo = Math.sin(THREE.Math.degToRad(sun.Mo));
                l = MathUtils.normalizeAngle360(13.1763966 * sun.D + lo); // mean longitude
                Mm = MathUtils.normalizeAngle360(l - 0.1114041 * sun.D - Po); // mean anomaly       
                C = l - sun.position.ecliptic.geocentric.spherical.lon;
                Ev = 1.2739 * Math.sin(THREE.Math.degToRad(2 * C - Mm)); // corrections for evection       
                Ae = 0.1858 * sinMo; // the annual equation
                A3 = 0.37 * sinMo; // a third correction
                Mprimem = Mm + Ev - Ae - A3; // corrected anomaly
                Ec = 6.2886 * Math.sin(THREE.Math.degToRad(Mprimem)); // correction for the equation of the centre
                A4 = 0.214 * Math.sin(THREE.Math.degToRad(2 * Mprimem)); // another correction term
                lprime = l + Ev + Ec - Ae + A4; // corrected longitude
                V = 0.6583 * Math.sin(2 * THREE.Math.degToRad(lprime - sun.position.ecliptic.geocentric.spherical.lon)); // variation
                lprimeprime = THREE.Math.degToRad(lprime + V); // true orbital longitude 
                this.position.ecliptic.heliocentric.spherical = { lon: lprimeprime, lat: 0 };
            }
        }, {
            key: 'setEclipticGeocentricPosition',

            // Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
            value: function setEclipticGeocentricPosition(JD, sun) {
                var N = undefined,
                    No = undefined,
                    i = undefined,
                    sinMo = undefined,
                    Nprime = undefined,
                    lppNp = undefined,
                    sinlppNp = undefined,
                    y = undefined,
                    x = undefined,
                    lm = undefined,
                    Bm = undefined;

                No = 291.682547; // mean longitude of the node at the epoch
                i = 5.145396; // inclination of Moon's orbit

                sinMo = Math.sin(THREE.Math.degToRad(sun.Mo));
                N = MathUtils.normalizeAngle360(No - 0.0529539 * sun.D); // ascending node’s mean longitude
                Nprime = N - 0.16 * sinMo; // corrected longitude of the node
                lppNp = this.position.ecliptic.heliocentric.spherical.lon - THREE.Math.degToRad(Nprime);
                sinlppNp = Math.sin(lppNp);
                y = sinlppNp * Math.cos(THREE.Math.degToRad(i));
                x = Math.cos(lppNp);
                lm = THREE.Math.radToDeg(Math.atan2(y, x)) + Nprime; // ecliptic longitude
                Bm = Math.asin(sinlppNp * Math.sin(THREE.Math.degToRad(i))); // ecliptic latitude
                lm = THREE.Math.degToRad(MathUtils.normalizeAngle360(lm));
                this.position.ecliptic.geocentric.spherical = { lon: lm, lat: Bm };
            }
        }, {
            key: 'getPhaseAngle',
            value: function getPhaseAngle(sun) {
                return this.position.ecliptic.heliocentric.spherical.lon - sun.position.ecliptic.geocentric.spherical.lon;
            }
        }, {
            key: 'getPhase',
            value: function getPhase(sun) {
                var d = this.getPhaseAngle(sun);
                return (1 - Math.cos(d)) / 2;
            }
        }]);

        return MoonMgr;
    })(SolarSystemObjectMgr);

    var PlanetMgr = (function (_SolarSystemObjectMgr3) {
        function PlanetMgr(name, vsop87c) {
            _classCallCheck(this, PlanetMgr);

            _get(Object.getPrototypeOf(PlanetMgr.prototype), 'constructor', this).call(this);
            this.position.heliocentric = new THREE.Vector3();
            this.julian_day = 0;

            this.name = name;
            this.label = OPTS.translation_func(name);

            this.vsop87c = vsop87c;

            this.initShaders();
            this.init();
        }

        _inherits(PlanetMgr, _SolarSystemObjectMgr3);

        _createClass(PlanetMgr, [{
            key: 'setMaterial',
            value: function setMaterial() {
                var scale = 10;
                var color = OPTS.solar_system.planets_color;
                if (PARAMS.use_webGL) {
                    this.material = new THREE.ShaderMaterial({
                        uniforms: {
                            color: { type: 'c', value: new THREE.Color(color) },
                            scale: { type: 'f', value: scale }
                        },
                        vertexShader: this.vertex_shader,
                        fragmentShader: this.fragment_shader,
                        sizeAttenuation: false,
                        blending: THREE.AdditiveBlending,
                        transparent: true,
                        depthTest: true
                    });
                } else {
                    this.material = new THREE.SpriteMaterial({
                        color: 0x000000,
                        map: new THREE.Texture(this.generateSprite(color)),
                        fog: false,
                        transparent: true,
                        blending: THREE.AdditiveBlending
                    });
                    this.material.scale = scale * 10;
                }
            }
        }, {
            key: 'initShaders',
            value: function initShaders() {
                this.vertex_shader = 'uniform float scale;\n            void main() {\n                gl_PointSize = scale;\n                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);\n            }';

                this.fragment_shader = 'uniform vec3 color;\n            void main() {\n                float cutoff = 0.49;\n                float radius = distance(vec2(0.5, 0.5), gl_PointCoord);\n                float alpha = 1.0 - min((radius - cutoff) / (0.5 - cutoff), 1.0);\n                gl_FragColor = vec4(color, alpha);\n            }';
            }
        }, {
            key: 'generateSprite',
            value: function generateSprite(color) {
                var radius = 15;
                var canvas = document.createElement('canvas');
                canvas.width = 160;
                canvas.height = 160;

                var context = canvas.getContext('2d');

                var centerX = canvas.width / 2;
                var centerY = canvas.height / 2;

                context.beginPath();
                context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
                context.fillStyle = DrawerUtils.numberToCSSColor(color);
                context.fill();
                context.stroke();

                return canvas;
            }
        }, {
            key: 'calculateTerms',
            value: function calculateTerms(t, terms) {
                var res = 0;
                for (var i in terms) {
                    var temp = 0;
                    var _iteratorNormalCompletion7 = true;
                    var _didIteratorError7 = false;
                    var _iteratorError7 = undefined;

                    try {
                        for (var _iterator7 = terms[i][Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
                            var term = _step7.value;

                            var line_res = undefined;
                            if (typeof term === 'number') {
                                line_res = term;
                            } else {
                                line_res = term[0] * Math.cos(term[1] + term[2] * t);
                            }
                            temp += line_res;
                        }
                    } catch (err) {
                        _didIteratorError7 = true;
                        _iteratorError7 = err;
                    } finally {
                        try {
                            if (!_iteratorNormalCompletion7 && _iterator7['return']) {
                                _iterator7['return']();
                            }
                        } finally {
                            if (_didIteratorError7) {
                                throw _iteratorError7;
                            }
                        }
                    }

                    res += temp * Math.pow(t, i);
                }
                return res;
            }
        }, {
            key: 'setEclipticHeliocentricPosition',
            value: function setEclipticHeliocentricPosition(JD) {
                var julian_day = Math.trunc(MathUtils.getDaysSinceEpoch2000(JD));
                if (julian_day == this.julian_day) {
                    // calculate position once per day
                    return;
                }
                this.julian_day = julian_day;

                var res = new THREE.Vector3();
                var t = MathUtils.getMillenniaSinceEpoch2000(JD);

                this.position.ecliptic.heliocentric.cartesian.set(this.calculateTerms(t, this.vsop87c.X), this.calculateTerms(t, this.vsop87c.Y), this.calculateTerms(t, this.vsop87c.Z));
            }
        }, {
            key: 'setEclipticGeocentricPosition',
            value: function setEclipticGeocentricPosition(JD, earth) {
                var geocentric_pos = new THREE.Vector3();
                geocentric_pos.copy(this.position.ecliptic.heliocentric.cartesian);
                geocentric_pos.sub(earth.position.ecliptic.heliocentric.cartesian);

                var lon = Math.atan2(geocentric_pos.y, geocentric_pos.x);
                var lat = Math.atan2(geocentric_pos.z, Math.sqrt(Math.pow(geocentric_pos.x, 2) + Math.pow(geocentric_pos.y, 2)));

                this.position.ecliptic.geocentric.cartesian.copy(geocentric_pos);
                this.position.ecliptic.geocentric.spherical = { lon: lon, lat: lat };
            }
        }, {
            key: 'getPhaseAngle',
            value: function getPhaseAngle(sun) {
                return sun.position.ecliptic.geocentric.spherical.lon - this.position.ecliptic.heliocentric.spherical.lon;
            }
        }, {
            key: 'getPhase',
            value: function getPhase(sun) {
                var d = this.getPhaseAngle(sun);
                return (1 + Math.cos(d)) / 2;
            }
        }]);

        return PlanetMgr;
    })(SolarSystemObjectMgr);

    var PlanetsMgr = (function (_SceneObjectManager6) {
        function PlanetsMgr(planets_data) {
            _classCallCheck(this, PlanetsMgr);

            _get(Object.getPrototypeOf(PlanetsMgr.prototype), 'constructor', this).call(this);
            this.init(planets_data);
        }

        _inherits(PlanetsMgr, _SceneObjectManager6);

        _createClass(PlanetsMgr, [{
            key: 'init',
            value: function init(planets_data) {
                this.planets_data = planets_data;
                this.initPlanets();
            }
        }, {
            key: 'update',
            value: function update(JD) {
                this.earth.setEclipticHeliocentricPosition(JD);
                for (var planet_name in this.planets) {
                    this.planets[planet_name].update(JD, this.earth);
                }
            }
        }, {
            key: 'initPlanets',
            value: function initPlanets() {
                this.planets = {};
                for (var planet_name in this.planets_data) {
                    if (planet_name.toLowerCase() == 'earth') {
                        this.earth = new PlanetMgr(planet_name, this.planets_data[planet_name]);
                    } else {
                        this.planets[planet_name] = new PlanetMgr(planet_name, this.planets_data[planet_name]);
                        this.addObject(this.planets[planet_name].container);
                    }
                }
            }
        }]);

        return PlanetsMgr;
    })(SceneObjectManager);

    var SolarSystemMgr = (function (_SceneObjectManager7) {
        function SolarSystemMgr(planets_data) {
            _classCallCheck(this, SolarSystemMgr);

            _get(Object.getPrototypeOf(SolarSystemMgr.prototype), 'constructor', this).call(this);
            this.init(planets_data);
        }

        _inherits(SolarSystemMgr, _SceneObjectManager7);

        _createClass(SolarSystemMgr, [{
            key: 'init',
            value: function init(planets_data) {
                this.sun_mgr = new SunMgr();
                this.addObject(this.sun_mgr.container);
                this.moon_mgr = new MoonMgr();
                this.addObject(this.moon_mgr.container);
                this.planets_mgr = new PlanetsMgr(planets_data);
                this.addObject(this.planets_mgr.container);
            }
        }, {
            key: 'render',
            value: function render(timestamp) {
                var JD = MathUtils.timestampToJulianDate(timestamp);
                this.sun_mgr.update(JD);
                this.planets_mgr.update(JD);
                this.moon_mgr.update(JD, this.sun_mgr);
            }
        }]);

        return SolarSystemMgr;
    })(SceneObjectManager);

    var CelestialSphereMgr = (function (_SceneObjectManager8) {
        function CelestialSphereMgr(stars, star_names, constellations) {
            _classCallCheck(this, CelestialSphereMgr);

            _get(Object.getPrototypeOf(CelestialSphereMgr.prototype), 'constructor', this).call(this);
            this.rotation = {
                azimuth: 0,
                polar: 0
            };
            this.init(stars, star_names, constellations);
        }

        _inherits(CelestialSphereMgr, _SceneObjectManager8);

        _createClass(CelestialSphereMgr, [{
            key: 'render',
            value: function render(timestamp) {
                this.setObserver(timestamp);
                if (typeof this.solar_system_mgr !== 'undefined') {
                    this.solar_system_mgr.render(timestamp);
                }
            }
        }, {
            key: 'getRotation',
            value: function getRotation(timestamp) {
                // rotate according to hour angle
                var last_hours = MathUtils.getLAST(timestamp, OPTS.location.longitude);
                var last = THREE.Math.degToRad(MathUtils.hoursToDeg(last_hours));
                var azimuth = new THREE.Matrix4().makeRotationY(-last);

                var north_horizon_dec = MathUtils.getNorthHorizonDeclination(OPTS.location.latitude);
                var polar = new THREE.Matrix4().makeRotationZ(north_horizon_dec);

                return { azimuth: azimuth, polar: polar };
            }
        }, {
            key: 'setObserver',
            value: function setObserver(timestamp) {
                this.rotation = this.getRotation(timestamp);
                this.container.matrix.identity();
                this.container.applyMatrix(this.rotation.azimuth);
                this.container.applyMatrix(this.rotation.polar);
            }
        }, {
            key: 'init',
            value: function init(stars, star_names, constellations) {
                if (OPTS.milkyway.visible) {
                    this.milky_way_mgr = new MilkyWayMgr();
                    this.addObject(this.milky_way_mgr.container);
                }
                if (OPTS.stars.visible || OPTS.constellations.visible) {
                    this.stars_mgr = new StarsMgr(stars);
                    if (OPTS.stars.visible) {
                        this.stars_mgr.initVisual(star_names);
                        this.addObject(this.stars_mgr.container);
                    }
                    if (OPTS.constellations.visible) {
                        this.constellations_mgr = new ConstellationsMgr(this.stars_mgr.stars, constellations);
                        this.addObject(this.constellations_mgr.container);
                    }
                }
                if (OPTS.solar_system.visible) {
                    this.solar_system_mgr = new SolarSystemMgr(planets_data);
                    this.addObject(this.solar_system_mgr.container);
                }
            }
        }]);

        return CelestialSphereMgr;
    })(SceneObjectManager);

    var AtmosphereMgr = (function (_SceneObjectManager9) {
        function AtmosphereMgr() {
            _classCallCheck(this, AtmosphereMgr);

            _get(Object.getPrototypeOf(AtmosphereMgr.prototype), 'constructor', this).call(this);
            this.init();
        }

        _inherits(AtmosphereMgr, _SceneObjectManager9);

        _createClass(AtmosphereMgr, [{
            key: 'render',
            value: function render(sun_pos, rotation) {
                this.sky.uniforms.sunPosition.value.copy(sun_pos);
                this.sky.uniforms.sunPosition.value.applyMatrix4(rotation.azimuth);
                this.sky.uniforms.sunPosition.value.applyMatrix4(rotation.polar);
            }
        }, {
            key: 'init',
            value: function init() {
                this.sky = new THREE.Sky(PARAMS.atmosphere.distance);
                this.addObject(this.sky.mesh);
                this.updateUniforms();
            }
        }, {
            key: 'updateUniforms',
            value: function updateUniforms() {
                var uniforms = this.sky.uniforms;
                uniforms.reileigh.value = 0.8;
                uniforms.mieCoefficient.value = 0.003;
                uniforms.mieDirectionalG.value = 0.99;
            }
        }]);

        return AtmosphereMgr;
    })(SceneObjectManager);

    var GroundMgr = (function (_SceneObjectManager10) {
        function GroundMgr() {
            _classCallCheck(this, GroundMgr);

            _get(Object.getPrototypeOf(GroundMgr.prototype), 'constructor', this).call(this);
            this.init();
        }

        _inherits(GroundMgr, _SceneObjectManager10);

        _createClass(GroundMgr, [{
            key: 'init',
            value: function init() {
                this.ground = {};

                this.ground.geometry = new THREE.CircleGeometry(PARAMS.ground.distance, 64);
                this.ground.geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-ANGLE_90));
                this.ground.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, PARAMS.ground.offset, 0));

                this.ground.texture = THREE.ImageUtils.loadTexture(TEXTURES.ground);
                this.ground.texture.wrapS = this.ground.texture.wrapT = THREE.RepeatWrapping;
                this.ground.texture.repeat.set(32, 32);
                this.ground.texture.anisotropy = 16;

                this.ground.material = new THREE.MeshBasicMaterial({
                    map: this.ground.texture,
                    color: 0xffffff,
                    transparent: true,
                    opacity: OPTS.ground.opacity
                });

                this.ground.mesh = new THREE.Mesh(this.ground.geometry, this.ground.material);

                this.addObject(this.ground.mesh);
            }
        }]);

        return GroundMgr;
    })(SceneObjectManager);

    var Drawer = (function () {
        function Drawer(planetarium) {
            _classCallCheck(this, Drawer);

            this.planetarium = planetarium;
            this.init();
        }

        _createClass(Drawer, [{
            key: 'init',
            value: function init() {
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(OPTS.camera.foV, PARAMS.camera.aspectRatio, PARAMS.camera.near, PARAMS.camera.far);

                this.initRenderer();
                this.initControls();
                this.registerListeners();
                this.fillScene();
            }
        }, {
            key: 'animate',
            value: function animate() {
                requestAnimationFrame(this.animate.bind(this));
                this.render();
            }
        }, {
            key: 'render',
            value: function render() {
                this.renderScene();
                this.controls.update();
                this.renderer.render(this.scene, this.camera);
                this.planetarium.dispatchEvent(EVENTS.render);
            }
        }, {
            key: 'getTimestamp',
            value: function getTimestamp() {
                var time = OPTS.time;
                if (typeof time === 'function') {
                    time = time();
                }
                CURRENT_TIME = Utils.getTimestamp(time);
                return Utils.getSecondsTimestamp(time);
            }
        }, {
            key: 'renderScene',
            value: function renderScene() {
                var timestamp = this.getTimestamp();

                this.celestial_sphere.render(timestamp);
                if (typeof this.atmosphere !== 'undefined') {
                    var sun_pos = this.celestial_sphere.solar_system_mgr.sun_mgr.position.equatorial.cartesian;
                    var rotation = this.celestial_sphere.rotation;
                    this.atmosphere.render(sun_pos, rotation);
                }
            }
        }, {
            key: 'fillScene',
            value: function fillScene() {
                this.celestial_sphere = new CelestialSphereMgr(stars, star_names, constellations);
                this.scene.add(this.celestial_sphere.container);
                if (OPTS.cardinal_points.visible) {
                    this.cardinal_points = new CardinalPointsMgr();
                    this.scene.add(this.cardinal_points.container);
                }
                if (OPTS.atmosphere.visible && PARAMS.use_webGL) {
                    this.atmosphere = new AtmosphereMgr();
                    this.scene.add(this.atmosphere.container);
                }
                if (OPTS.ground.visible && PARAMS.use_webGL) {
                    this.ground = new GroundMgr();
                    this.scene.add(this.ground.container);
                }
            }
        }, {
            key: 'initRenderer',
            value: function initRenderer() {
                if (PARAMS.use_webGL) {
                    this.renderer = new THREE.WebGLRenderer({ clearAlpha: 1, antialias: true, preserveDrawingBuffer: true });
                } else {
                    this.renderer = new THREE.CanvasRenderer({ clearAlpha: 1, antialias: true });
                    DrawerUtils.drawText(OPTS.translation_func('Software rendering mode.'), undefined, undefined, this.planetarium.el);
                }
                this.renderer.setSize(PARAMS.renderer.size.width, PARAMS.renderer.size.height);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.renderer.setClearColor(PARAMS.renderer.color, 1);
                this.renderer.shadowMapType = THREE.PCFSoftShadowMap;
            }
        }, {
            key: 'initControls',
            value: function initControls() {
                var _params = undefined;
                if (OPTS.use_sensors && PARAMS.is_mobile) {
                    this.controls = new THREE.DeviceOrientationControls(this.camera);
                    _params = PARAMS.controls.sensors;
                } else {
                    this.controls = new THREE.SightControls(this.camera, this.renderer.domElement);
                    _params = PARAMS.controls.mouse;
                }
                for (var i in _params) {
                    if (_params[i] !== undefined) {
                        this.controls[i] = _params[i];
                    }
                }
            }
        }, {
            key: 'registerListeners',
            value: function registerListeners() {
                var _this = this;

                window.addEventListener('resize', function () {
                    Updater.updateParams(_this.planetarium.el);
                    _this.renderer.setSize(PARAMS.renderer.size.width, PARAMS.renderer.size.height);
                    _this.camera.aspect = PARAMS.camera.aspectRatio;
                    _this.camera.updateProjectionMatrix();
                });
            }
        }]);

        return Drawer;
    })();

    var Planetarium = (function () {
        function Planetarium(el, opts) {
            _classCallCheck(this, Planetarium);

            this.el = el;

            Updater.updateParams(el);
            Updater.updateOpts(opts);
            Updater.updateTextures();

            var drawer = new Drawer(this);
            this.canvas = drawer.renderer.domElement;
            this.el.appendChild(this.canvas);
            drawer.animate();
        }

        _createClass(Planetarium, [{
            key: 'requestFullScreen',
            value: function requestFullScreen() {
                Utils.requestFullScreen(this.el);
                return this;
            }
        }, {
            key: 'setTimeSpeed',
            value: function setTimeSpeed(multiplier) {
                OPTS.time = function () {
                    return Utils.getVirtualTimestamp(multiplier);
                };
                return this;
            }
        }, {
            key: 'dispatchEvent',
            value: function dispatchEvent(event_tag, data) {
                data = data || {};
                var detail = Utils.mergeObjectsRecursive({ planetarium: this }, data);
                this.el.dispatchEvent(new CustomEvent(event_tag, { detail: detail }));
            }
        }, {
            key: 'date',
            get: function get() {
                return new Date(CURRENT_TIME);
            }
        }, {
            key: 'events',
            get: function get() {
                return Utils.mergeObjectsRecursive({}, EVENTS);
            }
        }]);

        return Planetarium;
    })();

    var DrawerUtils = (function () {
        function DrawerUtils() {
            _classCallCheck(this, DrawerUtils);
        }

        _createClass(DrawerUtils, null, [{
            key: 'addLabel',
            value: function addLabel(text, coords, font, target) {
                coords = MathUtils.getCartesianCoords(coords);
                var texture = DrawerUtils.getTextTexture(text, font);
                var material = undefined;
                if (PARAMS.use_webGL) {
                    material = new THREE.PointCloudMaterial({
                        color: 0xffffff,
                        sizeAttenuation: false,
                        transparent: true,
                        size: Math.floor(texture.image.width / 2.7),
                        depthWrite: false
                    });
                } else {
                    material = new THREE.SpriteMaterial({ color: 0xffffff });
                    material.color.setHSL(1, 1, 1);
                }
                material.map = texture;
                material.fog = false;
                material.opacity = font.opacity || 1;

                var particle = undefined;
                if (PARAMS.use_webGL) {
                    var geometry = new THREE.Geometry();
                    geometry.vertices.push(coords);
                    particle = new THREE.PointCloud(geometry, material);
                } else {
                    particle = new THREE.Sprite(material);
                    particle.position.copy(coords);
                    var scale = material.map.image.width / 2;
                    particle.scale.set(scale, scale, scale);
                }

                if (typeof target !== 'undefined') {
                    target.add(particle);
                }
                return particle;
            }
        }, {
            key: 'drawText',
            value: function drawText(text, pos, style, el) {
                pos = pos || { x: 10, y: 10 };
                style = style || { width: 100, height: 100, backgroundColor: 'transparent', color: 'white' };
                var text_el = document.createElement('div');
                text_el.style.position = 'absolute';
                //text_el.style.zIndex = 1;
                text_el.style.width = style.width;
                text_el.style.height = style.height;
                text_el.style.backgroundColor = style.backgroundColor;
                text_el.style.color = style.color;
                text_el.innerHTML = text;
                if (typeof el !== 'undefined') {
                    text_el.style.top = el.style.top + pos.x + 'px';
                    text_el.style.left = el.style.left + pos.y + 'px';
                    el.appendChild(text_el);
                }
                return text_el;
            }
        }, {
            key: 'getTextTexture',
            value: function getTextTexture(text, font) {
                var _font = {
                    family: 'Arial',
                    size: 24,
                    color: '#888888'
                };
                if (typeof font !== 'undefined') {
                    _font = Utils.mergeObjectsRecursive(_font, font);
                }

                if (typeof _font.color === 'number') {
                    _font.color = DrawerUtils.numberToCSSColor(_font.color);
                }

                var canvas = document.createElement('canvas');
                var context = canvas.getContext('2d');
                context.font = _font.size + 'px ' + _font.family;
                var textMeasure = context.measureText(text);

                canvas = document.createElement('canvas');
                canvas.width = 2 * textMeasure.width + 20; // _font.size * text.length;
                canvas.height = canvas.width; // _font.size * text.length;
                context = canvas.getContext('2d');
                context.font = _font.size + 'px ' + _font.family;
                context.fillStyle = _font.color;
                context.fillText(text, 0, canvas.height / 2 + _font.size / 2);

                var tex = new THREE.Texture(canvas);
                tex.needsUpdate = true;
                tex.minFilter = THREE.NearestFilter;
                return tex;
            }
        }, {
            key: 'numberToCSSColor',
            value: function numberToCSSColor(number) {
                var res = number.toString(16);
                while (res.length < 6) res = '0' + res;
                return '#' + res;
            }
        }]);

        return DrawerUtils;
    })();

    var MathUtils = (function () {
        function MathUtils() {
            _classCallCheck(this, MathUtils);
        }

        _createClass(MathUtils, null, [{
            key: 'normalizeAzimuthalAngle',

            // Corrections for internal coordinate system
            value: function normalizeAzimuthalAngle(angle) {
                return ANGLE_90 - angle;
            }
        }, {
            key: 'getNorthHorizonDeclination',
            value: function getNorthHorizonDeclination(observer_latitude_deg) {
                var res = 90 - observer_latitude_deg;
                return THREE.Math.degToRad(res);
            }
        }, {
            key: 'normalizeAngle360',

            // Makes an angle to be in range from 0 to 360 degrees
            value: function normalizeAngle360(angle) {
                // reduce the angle 
                angle = angle % 360;
                // force it to be the positive remainder, so that 0 <= angle < 360 
                angle = (angle + 360) % 360;
                return angle;
            }
        }, {
            key: 'normalizeAngle180',

            // Makes an angle to be in range from -180 to +180 degrees
            value: function normalizeAngle180(angle) {
                angle = MathUtils.normalizeAngle360(angle);
                if (angle > 180) angle -= 360;
                return angle;
            }
        }, {
            key: 'mapToRange',
            value: function mapToRange(old_val, old_min, old_max, new_min, new_max) {
                var old_range = old_max - old_min;
                var new_range = new_max - new_min;
                return (old_val - old_min) * new_range / old_range + new_min;
            }
        }, {
            key: 'sphereToCartesian',
            value: function sphereToCartesian(theta, phi) {
                var radius = arguments[2] === undefined ? 1 : arguments[2];

                theta = MathUtils.normalizeAzimuthalAngle(theta);
                var cosPhi = Math.cos(phi);
                var vec = new THREE.Vector3(Math.sin(theta) * cosPhi, Math.sin(phi), -Math.cos(theta) * cosPhi);
                vec.multiplyScalar(radius);
                return vec;
            }
        }, {
            key: 'getCartesianCoords',
            value: function getCartesianCoords(coords) {
                if (coords instanceof THREE.Vector3) {
                    return coords;
                }
                coords = coords || {};
                if ('theta' in coords && 'phi' in coords && 'distance' in coords) {
                    return MathUtils.sphereToCartesian(coords.theta, coords.phi, coords.distance);
                }
                if ('ra' in coords && 'dec' in coords && 'distance' in coords) {
                    return MathUtils.sphereToCartesian(coords.ra, coords.dec, coords.distance);
                }
                if ('JD' in coords && 'lat' in coords && 'lon' in coords && 'distance' in coords) {
                    var eq = MathUtils.eclipticToEquatorial(coords.JD, coords.lat, coords.lon);
                    return MathUtils.sphereToCartesian(eq.ra, eq.dec, coords.distance);
                }
                throw 'Invalid coords "' + coords + '"';
            }
        }, {
            key: 'hoursToDeg',
            value: function hoursToDeg(hours) {
                // 360 deg / 24h = 15 deg
                return hours * 15.0;
            }
        }, {
            key: 'degToHours',
            value: function degToHours(deg) {
                // 360 deg / 24h = 15 deg
                return deg / 15.0;
            }
        }, {
            key: 'timestampToJulianDate',
            value: function timestampToJulianDate(timestamp) {
                // The Julian Date of the Unix Time epoch is 2440587.5
                return timestamp / 86400.0 + 2440587.5;
            }
        }, {
            key: 'getDaysSinceEpoch2010',
            value: function getDaysSinceEpoch2010(JD) {
                var D = JD - 2455196.5; // Number of days since the epoch of 2010 January 0.0
                return D;
            }
        }, {
            key: 'getDaysSinceEpoch2000',
            value: function getDaysSinceEpoch2000(JD) {
                var D = JD - 2451545.0; // Number of days since the epoch of 2000 January 0.0
                return D;
            }
        }, {
            key: 'getMillenniaSinceEpoch2000',
            value: function getMillenniaSinceEpoch2000(JD) {
                var D = MathUtils.getDaysSinceEpoch2000(JD);
                var t = D / 365250; // thousands of Julian years from 2000
                return t;
            }
        }, {
            key: 'getGAST',

            // Greenwich Apparent Sidereal Time
            value: function getGAST(timestamp) {
                // compute the number of days and fraction (+ or -) from 2000 January 1, 12h UT, Julian date 2451545.0
                var JD = MathUtils.timestampToJulianDate(timestamp);
                var D = MathUtils.getDaysSinceEpoch2000(JD);
                // Greenwich mean sidereal time
                // Alternative formula with a loss of precision of 0.1 second per century 
                var GMST = 18.697374558 + 24.06570982441908 * D;

                // the Longitude of the ascending node of the Moon
                var OMEGA = 125.04 - 0.052954 * D;
                // the Mean Longitude of the Sun
                var L = 280.47 + 0.98565 * D;
                // the obliquity
                var EPSILON = 23.4393 - 0.0000004 * D;
                // the nutation in longitude (given in hours approximately)
                var DELTA_PSI = -0.000319 * Math.sin(OMEGA) - 0.000024 * Math.sin(2.0 * L);
                // the equation of the equinoxes
                var eqeq = DELTA_PSI * Math.cos(EPSILON);

                var GAST = GMST + eqeq;
                return GAST;
            }
        }, {
            key: 'getLAST',

            // Local Apparent Sidereal Time
            value: function getLAST(timestamp, observer_longitude_deg) {
                return MathUtils.getGAST(timestamp) + MathUtils.degToHours(observer_longitude_deg);
            }
        }, {
            key: 'getMeanObliquity',

            // Input is Julian Date
            // Uses method defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart   
            value: function getMeanObliquity(JD) {
                var T = undefined,
                    T2 = undefined,
                    T3 = undefined;
                T = (JD - 2451545.0) / 36525; // centuries since 2451545.0 (2000 January 1.5)
                T2 = T * T;
                T3 = T2 * T;
                return THREE.Math.degToRad(23.4392917 - 0.0130041667 * T - 0.00000016667 * T2 + 0.0000005027778 * T3);
            }
        }, {
            key: 'eclipticToEquatorial',

            // Convert from ecliptic lat, lon -> equatorial RA, Dec
            // Inputs: Julian date, lat (rad), lon (rad)
            value: function eclipticToEquatorial(JD, lat, lon) {
                var e = MathUtils.getMeanObliquity(JD);
                var sl = Math.sin(lon);
                var cl = Math.cos(lon);
                var sb = Math.sin(lat);
                var cb = Math.cos(lat);
                var tb = Math.tan(lat);
                var se = Math.sin(e);
                var ce = Math.cos(e);
                var ra = Math.atan2(sl * ce - tb * se, cl);
                var dec = Math.asin(sb * ce + cb * se * sl);
                // Make sure RA is positive
                if (ra < 0) ra += 2 * Math.PI;
                return { ra: ra, dec: dec };
            }
        }]);

        return MathUtils;
    })();

    var Utils = (function () {
        function Utils() {
            _classCallCheck(this, Utils);
        }

        _createClass(Utils, null, [{
            key: 'mergeObjectsRecursive',
            value: function mergeObjectsRecursive(obj1, obj2) {
                var result = {};
                for (var i in obj2) {
                    if (i in obj1 && typeof obj2[i] === 'object' && i !== null) {
                        result[i] = Utils.mergeObjectsRecursive(obj1[i], obj2[i]);
                    } else {
                        result[i] = obj2[i];
                    }
                }
                for (var i in obj1) {
                    if (i in result) {
                        continue;
                    }
                    result[i] = obj1[i];
                }
                return result;
            }
        }, {
            key: 'getTimestamp',
            value: function getTimestamp(date) {
                if (typeof date === 'number') return date;
                if (date instanceof Date) return date.getTime();
                return Date.now();
            }
        }, {
            key: 'getSecondsTimestamp',
            value: function getSecondsTimestamp(date) {
                return Utils.getTimestamp(date) / 1000;
            }
        }, {
            key: 'getVirtualTimestamp',
            value: function getVirtualTimestamp(speed_multiplier, date) {
                if (speed_multiplier === undefined) speed_multiplier = 1;

                if (speed_multiplier == 0) speed_multiplier = 1e-5;
                return (Utils.getTimestamp(date) - START_TIME) * speed_multiplier + START_TIME;
            }
        }, {
            key: 'requestFullScreen',
            value: function requestFullScreen(element) {
                var requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;

                if (requestMethod) {
                    requestMethod.call(element);
                } else if (typeof window.ActiveXObject !== 'undefined') {
                    var wscript = new ActiveXObject('WScript.Shell');
                    if (wscript !== null) {
                        wscript.SendKeys('{F11}');
                    }
                }
            }
        }, {
            key: 'isWebglAvailable',
            value: function isWebglAvailable() {
                try {
                    var canvas = document.createElement('canvas');
                    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
                } catch (e) {
                    return false;
                }
            }
        }, {
            key: 'isMobile',
            value: function isMobile() {
                return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
            }
        }]);

        return Utils;
    })();

    return Planetarium;
});
