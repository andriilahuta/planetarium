THREE.SightControls = function (object, domElement) {
    
	this.object = object;
	this.domElement = (domElement !== undefined) ? domElement : document;

	// API

	// Set to false to disable this control
	this.enabled = true;
    
	// "target" sets the location of focus
	this.target = new THREE.Vector3();    

	this.noZoom = false;
	this.zoomSpeed = 1.0;

	// Limits to how far you can zoom in and out (using fov)
	this.minFoV = 1;
	this.maxFoV = 60;

	// Set to true to disable this control
	this.noRotate = false;
	this.rotateSpeed = 0.2;

	// Set to true to disable this control
	this.noPan = false;
	this.keyPanSpeed = 7.0;	// pixels moved per arrow key push

	// How far you can look vertically, upper and lower limits.
	// Range is 0 to Math.PI radians.
	this.minPolarAngle = -Math.PI / 2;//0; // radians
	this.maxPolarAngle = Math.PI / 2;//Math.PI; // radians

	// How far you can look horizontally, upper and lower limits.
	// If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
	this.minAzimuthAngle = -Infinity; // radians
	this.maxAzimuthAngle = Infinity; // radians

	// Set to true to disable use of the keys
	this.noKeys = false;

	// The four arrow keys
	this.keys = { SHIFT: 16, LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40, EQUAL: 187, DASH: 189 };

	// Mouse buttons
	this.mouseButtons = { ROTATE: THREE.MOUSE.LEFT, ZOOM: THREE.MOUSE.MIDDLE, PAN: THREE.MOUSE.RIGHT };
    
    this.theta = 0; // azimuthal angle
    this.phi = 0; // polar angle

	////////////
	// internals

	var scope = this;

	var EPS = 0.000001;
    var targetDistanceMul = 100;

	var rotateStart = new THREE.Vector2();
	var rotateEnd = new THREE.Vector2();
	var rotateDelta = new THREE.Vector2();

	var panStart = new THREE.Vector2();
	var panEnd = new THREE.Vector2();
	var panDelta = new THREE.Vector2();
	var panOffset = new THREE.Vector3();

	var zoomStart = new THREE.Vector2();
	var zoomEnd = new THREE.Vector2();
	var zoomDelta = new THREE.Vector2();

	var phiDelta = 0;
	var thetaDelta = 0;
	var scale = 1;
	var pan = new THREE.Vector3();

	var STATE = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM: 4, TOUCH_PAN: 5 };

	var state = STATE.NONE;

	// for reset
	this.position0 = this.object.position.clone();
	this.zoom0 = this.object.zoom;

	// events
	var changeEvent = { type: 'change' };
	var startEvent = { type: 'start' };
	var endEvent = { type: 'end' };    

	this.rotateLeft = function(angle) {
		thetaDelta -= angle;
	};

	this.rotateUp = function(angle) {
		phiDelta -= angle;
	};

	// pass in distance in world space to move left
	this.panLeft = function(distance) {
		panOffset.set(-distance, 0, 0);
        pan.add(panOffset);
	};

	// pass in distance in world space to move up
	this.panUp = function(distance) {
		panOffset.set(0, distance, 0);
        pan.add(panOffset);
	};
    
	// pass in distance in world space to move in
	this.panIn = function(distance) {
		panOffset.set(0, 0, distance);
        pan.add(panOffset);
	};    

	// pass in x,y of change desired in pixel space,
	// right and down are positive
	this.pan = function(deltaX, deltaY, deltaZ) {
		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if(scope.object instanceof THREE.PerspectiveCamera) {
			// perspective
			var offset = scope.object.position.clone();
			var targetDistance = offset.length() || 5;

			// half of the fov is center to top of screen
			targetDistance *= Math.tan((scope.object.fov / 2) * Math.PI / 180.0);
   
            function setPan(delta, pan_function) {
                if(delta !== undefined) {
                    pan_function(2 * delta * targetDistance / element.clientHeight);
                }
            }

			// we actually don't use screenWidth, since perspective camera is fixed to screen height
            setPan(deltaX, scope.panLeft);
            setPan(deltaY, scope.panUp);
            setPan(deltaZ, scope.panIn);
		} else {
			console.warn('WARNING: SightControls.js encountered an unknown camera type - pan disabled.');
		}        
	};

	this.zoomIn = function(zoomScale) {
		if(zoomScale === undefined) {
			zoomScale = getZoomScale();
		}

		if(scope.object instanceof THREE.PerspectiveCamera) {
			scale /= zoomScale;
		} else {
			console.warn('WARNING: SightControls.js encountered an unknown camera type - zoom disabled.');
		}
	};

	this.zoomOut = function(zoomScale) {
		if(zoomScale === undefined) {
			zoomScale = getZoomScale();
		}

		if(scope.object instanceof THREE.PerspectiveCamera) {
			scale *= zoomScale;
		} else {
			console.warn('WARNING: SightControls.js encountered an unknown camera type - zoom disabled.');
		}
	};

    
    this.setTarget = function() {        
		// restrict theta to be between desired limits
		this.theta = Math.max(this.minAzimuthAngle, Math.min(this.maxAzimuthAngle, this.theta));
		// restrict phi to be between desired limits
		this.phi = Math.max(this.minPolarAngle + EPS, Math.min(this.maxPolarAngle - EPS, this.phi));
        
        var cosPhi = Math.cos(this.phi);
        this.target.set(
            Math.sin(this.theta) * cosPhi,
            Math.sin(this.phi),
            -Math.cos(this.theta) * cosPhi
        );

        this.target.multiplyScalar(targetDistanceMul);
        this.target.add(this.object.position);
      
        this.object.lookAt(this.target);
    };

    this.rotateTarget = function(rotation) {
        this.setTarget();

        if(rotation instanceof THREE.Matrix4) {
            this.target.applyMatrix4(rotation);
        } else if(rotation instanceof THREE.Quaternion) {
            this.target.applyQuaternion(rotation);
        } else {
            return;
        }

        var offset = new THREE.Vector3();
        offset.copy(this.target).sub(this.object.position);
        offset.divideScalar(targetDistanceMul);

        this.theta = Math.PI - Math.atan2(offset.x, offset.z);
        this.phi = Math.asin(offset.y);
    };     
    
    
	this.update = function () {
		var fov = this.object.fov * scale;
		// restrict fov to be between desired limits
		fov = Math.max(this.minFoV, Math.min(this.maxFoV, fov));
        if(Math.abs(this.object.fov - fov) > EPS) {
            this.object.fov = fov;
            this.object.updateProjectionMatrix();
        }
        
        this.object.position.add(pan);

		this.theta += thetaDelta;
		this.phi -= phiDelta;
        
        this.setTarget();

		thetaDelta = 0;
		phiDelta = 0;
		scale = 1;
		pan.set(0, 0, 0);
	};
       

	this.reset = function () {
		state = STATE.NONE;

		this.object.position.copy(this.position0);
		this.object.zoom = this.zoom0;

		this.object.updateProjectionMatrix();
		this.dispatchEvent(changeEvent);

		this.update();
	};


	function getZoomScale() {
		return Math.pow(0.95, scope.zoomSpeed);
	}

	function onMouseDown(event) {
		if(scope.enabled === false) return;
		event.preventDefault();

		if(event.button === scope.mouseButtons.ROTATE) {
			if(scope.noRotate === true) return;

			state = STATE.ROTATE;
			rotateStart.set(event.clientX, event.clientY);
		} else if(event.button === scope.mouseButtons.ZOOM) {
			if(scope.noZoom === true) return;

			state = STATE.ZOOM;
			zoomStart.set(event.clientX, event.clientY);
		} else if(event.button === scope.mouseButtons.PAN) {
			if(scope.noPan === true) return;

			state = STATE.PAN;
			panStart.set(event.clientX, event.clientY);
		}

		if (state !== STATE.NONE) {
			document.addEventListener('mousemove', onMouseMove, false);
			document.addEventListener('mouseup', onMouseUp, false);
			scope.dispatchEvent(startEvent);
		}
	}

	function onMouseMove(event) {
		if(scope.enabled === false) return;

		event.preventDefault();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		if(state === STATE.ROTATE) {
			if(scope.noRotate === true) return;

			rotateEnd.set(event.clientX, event.clientY);
			rotateDelta.subVectors(rotateEnd, rotateStart);

			// rotating across whole screen goes 360 degrees around
			scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
			// rotating up and down along whole screen attempts to go 360, but limited to 180
			scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

			rotateStart.copy(rotateEnd);
		} else if(state === STATE.ZOOM) {
			if(scope.noZoom === true) return;

			zoomEnd.set(event.clientX, event.clientY);
			zoomDelta.subVectors(zoomEnd, zoomStart);

			if(zoomDelta.y > 0) {
				scope.zoomIn();
			} else if( zoomDelta.y < 0) {
				scope.zoomOut();
			}

			zoomStart.copy(zoomEnd);
		} else if(state === STATE.PAN) {
			if(scope.noPan === true) return;

			panEnd.set(event.clientX, event.clientY);
			panDelta.subVectors(panEnd, panStart);

			scope.pan(panDelta.x, panDelta.y);

			panStart.copy(panEnd);
		}

		if(state !== STATE.NONE) scope.update();
	}

	function onMouseUp() {
		if(scope.enabled === false) return;

		document.removeEventListener('mousemove', onMouseMove, false);
		document.removeEventListener('mouseup', onMouseUp, false);
		scope.dispatchEvent(endEvent);
		state = STATE.NONE;
	}

	function onMouseWheel(event) {
		if(scope.enabled === false || scope.noZoom === true || state !== STATE.NONE) return;

		event.preventDefault();
		event.stopPropagation();

		var delta = 0;

		if(event.wheelDelta !== undefined) { // WebKit / Opera / Explorer 9
			delta = event.wheelDelta;
		} else if(event.detail !== undefined) { // Firefox
			delta = -event.detail;
		}

        if(delta > 0) {
            scope.zoomOut();
        } else if(delta < 0) {
            scope.zoomIn();
        }

		scope.update();
		scope.dispatchEvent(startEvent);
		scope.dispatchEvent(endEvent);
	}

	function onKeyDown(event) {
		if(scope.enabled === false || scope.noKeys === true || scope.noPan === true) return;

		switch(event.keyCode) {
            case scope.keys.DASH:
                scope.pan(undefined, undefined, scope.keyPanSpeed);
                break;
            case scope.keys.EQUAL:
                scope.pan(undefined, undefined, -scope.keyPanSpeed);
                break;                
			case scope.keys.UP:
				scope.pan(0, scope.keyPanSpeed);
				scope.update();
				break;
			case scope.keys.BOTTOM:
				scope.pan(0, -scope.keyPanSpeed);
				scope.update();
				break;
			case scope.keys.LEFT:
				scope.pan(scope.keyPanSpeed, 0);
				scope.update();
				break;
			case scope.keys.RIGHT:
				scope.pan(-scope.keyPanSpeed, 0);
				scope.update();
				break;
		}
	}  

	function touchstart(event) {
		if(scope.enabled === false) return;

		switch(event.touches.length) {
			case 1:	// one-fingered touch: rotate
				if(scope.noRotate === true) return;

				state = STATE.TOUCH_ROTATE;
				rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
				break;
			case 2:	// two-fingered touch: zoom
				if(scope.noZoom === true) return;

				state = STATE.TOUCH_ZOOM;

				var dx = event.touches[0].pageX - event.touches[1].pageX;
				var dy = event.touches[0].pageY - event.touches[1].pageY;
				var distance = Math.sqrt(dx * dx + dy * dy);
				dollyStart.set(0, distance);
				break;
			case 3: // three-fingered touch: pan
				if(scope.noPan === true) return;

				state = STATE.TOUCH_PAN;

				panStart.set(event.touches[0].pageX, event.touches[0].pageY);
				break;
			default:
				state = STATE.NONE;
		}
		if(state !== STATE.NONE) scope.dispatchEvent(startEvent);
	}

	function touchmove(event) {
		if(scope.enabled === false) return;

		event.preventDefault();
		event.stopPropagation();

		var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

		switch(event.touches.length) {
			case 1: // one-fingered touch: rotate
				if(scope.noRotate === true) return;
				if(state !== STATE.TOUCH_ROTATE) return;

				rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
				rotateDelta.subVectors(rotateEnd, rotateStart);

				// rotating across whole screen goes 360 degrees around
				scope.rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed);
				// rotating up and down along whole screen attempts to go 360, but limited to 180
				scope.rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed);

				rotateStart.copy(rotateEnd);

				scope.update();
				break;
			case 2: // two-fingered touch: zoom
				if(scope.noZoom === true) return;
				if(state !== STATE.TOUCH_ZOOM) return;

				var dx = event.touches[0].pageX - event.touches[1].pageX;
				var dy = event.touches[0].pageY - event.touches[1].pageY;
				var distance = Math.sqrt(dx * dx + dy * dy);

				zoomEnd.set(0, distance);
				zoomDelta.subVectors(zoomEnd, zoomStart);

				if(zoomDelta.y > 0) {
					scope.zoomOut();
				} else if(zoomDelta.y < 0) {
					scope.zoomIn();
				}

				zoomStart.copy(zoomEnd);

				scope.update();
				break;
			case 3: // three-fingered touch: pan
				if(scope.noPan === true) return;
				if(state !== STATE.TOUCH_PAN) return;

				panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
				panDelta.subVectors(panEnd, panStart);

				scope.pan(panDelta.x, panDelta.y);

				panStart.copy(panEnd);

				scope.update();
				break;
			default:
				state = STATE.NONE;
		}
	}

	function touchend() {
		if(scope.enabled === false) return;
		scope.dispatchEvent(endEvent);
		state = STATE.NONE;
	}

	this.domElement.addEventListener('contextmenu', function (event) { event.preventDefault(); }, false);
	this.domElement.addEventListener('mousedown', onMouseDown, false);
	this.domElement.addEventListener('mousewheel', onMouseWheel, false);
	this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // firefox

	this.domElement.addEventListener('touchstart', touchstart, false);
	this.domElement.addEventListener('touchend', touchend, false);
	this.domElement.addEventListener('touchmove', touchmove, false);

	window.addEventListener('keydown', onKeyDown, false);

	this.update();

};

THREE.SightControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.SightControls.prototype.constructor = THREE.SightControls;
