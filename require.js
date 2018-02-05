let define, require;

(function() {
    function getScript(url, callback) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.async = true;
        script.src = url;
        
        const start = url.indexOf('.js');
        script.setAttribute('data-module', url.substring(0, start));
        
        script.onload = script.onreadystatechange = function(evt) {
            if (!this.readyState ||
                this.readyState === "loaded" || 
                this.readyState === "complete") {
                this.onload = this.onreadystatechange = null;
                document.getElementsByTagName('head')[0]
                        .removeChild(this);
                callback(evt);
            }
        };
        
        document.getElementsByTagName('head')[0]
                .appendChild(script);
    }
    
    function nope() {}
    
    class Module {
    	constructor(properties) {
    		this.name = properties.name || '';
    		this.depModNames = properties.depModNames || [];
    		this.callback = properties.callback;
    		this.parent = properties.parent;
    		this.loaded = false;
    	}
    }
    
    function modName(base, name) {
    	return `${base}${name}`;
    }
    
    function modNames(base, names) {
    	return names.map(name => modName(base, name));
    }
    
    function toJsUrl(modName) {
    	return `${modName}.js`;
    }
    
	const mainModName = Array.from(document.getElementsByTagName('script'))
                             .filter(script => script.getAttribute('data-main'))
                             .map(script => script.getAttribute('data-main'))[0];
	
    const jsBase = mainModName.substring(0, mainModName.indexOf('/') + 1);
    
    const globalModules = {};
    
    let currentMod;
    
    function loadModules(modNames, parent) {
    	const promises = modNames.map(modName => toJsUrl(modName))
							    .map(url => {
                                    return new Promise(resolve => {
                                        getScript(url, function(evt) {
                                            const mod = currentMod;
                                            
                                            mod.name = evt.target.getAttribute('data-module');
                                            mod.parent = parent;
                                            mod.loaded = true;
                                            
                                            globalModules[mod.name] = mod;
                                            
                                            const depModNames = mod.depModNames;
                                            
                                            loadModules(depModNames, mod);
                                            
                                            setTimeout(function check() {
                                                if(depModNames.filter(depModName => !globalModules[depModName].loaded).length === 0) {
                                                    resolve(mod);
                                                } else {
                                                    setTimeout(check, 50);
                                                }
                                            }, 50);
                                        });
                                    });
							    });
    	
        Promise.all(promises)
		        .then(mods => {
		     	     const dependencies = mods.map(mod => {
		     	    	return runModule(mod);
		     	     });
		     	     parent.callback.apply(undefined, dependencies);
		        });   	
    }
    
    function runModule(mod) {
    	 if(mod.depModNames.length === 0) {
	         return mod.callback();
	     } else {
	    	 const dependencies = mod.depModNames.map(depModName => {
	    	     return runModule(globalModules[depModName]);
	    	 });
	    	 return mod.callback.apply(undefined, dependencies);
	    }
    }
    
    define = function() {
    	currentMod = arguments[0] instanceof Array ?
		    			new Module({
		            		depModNames : modNames(jsBase, arguments[0]),
		            		callback    : arguments[1]
		            	}) :
		                new Module({
		                    depModNames : [],
		                	callback    : arguments[0]
		                });
    };

    require = function() {
    	const mainMod = arguments[0] instanceof Array ?
			    			new Module({
			    	    		name         : modName(jsBase, mainModName), 
			    	    		depModNames  : modNames(jsBase, arguments[0]), 
			    	    		callback     : arguments[1]
			    	    	}) :
			    	    	new Module({
			        	    		name         : modName(jsBase, mainModName), 
			        	    		depModNames  : [], 
			        	    		callback     : arguments[0]
			        	    });
			    	
    	globalModules[modName(jsBase, mainModName)] = mainMod;
    	
    	loadModules(mainMod.depModNames, mainMod);
    };
    
    getScript(toJsUrl(mainModName), nope);
        
})();