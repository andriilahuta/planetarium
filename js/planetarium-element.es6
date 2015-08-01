class PlanetariumElement extends HTMLDivElement {
    createdCallback() {
        this.container = document.createElement('div');
        this.container.style.width = this.container.style.height = '100%';
        
        this.root = this.createShadowRoot();
        this.root.appendChild(this.container);

        this.getLocation(location => {
            this.planetarium = new Planetarium(this.container, {location});
        });
    }
    
    fullScreen() {
        return this.planetarium.requestFullScreen();
    }
    
    setTimeSpeed(val) {
        return this.planetarium.setTimeSpeed(val);
    }
    
    getLocation(callback, defaultLocation) {
        defaultLocation = defaultLocation || {
            latitude: 0,
            longitude: 0
        };
        let setDefault = () => callback(defaultLocation);
        if(navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                callback({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
            }, setDefault);
        } else {
            setDefault();
        }
    }    
}

document.registerElement('x-planetarium', PlanetariumElement);