(function(root, factory) {
    root.Planetarium = factory();
})(window, function() {

const ANGLE_90 = Math.PI / 2;
const CELESTIAL_DISTANCE = 1000;
const START_TIME = Date.now();

let CURRENT_TIME = START_TIME;


let EVENTS = {
    render: 'onrender'
}

let OPTS = {
    use_sensors: false,
    textures_path: '/textures',
    translation_func: text => text,
    time: null,
    location: {
        latitude: 0,
        longitude: 0
    },
    camera: {
        foV: 50,
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
}

let PARAMS = { // internal options
    renderer: {
        color: 0x0e041c,
        size: {
            width: window.innerWidth,
            height: window.innerHeight,
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
        colors: {'O': 0x9bb0ff, 'B': 0xaabfff, 'A': 0xcad8ff, 'F': 0xfbf8ff, 'G': 0xfff4e8, 'K': 0xffddb4, 'M': 0xffbd6f}, // Harvard spectral classification
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

let TEXTURES = {
    milkyway: 'milkyway.png',
    ground: 'grass.jpg',
    sun: 'sun.png',
    moon: 'moon.png'
};

class Updater {
    static updateParams(el) {
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

    static updateOpts(opts) {
       opts = opts || {};
       OPTS = Utils.mergeObjectsRecursive(OPTS, opts);
    }
    
    static updateTextures() {
        for(let i in TEXTURES) {
            if(TEXTURES[i].startsWith(OPTS.textures_path)) continue;
            TEXTURES[i] = `${OPTS.textures_path}/${TEXTURES[i]}`;
        }
    }
}


class SceneObjectManager {
    constructor() {
        this._container = new THREE.Group();
    }
    
    get container() {
        return this._container;
    }
    
    addObject(obj) {
        this._container.add(obj);
    }
}

class MilkyWayMgr extends SceneObjectManager {
    constructor() {
        super();
        this.init();
    }

    init() {
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
}

class StarsMgr extends SceneObjectManager {
    constructor(stars_data) {
        super();
        this.stars = {};
        this.initShaders();
        this.populateData(stars_data);
    }
    
    populateData(stars_data) {
        for(let star_data of stars_data) {
            let star = {
                id: star_data[0],
                ra: THREE.Math.degToRad(star_data[1]),
                dec: THREE.Math.degToRad(star_data[2]),
                mag: star_data[3],
                type: star_data[4]
            };
            this.stars[star.id] = star;         
        }              
    }  
    
    initVisual(star_names) {
        let star_layers = {}; // sorted by magnitude/spectrum        

        for(let id in this.stars) {
            let star = this.stars[id];                       

            if(star.mag > OPTS.stars.magnitude.limit) continue;
            if(PARAMS.is_mobile && star.mag > OPTS.stars.magnitude.mobile_limit) continue;
            if(!PARAMS.use_webGL && star.mag > OPTS.stars.magnitude.canvas_limit) continue;
            
            let names = star_names[star.id] || [''];
            star.name = names[names.length - 1];            
            
            star.round_mag = Math.max(PARAMS.stars.magnitude.round_limits[0], Math.min(PARAMS.stars.magnitude.round_limits[1], Math.round(star.mag)));
            star.spectral_class = star.type[0] || 'M';
            star.layer_id = star.spectral_class + star.round_mag;
            star.scale = this.getScale(star.round_mag);
            star.color = this.getColor(star.spectral_class);
            star.coords = MathUtils.sphereToCartesian(star.ra, star.dec, PARAMS.stars.distance);            

            if(PARAMS.use_webGL) {
                if(typeof star_layers[star.layer_id] === 'undefined') {
                    star_layers[star.layer_id] = new THREE.Geometry();
                }
                star_layers[star.layer_id].vertices.push(star.coords);
            } else {
               if(typeof star_layers[star.spectral_class] === 'undefined') {
                    star_layers[star.spectral_class] = new THREE.SpriteMaterial({
                        color: 0x000000,
                        map: new THREE.Texture(this.generateSprite(star.color)),
                        blending: THREE.AdditiveBlending,
                        fog: false,
                        transparent: true,
                        opacity: 0.9
                    });
                }                
                let particle = new THREE.Sprite(star_layers[star.spectral_class]);
                particle.position.copy(star.coords);
                let scale = star.scale * 3;
                particle.scale.set(scale, scale, scale);
                particle.layer_id = star.layer_id;
                this.addObject(particle);
            }            

            if(star.mag <= OPTS.stars.magnitude.has_label && star.name.length > 0) {
                star.label = star.mag < OPTS.stars.magnitude.full_label ? star.name : star.name.substr(0, 6);
                star.label_particle = DrawerUtils.addLabel(star.label,
                    {theta: star.ra, phi: star.dec, distance: PARAMS.labels.distance}, 
                    {size: OPTS.stars.fontSize},
                    this.container
                );              
            }      
        }
        
        if(PARAMS.use_webGL) {
            for(let layer_id in star_layers) {
                let layer = star_layers[layer_id];
                let spectral_class = layer_id[0];
                let round_mag = +layer_id.slice(1);
				let material = new THREE.ShaderMaterial({
					uniforms: {
                        color: {type: 'c', value: new THREE.Color(this.getColor(spectral_class))},
                        scale: {type: 'f', value: this.getScale(round_mag)}
					},
					vertexShader: this.vertex_shader,
					fragmentShader: this.fragment_shader,
                    sizeAttenuation: false,
					blending: THREE.AdditiveBlending,
					transparent: true,
					depthTest: true
				});                
                let particles = new THREE.PointCloud(layer, material);
                particles.layer_id = layer_id;
                this.addObject(particles);
            }
        }        
    }     

    initShaders() {
        this.vertex_shader =
           `uniform float scale;
            void main() {
                gl_PointSize = scale;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`;
    
        this.fragment_shader =
           `uniform vec3 color;
            void main() {
                float cutoff = 0.15;
                float radius = distance(vec2(0.5, 0.5), gl_PointCoord);
                float alpha = 1.0 - min((radius - cutoff) / (0.5 - cutoff), 1.0);
                gl_FragColor = vec4(color, alpha);
            }`;
    }
    
    getScale(i) {
        return PARAMS.stars.scales[i] || PARAMS.stars.scales[PARAMS.stars.scales.length - 1];
    }
    
    getColor(spectral_class) {
        return PARAMS.stars.colors[spectral_class] || PARAMS.stars.colors['M'];
    }
    
    generateSprite(color) {
        let canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;

        let context = canvas.getContext('2d');
        let gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.1, DrawerUtils.numberToCSSColor(color));
        gradient.addColorStop(0.6, 'rgba(0,0,0,1)');

        context.fillStyle = gradient;
        context.fillRect(0, 0, canvas.width, canvas.height);

        return canvas;
    }
}

class ConstellationsMgr extends SceneObjectManager {
    constructor(stars, constellations_data) {
        super();
        this.stars = stars;
        this.init(constellations_data);        
    }

    init(constellations_data) {
        let material = new THREE.LineBasicMaterial({
            color: OPTS.constellations.line.color,
            opacity: OPTS.constellations.line.opacity,
            linewidth: OPTS.constellations.line.width,
            vertexColors: false,
            fog: false,
            transparent: true
        });        
        
        for(let constellation of constellations_data) {
            let star_pairs = constellation[2];
            let stars = this.findConstellationStars(star_pairs);
            
            if(stars.length <= 0) continue;
            
            let label_coords_accum = new THREE.Vector3();
            let accum_c = 0;
            for(let star_pair of stars) {
                let geometry = new THREE.Geometry();
                for(let star of star_pair) {
                    let coords = MathUtils.sphereToCartesian(star.ra, star.dec, PARAMS.constellations.distance);
                    geometry.vertices.push(coords);
                    label_coords_accum.add(MathUtils.sphereToCartesian(star.ra, star.dec, PARAMS.labels.distance));   
                    accum_c++;
                }
                this.addObject(new THREE.Line(geometry, material));
            }
            label_coords_accum.divideScalar(accum_c);
            DrawerUtils.addLabel(constellation[1],
                label_coords_accum, 
                {size: OPTS.constellations.fontSize, color: OPTS.constellations.fontColor},
                this.container
            );
        }
    }

    findConstellationStars(star_pairs) {
        let stars = [];
        for(let star_pair of star_pairs) {
            let temp = [];
            for(let star_id of star_pair) {
                let star = this.stars[star_id];
                if(typeof star === 'undefined') return [];
                temp.push(star);
            }
            stars.push(temp);
        }
        return stars;
    }    
}

class CardinalPointsMgr extends SceneObjectManager {
    constructor() {
        super();
        this.init();
    }
    
    init() {
        let transl = OPTS.translation_func;
        this.addPoint(transl("East"),   0, 0, -1);
        this.addPoint(transl("South"),  1, 0,  0);
        this.addPoint(transl("West"),   0, 0,  1);
        this.addPoint(transl("North"), -1, 0,  0);        
    }

    addPoint(text, ...xyz) {
        let coords = new THREE.Vector3(...xyz);
        coords.multiplyScalar(PARAMS.cardinal_points.distance);
        coords.applyMatrix4(new THREE.Matrix4().makeTranslation(0, PARAMS.cardinal_points.offset, 0));
        let label = DrawerUtils.addLabel(text, coords, {
            size: OPTS.cardinal_points.fontSize,
            color: OPTS.cardinal_points.fontColor, 
            opacity: OPTS.cardinal_points.opacity
        }, this.container);
    }    
}


class SolarSystemObjectMgr extends SceneObjectManager {
    constructor() {
        super();
        this.distance = PARAMS.solar_system.distance;
        this.position = {
            ecliptic: {
                geocentric: {
                    spherical: {lon: null, lat: null},
                    cartesian: new THREE.Vector3()
                },
                heliocentric: {
                    spherical: {lon: null, lat: null},
                    cartesian: new THREE.Vector3()
                }
            },
            equatorial: {
                spherical: {ra: null, dec: null},
                cartesian: MathUtils.sphereToCartesian(0, 0, this.distance)
            }
        };
    }
    
    init() {
        this.setMaterial();
        this.initObject3D();
        this.initLabelObject();        
    }

    setPos(...args) {
        this.setEclipticHeliocentricPosition(this.JD, ...args);
        this.setEclipticGeocentricPosition(this.JD, ...args);
        this.position.equatorial.spherical = MathUtils.eclipticToEquatorial(this.JD, this.position.ecliptic.geocentric.spherical.lat, this.position.ecliptic.geocentric.spherical.lon);
        this.position.equatorial.cartesian.copy(MathUtils.sphereToCartesian(this.position.equatorial.spherical.ra, this.position.equatorial.spherical.dec, this.distance));
    }
    
    setObjPos() {
        if(PARAMS.use_webGL) {
            this.gl_setObjPos();         
        } else {
            this._object3D.position.copy(this.position.equatorial.cartesian);
        }
    }
    
    gl_setObjPos() {
        this._object3D.geometry.vertices[0].copy(this.position.equatorial.cartesian);
        this._object3D.geometry.verticesNeedUpdate = true;
    }
    
    setLabelPos() {
        let label_pos;
        if(PARAMS.use_webGL) {
            label_pos = this._labelObject3D.geometry.vertices[0];
            this._labelObject3D.geometry.verticesNeedUpdate = true;            
        } else {
            label_pos = this._labelObject3D.position;
        }
        label_pos.copy(MathUtils.sphereToCartesian(this.position.equatorial.spherical.ra, this.position.equatorial.spherical.dec, PARAMS.labels.distance));        
    }
    
    update(JD, ...args) {
        this.JD = JD; 
        this.D = MathUtils.getDaysSinceEpoch2010(JD);        
        this.setPos(...args);
        this.setObjPos();
        this.setLabelPos();
    }
    
    setEclipticGeocentricPosition(JD) {
        throw 'Not implemented';
    }
    
    setEclipticHeliocentricPosition(JD) {
    }    

    initObject3D() {
        if(PARAMS.use_webGL) {
            this.gl_initObject3D();
        } else {
            this._object3D = new THREE.Sprite(this.material);
            this._object3D.position.copy(this.position.equatorial.cartesian);           
            this._object3D.scale.set(this.material.scale, this.material.scale, this.material.scale);
        }
        this.addObject(this._object3D);
    }
    
    gl_initObject3D() {
        let geometry = new THREE.Geometry();
        geometry.vertices.push(this.position.equatorial.cartesian);
        this._object3D = new THREE.PointCloud(geometry, this.material);
    }
    
    initLabelObject() {
        this._labelObject3D = DrawerUtils.addLabel(this.label, 
            {theta: 0, phi: 0, distance: PARAMS.labels.distance}, 
            {size: OPTS.solar_system.fontSize, color: OPTS.solar_system.fontColor}
        );
        this.addObject(this._labelObject3D);
    }
    
    setMaterial(sun) {
        throw 'Not implemented';
    }   
    
    calculateBrightLimbPositionAngle(sun) {
        let position_angle = Math.atan2(
            Math.cos(sun.position.equatorial.spherical.dec) * Math.sin(sun.position.equatorial.spherical.ra - this.position.equatorial.spherical.ra),
            Math.cos(this.position.equatorial.spherical.dec) * Math.sin(sun.position.equatorial.spherical.dec) - Math.sin(this.position.equatorial.spherical.dec) * Math.cos(sun.position.equatorial.spherical.dec) * Math.cos(sun.position.equatorial.spherical.ra - this.position.equatorial.spherical.ra)
        );
        let norm_position_angle = position_angle + ANGLE_90;
        return norm_position_angle;
    }    
    
    calculateDailyMotion(period) {
        return 360 / 365.242191 / period;
    }
    
    /**
    * D - Number of days since the epoch of 2010 January 0.0
    * return - Mean Anomaly (degrees 0..360)
    */
    calculateMeanAnomaly(D, epochLongitude, perihelionLongitude, period=1) {
        let n = this.calculateDailyMotion(period);
        let M = n * D + epochLongitude - perihelionLongitude;
        return MathUtils.normalizeAngle360(M);
    }
    
    /**
    * M - Mean Anomaly (degrees)
    * e - Eccentricity
    * return - True Anomaly (degrees 0..360)
    */    
    calculateTrueAnomaly(M, e) {
        M = THREE.Math.degToRad(M);
        let e_p3 = Math.pow(e, 3);
        let v = M + (2 * e - e_p3 / 4) * Math.sin(M) + 5/4 * e*e * Math.sin(2*M) + 13/12 * e_p3 * Math.sin(3*M);      
        v = THREE.Math.radToDeg(v);
        return MathUtils.normalizeAngle360(v);
    }

    /**
    * a - semi-major axis
    * e - Eccentricity
    * v - true anomaly
    */     
    calculateRadiusVector(a, e, v) {
        return a * (1 - e*e) / (1 + e * Math.cos(THREE.Math.degToRad(v)));
    }
}

class SunMgr extends SolarSystemObjectMgr {
    constructor() {
        super();
        this.label = OPTS.translation_func('Sun');
        this.init();
    }

    setMaterial() {
        this.texture = THREE.ImageUtils.loadTexture(TEXTURES.sun);
        let scale = 160;
        if(PARAMS.use_webGL) {
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

    // Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
    setEclipticGeocentricPosition(JD) {
        let eg, wg, e, Mo, v, lon, lat;        
        // Calculated for epoch 2010.0. If T is the number of Julian centuries since 1900 January 0.5 = (JD-2415020.0)/36525
        eg = 279.557208;	// mean ecliptic longitude in degrees = (279.6966778 + 36000.76892*T + 0.0003025*T*T)%360;
        wg = 283.112438;	// longitude of the Sun at perigee in degrees = 281.2208444 + 1.719175*T + 0.000452778*T*T;
        e = 0.016705;	// eccentricity of the Sun-Earth orbit in degrees = 0.01675104 - 0.0000418*T - 0.000000126*T*T;
        this.Mo = this.calculateMeanAnomaly(this.D, eg, wg);
        v = this.calculateTrueAnomaly(this.Mo, e);
        lon = THREE.Math.degToRad(MathUtils.normalizeAngle360(v + wg));
        lat = 0; // ecliptic latitude is zero because the Sun is in the ecliptic
        this.position.ecliptic.geocentric.spherical = {lon, lat};
    }
}

class MoonMgr extends SolarSystemObjectMgr {
    constructor() {
        super();
        this.label = OPTS.translation_func('Moon');
        this.initShaders();
        this.init();
    }

    setPos(sun) {
        super.setPos(sun);
        if(PARAMS.use_webGL) {
            this.position_angle = this.calculateBrightLimbPositionAngle(sun);
            this.phase = this.getPhase(sun);

            // TODO: do more testing for phase, position angle and its shaders
            let shader_phase = MathUtils.mapToRange(this.phase, 0.0, 1.0, -1.0, 1.0);
            let shader_position_angle = this.position_angle;

            if(OPTS.location.latitude < 0) shader_position_angle += Math.PI;
            if(shader_phase < 0) shader_position_angle += Math.PI;

            this.material.uniforms.phase.value = shader_phase;
            this.material.uniforms.position_angle.value = shader_position_angle;
        }
    }

    setMaterial() {  
        let scale = 25;
        this.texture = THREE.ImageUtils.loadTexture(TEXTURES.moon);
        if(PARAMS.use_webGL) {
            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    scale: {type: 'f', value: scale},
                    map: {type: 't', value: this.texture},
                    phase: {type: 'f', value: 0},
                    position_angle: {type: 'f', value: 0}
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
                fog: false,
            });
            this.material.scale = scale * 2;
        }
    }
    
    initShaders() {
        this.vertex_shader =
           `uniform float scale;
            void main() {
                gl_PointSize = scale;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`;
    
        this.fragment_shader =
           `uniform sampler2D map;
            uniform float phase;
            uniform float position_angle;

            // Corrections for internal coordinate system
            float normalizeAngle(float angle) {
                return -angle;
            }

            float normalizePhase(float phase) {
                float res = phase;
                if(res == 0.0) res = 1e-7;
                return res;
            }

            void main() {
                float norm_phase = normalizePhase(phase);                
                float norm_position_angle = normalizeAngle(position_angle);

                float moon_radius = 0.5;
                vec2 moon_pos = vec2(0.5, 0.5);               

                float shadow_radius = moon_radius / sqrt(abs(norm_phase));
                float shadow_distance = sqrt(shadow_radius*shadow_radius - moon_radius*moon_radius);
                vec2 shadow_pos = moon_pos + vec2(shadow_distance * cos(norm_position_angle), shadow_distance * sin(norm_position_angle));

                // circle equation
                bool has_shadow_test = pow(gl_PointCoord.x - shadow_pos.x, 2.0) + pow(gl_PointCoord.y - shadow_pos.y, 2.0) > shadow_radius*shadow_radius;
                if(norm_phase < 0.0) has_shadow_test = !has_shadow_test;

                gl_FragColor = texture2D(map, gl_PointCoord);
                if(has_shadow_test) {
                    gl_FragColor *= vec4(0.0, 0.0, 0.0, 0.3);
                }
            }`;
    }
    
    setEclipticHeliocentricPosition(JD, sun) {
        let lo, Po, e, l, Mm, C, Ev, Ae, A3, Mprimem, Ec, A4, lprime, V, lprimeprime, sinMo;

        lo = 91.929336;	// Moon's mean longitude at epoch 2010.0
        Po = 130.143076; // mean longitude of the perigee at epoch        
        e = 0.0549;	// eccentricity of the Moon's orbit    
        
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
        this.position.ecliptic.heliocentric.spherical = {lon: lprimeprime, lat: 0};        
    }
    
    // Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
    setEclipticGeocentricPosition(JD, sun) {
        let N, No, i, sinMo, Nprime, lppNp, sinlppNp, y, x, lm, Bm;
        
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
        this.position.ecliptic.geocentric.spherical = {lon: lm, lat: Bm};
    }
    
    getPhaseAngle(sun) {
        return this.position.ecliptic.heliocentric.spherical.lon - sun.position.ecliptic.geocentric.spherical.lon;
    }
    
    getPhase(sun) {       
        let d = this.getPhaseAngle(sun);
        return (1 - Math.cos(d)) / 2;
    }    
}

class PlanetMgr extends SolarSystemObjectMgr {
    constructor(name, vsop87c) {
        super();
        this.position.heliocentric = new THREE.Vector3();
        this.julian_day = 0;
        
        this.name = name;
        this.label = OPTS.translation_func(name);
        
        this.vsop87c = vsop87c;
        
        this.initShaders();
        this.init();        
    }

    setMaterial() {
        let scale = 10;
        let color = OPTS.solar_system.planets_color;
        if(PARAMS.use_webGL) {
            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    color: {type: 'c', value: new THREE.Color(color)},
                    scale: {type: 'f', value: scale}
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
    
    initShaders() {
        this.vertex_shader =
           `uniform float scale;
            void main() {
                gl_PointSize = scale;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }`;
    
        this.fragment_shader =
           `uniform vec3 color;
            void main() {
                float cutoff = 0.49;
                float radius = distance(vec2(0.5, 0.5), gl_PointCoord);
                float alpha = 1.0 - min((radius - cutoff) / (0.5 - cutoff), 1.0);
                gl_FragColor = vec4(color, alpha);
            }`;
    }
    
    generateSprite(color) {
        let radius = 15;
        let canvas = document.createElement('canvas');
        canvas.width = 160;
        canvas.height = 160;

        let context = canvas.getContext('2d');

        let centerX = canvas.width / 2;
        let centerY = canvas.height / 2;        

        context.beginPath();
        context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
        context.fillStyle = DrawerUtils.numberToCSSColor(color);
        context.fill();
        context.stroke();

        return canvas;
    }    
    
    calculateTerms(t, terms) {
        let res = 0;
        for(let i in terms) {
            let temp = 0;
            for(let term of terms[i]) {
                let line_res;
                if(typeof term === 'number') {
                    line_res = term;
                } else {
                    line_res = term[0] * Math.cos(term[1] + term[2] * t);
                }
                temp += line_res;
            }
            res += temp * Math.pow(t, i);
        }
        return res;
    }
    
    setEclipticHeliocentricPosition(JD) {             
        let julian_day = Math.trunc(MathUtils.getDaysSinceEpoch2000(JD));
        if(julian_day == this.julian_day) { // calculate position once per day
            return;
        }
        this.julian_day = julian_day;
        
        let res = new THREE.Vector3();        
        let t = MathUtils.getMillenniaSinceEpoch2000(JD);

        this.position.ecliptic.heliocentric.cartesian.set(
            this.calculateTerms(t, this.vsop87c.X),
            this.calculateTerms(t, this.vsop87c.Y),
            this.calculateTerms(t, this.vsop87c.Z)
        );
    }
    
    setEclipticGeocentricPosition(JD, earth) {
        let geocentric_pos = new THREE.Vector3();
        geocentric_pos.copy(this.position.ecliptic.heliocentric.cartesian);
        geocentric_pos.sub(earth.position.ecliptic.heliocentric.cartesian);

        let lon = Math.atan2(geocentric_pos.y, geocentric_pos.x);
        let lat = Math.atan2(geocentric_pos.z, Math.sqrt(Math.pow(geocentric_pos.x, 2) + Math.pow(geocentric_pos.y, 2)));

        this.position.ecliptic.geocentric.cartesian.copy(geocentric_pos);
        this.position.ecliptic.geocentric.spherical = {lon, lat};
    }
    
    getPhaseAngle(sun) {
        return sun.position.ecliptic.geocentric.spherical.lon - this.position.ecliptic.heliocentric.spherical.lon;
    }
    
    getPhase(sun) {       
        let d = this.getPhaseAngle(sun);
        return (1 + Math.cos(d)) / 2;
    }    
}

class PlanetsMgr extends SceneObjectManager {
    constructor(planets_data) {
        super();
        this.init(planets_data);
    }
    
    init(planets_data) {
        this.planets_data = planets_data;
        this.initPlanets();
    }
    
    update(JD) {
        this.earth.setEclipticHeliocentricPosition(JD);
        for(let planet_name in this.planets) {
            this.planets[planet_name].update(JD, this.earth);
        }            
    }
    
    initPlanets() {
        this.planets = {};
        for(let planet_name in this.planets_data) {
            if(planet_name.toLowerCase() == 'earth') {
                this.earth = new PlanetMgr(planet_name, this.planets_data[planet_name]);
            } else {
                this.planets[planet_name] = new PlanetMgr(planet_name, this.planets_data[planet_name]);
                this.addObject(this.planets[planet_name].container);
            }
        }        
    }
}

class SolarSystemMgr extends SceneObjectManager {
    constructor(planets_data) {
        super();
        this.init(planets_data);        
    }       

    init(planets_data) {
        this.sun_mgr = new SunMgr();
        this.addObject(this.sun_mgr.container);
        this.moon_mgr = new MoonMgr();
        this.addObject(this.moon_mgr.container);
        this.planets_mgr = new PlanetsMgr(planets_data);
        this.addObject(this.planets_mgr.container);
    }
    
    render(timestamp) {
        let JD = MathUtils.timestampToJulianDate(timestamp);
        this.sun_mgr.update(JD);
        this.planets_mgr.update(JD);
        this.moon_mgr.update(JD, this.sun_mgr);        
    }
}


class CelestialSphereMgr extends SceneObjectManager {
    constructor(stars, star_names, constellations) {
        super();
        this.rotation = {
            azimuth: 0,
            polar: 0
        };
        this.init(stars, star_names, constellations);
    }

    render(timestamp) {
        this.setObserver(timestamp);
        if(typeof this.solar_system_mgr !== 'undefined') {
            this.solar_system_mgr.render(timestamp);
        }
    }
    
    getRotation(timestamp) {
        // rotate according to hour angle
        let last_hours = MathUtils.getLAST(timestamp, OPTS.location.longitude);
        let last = THREE.Math.degToRad(MathUtils.hoursToDeg(last_hours));       
        let azimuth = new THREE.Matrix4().makeRotationY(-last);

        let north_horizon_dec = MathUtils.getNorthHorizonDeclination(OPTS.location.latitude);
        let polar = new THREE.Matrix4().makeRotationZ(north_horizon_dec);
        
        return {azimuth, polar};
    }
    
    setObserver(timestamp) {
        this.rotation = this.getRotation(timestamp);        
        this.container.matrix.identity();          
        this.container.applyMatrix(this.rotation.azimuth);
        this.container.applyMatrix(this.rotation.polar);
    }    

    init(stars, star_names, constellations) {            
        if(OPTS.milkyway.visible) {
            this.milky_way_mgr = new MilkyWayMgr();
            this.addObject(this.milky_way_mgr.container);          
        }
        if(OPTS.stars.visible || OPTS.constellations.visible) {
            this.stars_mgr = new StarsMgr(stars);
            if(OPTS.stars.visible) {
                this.stars_mgr.initVisual(star_names);
                this.addObject(this.stars_mgr.container);
            }
            if(OPTS.constellations.visible) {
                this.constellations_mgr = new ConstellationsMgr(this.stars_mgr.stars, constellations);
                this.addObject(this.constellations_mgr.container);
            }
        }
        if(OPTS.solar_system.visible) {
            this.solar_system_mgr = new SolarSystemMgr(planets_data);
            this.addObject(this.solar_system_mgr.container);           
        }        
    }    
}

class AtmosphereMgr extends SceneObjectManager {
    constructor() {
        super();
        this.init();
    }
    
    render(sun_pos, rotation) {
        this.sky.uniforms.sunPosition.value.copy(sun_pos);
        this.sky.uniforms.sunPosition.value.applyMatrix4(rotation.azimuth);
        this.sky.uniforms.sunPosition.value.applyMatrix4(rotation.polar);        
    }
    
    init() {
        this.sky = new THREE.Sky(PARAMS.atmosphere.distance);
        this.addObject(this.sky.mesh);
        this.updateUniforms();
    }
    
    updateUniforms() {
        let uniforms = this.sky.uniforms;
        uniforms.reileigh.value = 0.8;
        uniforms.mieCoefficient.value = 0.003;
        uniforms.mieDirectionalG.value = 0.99;
    }
}    

class GroundMgr extends SceneObjectManager {
    constructor() {
        super();
        this.init();
    }
    
    init() {
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
}


class Drawer {    
    constructor(planetarium) {
        this.planetarium = planetarium;
        this.init();
    }
    
    init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(OPTS.camera.foV, PARAMS.camera.aspectRatio, PARAMS.camera.near, PARAMS.camera.far);

        this.initRenderer();
        this.initControls();
        this.registerListeners();
        this.fillScene();          
    }
    
    animate() {
        requestAnimationFrame(this.animate.bind(this));
        this.render();
    }
    
    render() {
        this.renderScene();
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
        this.planetarium.dispatchEvent(EVENTS.render);
    }

    getTimestamp() {
        let time = OPTS.time;
        if(typeof(time) === "function") {
            time = time();
        }        
        CURRENT_TIME = Utils.getTimestamp(time);
        return Utils.getSecondsTimestamp(time);
    }
    
    renderScene() {
        let timestamp = this.getTimestamp();
        
        this.celestial_sphere.render(timestamp);
        if(typeof this.atmosphere !== 'undefined') {
            let sun_pos = this.celestial_sphere.solar_system_mgr.sun_mgr.position.equatorial.cartesian;
            let rotation = this.celestial_sphere.rotation;
            this.atmosphere.render(sun_pos, rotation);
        }              
    }
    
    fillScene() {
        this.celestial_sphere = new CelestialSphereMgr(stars, star_names, constellations);
        this.scene.add(this.celestial_sphere.container);
        if(OPTS.cardinal_points.visible) {
            this.cardinal_points = new CardinalPointsMgr();
            this.scene.add(this.cardinal_points.container);
        } 
        if(OPTS.atmosphere.visible && PARAMS.use_webGL) {
            this.atmosphere = new AtmosphereMgr();
            this.scene.add(this.atmosphere.container);
        }
        if(OPTS.ground.visible && PARAMS.use_webGL) {
            this.ground = new GroundMgr();
            this.scene.add(this.ground.container);
        }         
    }   

    initRenderer() {
        if (PARAMS.use_webGL) {
            this.renderer = new THREE.WebGLRenderer({clearAlpha: 1, antialias: true, preserveDrawingBuffer: true});
        } else {
            this.renderer = new THREE.CanvasRenderer({clearAlpha: 1, antialias: true});
            DrawerUtils.drawText(OPTS.translation_func('Software rendering mode.'), undefined, undefined, this.planetarium.el);
        }
        this.renderer.setSize(PARAMS.renderer.size.width, PARAMS.renderer.size.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(PARAMS.renderer.color, 1);
        this.renderer.shadowMapType = THREE.PCFSoftShadowMap;        
    }
    
    initControls() {
        let _params;
        if(OPTS.use_sensors && PARAMS.is_mobile) {
            this.controls = new THREE.DeviceOrientationControls(this.camera);
            _params = PARAMS.controls.sensors;            
        } else {
            this.controls = new THREE.SightControls(this.camera, this.renderer.domElement);
            _params = PARAMS.controls.mouse;
        }
        for(let i in _params) {
            if(_params[i] !== undefined) {
                this.controls[i] = _params[i];
            }
        }
    }

    registerListeners() {
        window.addEventListener('resize', () => {
            Updater.updateParams(this.planetarium.el);
            this.renderer.setSize(PARAMS.renderer.size.width, PARAMS.renderer.size.height);
            this.camera.aspect = PARAMS.camera.aspectRatio;
            this.camera.updateProjectionMatrix();
        });
    };         
}

class Planetarium {
    constructor(el, opts) {
        this.el = el;

        Updater.updateParams(el);
        Updater.updateOpts(opts);
        Updater.updateTextures();

        let drawer = new Drawer(this);
        this.canvas = drawer.renderer.domElement;
        this.el.appendChild(this.canvas);
        drawer.animate();
    }
    
    requestFullScreen() {
        Utils.requestFullScreen(this.el);
        return this;
    }
    
    setTimeSpeed(multiplier) {
        OPTS.time = () => Utils.getVirtualTimestamp(multiplier);
        return this;
    }    
    
    get date() {
        return new Date(CURRENT_TIME);
    }
    
    get events() {
        return Utils.mergeObjectsRecursive({}, EVENTS);
    }
    
    dispatchEvent(event_tag, data) {
        data = data || {};
        let detail = Utils.mergeObjectsRecursive({planetarium: this}, data);
        this.el.dispatchEvent(new CustomEvent(event_tag, {detail}));
    }    
}

class DrawerUtils {
    static addLabel(text, coords, font, target) {
        coords = MathUtils.getCartesianCoords(coords);
        let texture = DrawerUtils.getTextTexture(text, font);
        let material;
        if(PARAMS.use_webGL) {
            material = new THREE.PointCloudMaterial({   
                color: 0xffffff,
                sizeAttenuation: false,
                transparent: true,
                size: Math.floor(texture.image.width / 2.7),
                depthWrite: false
            });
        } else {
            material = new THREE.SpriteMaterial({color: 0xffffff});
            material.color.setHSL(1, 1, 1);
        }
        material.map = texture;
        material.fog = false;
        material.opacity = font.opacity || 1;

        let particle;
        if(PARAMS.use_webGL) {
            let geometry = new THREE.Geometry();
            geometry.vertices.push(coords);
            particle = new THREE.PointCloud(geometry, material);                    
        } else {
            particle = new THREE.Sprite(material);
            particle.position.copy(coords);
            let scale = material.map.image.width / 2;
            particle.scale.set(scale, scale, scale);                                       
        }

        if(typeof target !== 'undefined') {
            target.add(particle);
        }
        return particle;
    }
    
    static drawText(text, pos, style, el) {
        pos = pos || {x: 10, y: 10};
        style = style || {width: 100, height: 100, backgroundColor: 'transparent', color: 'white'};
        let text_el = document.createElement('div');
        text_el.style.position = 'absolute';
        //text_el.style.zIndex = 1;
        text_el.style.width = style.width;
        text_el.style.height = style.height;
        text_el.style.backgroundColor = style.backgroundColor;
        text_el.style.color = style.color;
        text_el.innerHTML = text;
        if(typeof el !== 'undefined') {
            text_el.style.top = el.style.top + pos.x + 'px';
            text_el.style.left = el.style.left + pos.y + 'px';
            el.appendChild(text_el); 
        }
        return text_el;
    }

    static getTextTexture(text, font) {
        let _font = {
            family: 'Arial',
            size: 24,
            color: '#888888'
        };
        if(typeof font !== "undefined") {
            _font = Utils.mergeObjectsRecursive(_font, font);
        }
        
        if(typeof _font.color === 'number') {
            _font.color = DrawerUtils.numberToCSSColor(_font.color);
        }

        let canvas = document.createElement('canvas');
        let context = canvas.getContext('2d');
        context.font = `${_font.size}px ${_font.family}`;
        let textMeasure = context.measureText(text);

        canvas = document.createElement('canvas');
        canvas.width = 2 * textMeasure.width + 20; // _font.size * text.length;
        canvas.height = canvas.width; // _font.size * text.length;
        context = canvas.getContext('2d');
        context.font = `${_font.size}px ${_font.family}`;
        context.fillStyle = _font.color;
        context.fillText(text, 0, canvas.height / 2 + _font.size / 2);
        
        let tex = new THREE.Texture(canvas);
        tex.needsUpdate = true;
        tex.minFilter = THREE.NearestFilter;
        return tex;
    }

    static numberToCSSColor(number) {
        let res = number.toString(16);
        while(res.length < 6) res = '0' + res;
        return '#' + res;
    }    
}

class MathUtils {
    // Corrections for internal coordinate system
    static normalizeAzimuthalAngle(angle) {
        return ANGLE_90 - angle;
    }

    static getNorthHorizonDeclination(observer_latitude_deg) {
        let res = 90 - observer_latitude_deg;
        return THREE.Math.degToRad(res);
    }    
    
    // Makes an angle to be in range from 0 to 360 degrees
    static normalizeAngle360(angle) {
        // reduce the angle  
        angle = angle % 360; 
        // force it to be the positive remainder, so that 0 <= angle < 360  
        angle = (angle + 360) % 360;
        return angle;
    }
    
    // Makes an angle to be in range from -180 to +180 degrees
    static normalizeAngle180(angle) {
        angle = MathUtils.normalizeAngle360(angle);
        if (angle > 180) angle -= 360;
        return angle;
    }
    
    static mapToRange(old_val, old_min, old_max, new_min, new_max) {
        let old_range = old_max - old_min;
        let new_range = new_max - new_min;
        return (((old_val - old_min) * new_range) / old_range) + new_min;
    }

    static sphereToCartesian(theta, phi, radius=1) {
        theta = MathUtils.normalizeAzimuthalAngle(theta);
        let cosPhi = Math.cos(phi);
        let vec = new THREE.Vector3(
            Math.sin(theta) * cosPhi,
            Math.sin(phi),
            -Math.cos(theta) * cosPhi
        );
        vec.multiplyScalar(radius);
        return vec;
    }
    
    static getCartesianCoords(coords) {
        if(coords instanceof THREE.Vector3) {
            return coords;
        }
        coords = coords || {};
        if('theta' in coords && 'phi' in coords && 'distance' in coords) {
            return MathUtils.sphereToCartesian(coords.theta, coords.phi, coords.distance);
        }
        if('ra' in coords && 'dec' in coords && 'distance' in coords) {
            return MathUtils.sphereToCartesian(coords.ra, coords.dec, coords.distance);
        }
        if('JD' in coords && 'lat' in coords && 'lon' in coords && 'distance' in coords) {
            let eq = MathUtils.eclipticToEquatorial(coords.JD, coords.lat, coords.lon);
            return MathUtils.sphereToCartesian(eq.ra, eq.dec, coords.distance);
        }        
        throw `Invalid coords "${coords}"`;     
    }

    static hoursToDeg(hours) {
        // 360 deg / 24h = 15 deg
        return hours * 15.0;
    }

    static degToHours(deg) {
        // 360 deg / 24h = 15 deg
        return deg / 15.0;
    }  
    
    static timestampToJulianDate(timestamp) {
        // The Julian Date of the Unix Time epoch is 2440587.5
        return timestamp / 86400.0 + 2440587.5;
    }
    
    static getDaysSinceEpoch2010(JD) {
        let D = JD - 2455196.5;	// Number of days since the epoch of 2010 January 0.0
        return D;
    }
    
    static getDaysSinceEpoch2000(JD) {
        let D = JD - 2451545.0;	// Number of days since the epoch of 2000 January 0.0
        return D;
    }
    
    static getMillenniaSinceEpoch2000(JD) {
        let D = MathUtils.getDaysSinceEpoch2000(JD);
        let t = D / 365250; // thousands of Julian years from 2000
        return t;
    }

    // Greenwich Apparent Sidereal Time
    static getGAST(timestamp) {
        // compute the number of days and fraction (+ or -) from 2000 January 1, 12h UT, Julian date 2451545.0
        let JD = MathUtils.timestampToJulianDate(timestamp);
        let D = MathUtils.getDaysSinceEpoch2000(JD);
        // Greenwich mean sidereal time
        // Alternative formula with a loss of precision of 0.1 second per century  
        let GMST = 18.697374558 + 24.06570982441908 * D;
        
        // the Longitude of the ascending node of the Moon
        let OMEGA = 125.04 - 0.052954 * D;
        // the Mean Longitude of the Sun
        let L = 280.47 + 0.98565 * D;
        // the obliquity
        let EPSILON = 23.4393 - 0.0000004 * D;
        // the nutation in longitude (given in hours approximately)
        let DELTA_PSI = -0.000319 * Math.sin(OMEGA) - 0.000024 * Math.sin(2.0 * L);
        // the equation of the equinoxes
        let eqeq = DELTA_PSI * Math.cos(EPSILON);

        let GAST = GMST + eqeq;
        return GAST;
    }

    // Local Apparent Sidereal Time
    static getLAST(timestamp, observer_longitude_deg) {
        return MathUtils.getGAST(timestamp) + MathUtils.degToHours(observer_longitude_deg);
    }
    
    // Input is Julian Date
    // Uses method defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart    
    static getMeanObliquity(JD) {
        let T, T2, T3;
        T = (JD - 2451545.0) / 36525; // centuries since 2451545.0 (2000 January 1.5)
        T2 = T * T;
        T3 = T2 * T;
        return THREE.Math.degToRad(23.4392917 - 0.0130041667 * T - 0.00000016667 * T2 + 0.0000005027778 * T3);
    }
    
    // Convert from ecliptic lat, lon -> equatorial RA, Dec
    // Inputs: Julian date, lat (rad), lon (rad)
    static eclipticToEquatorial(JD, lat, lon) {
        let e = MathUtils.getMeanObliquity(JD);
        let sl = Math.sin(lon);
        let cl = Math.cos(lon);
        let sb = Math.sin(lat);
        let cb = Math.cos(lat);
        let tb = Math.tan(lat);
        let se = Math.sin(e);
        let ce = Math.cos(e);
        let ra = Math.atan2(sl * ce - tb * se, cl);
        let dec = Math.asin(sb * ce + cb * se * sl);
        // Make sure RA is positive
        if(ra < 0) ra += 2 * Math.PI;
        return {ra, dec};
    }
}

class Utils {
    static mergeObjectsRecursive(obj1, obj2) {
        let result = {};
        for(let i in obj2) {
            if((i in obj1) && (typeof obj2[i] === "object") && (i !== null)) {
                result[i] = Utils.mergeObjectsRecursive(obj1[i], obj2[i]); 
            } else {
               result[i] = obj2[i];
            }
        }
        for(let i in obj1) {
            if(i in result) {
                continue;
            }
            result[i] = obj1[i];
        }
        return result;
    }
        
    static getTimestamp(date) {
        if(typeof date === 'number') return date;
        if(date instanceof Date) return date.getTime();
        return Date.now();
    }    
    
    static getSecondsTimestamp(date) {
        return Utils.getTimestamp(date) / 1000;
    }
    
    static getVirtualTimestamp(speed_multiplier=1, date) {
        if(speed_multiplier == 0) speed_multiplier = 1e-5;
        return (Utils.getTimestamp(date) - START_TIME) * speed_multiplier + START_TIME;
    }

    static requestFullScreen(element) {
        let requestMethod = element.requestFullScreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;

        if(requestMethod) {
            requestMethod.call(element);
        } else if(typeof window.ActiveXObject !== "undefined") {
            let wscript = new ActiveXObject("WScript.Shell");
            if (wscript !== null) {
                wscript.SendKeys("{F11}");
            }
        }
    }

    static isWebglAvailable() {
        try {
            let canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch(e) {
            return false;
        }
    }

    static isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test(navigator.userAgent);
    }   
}    


return Planetarium;
});
