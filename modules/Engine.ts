import { Debug } from './Debug';
import { Input } from './Input';
import { World } from './World';

/** This module controls initalization of engine, asset loading and application lifecycle loop */
export module Engine {
	//
	// Types
	//
	/** List of assets names with relative file path */
	export type AssetRouteList = {
		sprites? : { [name: string]: string };
		sounds?  : { [name: string]: string };
		bgs?     : { [name: string]: string };
	};
	/** List of assets names with loaded asset object, generated from an AssetRouteList */
	export type AssetList = {
		sprites? : { [name: string]: HTMLImageElement };
		sounds?  : { [name: string]: HTMLAudioElement };
		bgs?     : { [name: string]: HTMLImageElement };
	};
	
	//
	// Private Variables
	//
	let
		can: HTMLCanvasElement,
		ctx: CanvasRenderingContext2D,
		dT: number = 0,
		currentT: number = +new Date(),
		frameDur: number = 33,
		assets: AssetList;

	//
	// Public Variables
	//
	export let
		/** Lifecycle hook; called before each engine step event */
		preStep: (number)=>void = ()=>{},
		/** Lifecycle hook; called after each engine step event */
		postStep: (number)=>void = ()=>{},
		/** Lifecycle hook; called before each engine draw event */
		preDraw: (CanvasRenderingContext2D, number)=>void = () => {},
		/** Lifecycle hook; called after each engine draw event */
		postDraw: (CanvasRenderingContext2D, number)=>void = () => {},
		/** Target canvas element width */
		cW: number,
		/** Target canvas element height */
		cH: number,
		/** Max value for dT */
		maxDelta: number = 3;

	//
	// Setters / Getters
	//
	/** Returns current FPS as a fraction of target FPS */
	export function getDelta(): number {
		return dT;
	};
	/** Returns reference to target canvas HTML element  */
	export function getCanvasEl(): HTMLCanvasElement {
		return can;
	};
	/** Returns context of target canvas */
	export function getCanvasContext(): CanvasRenderingContext2D {
		return ctx;
	};
	/** Return preloaded sprite asset */
	export function getSprite(name: string, isCheck: boolean = false): HTMLImageElement {
		let asset = assets.sprites[name];
		if (!asset) {
			if (isCheck) {
				return null;
			} else {
				console.error(`Bunas Engine Error: No sprite asset with name "${name}" found.`);
			}
		}
		return asset;
	};
	/** Return preloaded background asset */
	export function getBackground(name: string, isCheck: boolean = false): HTMLImageElement {
		let asset = assets.bgs[name];
		if (!asset) {
			if (isCheck) {
				return null;
			} else {
				console.error(`Bunas Engine Error: No background asset with name "${name}" found.`);
			}
		}
		return asset;
	};
	/** Return preloaded sound asset */
	export function getSound(name: string, isCheck: boolean = false): HTMLAudioElement {
		let asset = assets.sounds[name];
		if (!asset) {
			if (isCheck) {
				return null;
			} else {
				console.error(`Bunas Engine Error: No sound asset with name "${name}" found.`);
			}
		}
		return asset;
	};

	//
	// Initalisation
	//
	let
		_externalCallback: Function,
		delayLoad: ()=>void,
		delayInit: ()=>void,
		initComplete: boolean = false;

	document.onreadystatechange = function() {
		if (document.readyState === 'complete' && delayInit) {
			delayInit();
		}
	};

	/**
		Initalises engine and begins application.
		An external callback function must be provided as an entry point to your code; called once initalistion has complete.
		The target canvas may be provided as an element or id of an element. Otherwise the first canvas element found will be used, or one will be created.
	*/
	export function init(
		externalCallback: Function,
		canEl? : string | HTMLElement, 
		canWidth? : number,
		canHeight? : number
	): void {
		if (initComplete) {
			console.error('Bunas Error: Engine instance has already been initalised');
			return;
		}
		if (document.readyState !== 'complete') {
			delayInit = init.bind(null, externalCallback, canEl, canWidth, canHeight);
			return;
		} else {
			delayInit = null;
			initComplete = true;
		}

		if (canEl) {
			can = <HTMLCanvasElement>(typeof canEl === 'string' ? document.getElementById(canEl) : canEl);
			if (canWidth) {
				can.width = canWidth;
			}
			if (canHeight) {
				can.height = canHeight;
			}
		} else {
			can = document.getElementsByTagName('canvas')[0];
			if (can) {
				can.width = canWidth || can.width || window.innerWidth;
				can.height = canHeight || can.height || window.innerHeight;
			} else {
				can = document.createElement('canvas');
				can.width = canWidth || window.innerWidth;
				can.height = canHeight || window.innerHeight;
				document.body.appendChild(can);
			}
		}
		cW = can.width;
		cH = can.height;
		ctx = can.getContext('2d');
		ctx.imageSmoothingEnabled = false;

		Input.init();
		World.area = new World.Area('globalArea');
		World.area.open();
		_externalCallback = externalCallback;

		if (delayLoad) {
				delayLoad();
		} else {
				initLoop();
		}
	};

	//
	// Asset Loading
	//
	let
		loading           : number = 0,
		assetTotal        : number,
		spriteLoader      : any,
		soundLoader       : any,
		bgLoader          : any;

	/** 
		Loads image and sound assets from provided list of routes before application is initalised
		Optional drawing function allows creation of custom loading bar
	*/
	export function preLoad(
		assets            : AssetRouteList,
		loadingDrawFunc?  : (ctx: CanvasRenderingContext2D, fractionLoaded: number)=>void
	) {
		if (initComplete) {
			console.error('Bunas Error: Engine already initalised. Assets can only be preloaded when called before Engine.init()');
			return;
		}
		if (!loadingDrawFunc) {
			loadingDrawFunc = function(ctx, fractionLoaded) {
				ctx.strokeStyle = '#fff';
				ctx.fillStyle = '#fff';
				ctx.lineWidth = 10;
				ctx.beginPath();
					ctx.arc(
						625, 295, 140,
						(-Math.PI / 2),
						(-Math.PI / 2) + ((Math.PI * 2) * (1 - fractionLoaded)),
						false
					);
				ctx.stroke();
			}
		}
		delayLoad = internalLoad.bind(null, assets, loadingDrawFunc);
	}

	function internalLoad(
		assetRoutes       : AssetRouteList,
		loadingDrawFunc?  : (ctx: CanvasRenderingContext2D, fractionLoaded: number)=>void
	): void {
		spriteLoader = assetRoutes.sprites || {};
		soundLoader  = assetRoutes.sounds || {};
		bgLoader     = assetRoutes.bgs || {};

		assetTotal =
			Object.keys(spriteLoader).length +
			Object.keys(soundLoader).length +
			Object.keys(bgLoader).length;
		assetLoader();
		
		advanceLoading(loadingDrawFunc);
	};

	function advanceLoading(loadScreen: (ctx: CanvasRenderingContext2D, completion: number)=>void): void {
		if (loading > 0) {
			ctx.clearRect(0, 0, cW, cH);
			loadScreen(ctx, loading / assetTotal);
			window.requestAnimationFrame(advanceLoading.bind(null, loadScreen));
		} else {
			assets = {
				sprites : spriteLoader,
				sounds  : soundLoader,
				bgs     : bgLoader
			};
			initLoop();
		}
	};   

	function assetLoader(): void {
		for (let element in spriteLoader) {
			loading += 1;
			let spr = new Image();
			spr.src = spriteLoader[element];
			spriteLoader[element] = spr;

			spr.onload = () => loading -= 1;
		}

		for (let element in bgLoader) {
			loading += 1;
			let bg = new Image();
			bg.src = bgLoader[element];
			bgLoader[element] = bg;

			bg.onload = () => loading -= 1;
		}

		for (let element in soundLoader) {
			loading += 1;
			let sound = new Audio();
			sound.src = soundLoader[element];
			soundLoader[element] = sound;
			sound.volume = 0.1;

			sound.load();
			sound.oncanplaythrough = () => loading -= 1;
		}
	};

	//
	// Lifecycle Loop
	//
	function initLoop(): void {
		_externalCallback();
		loop();
	};

	//
	//	Lifecycle event order:
	//		
	//		Engine.preStep()
	//		objs.preStep()
	//		objs.step()
	//		objs.postStep()
	//		Engine.postStep()
	//
	//		reset input listeners
	//
	//		Engine.preDraw()
	//		views updated, obj's inView updated
	//		objsInView.preDraw()
	//		objsInView.draw()
	//		objsInView.postDraw()
	//
	//		Light.draw()
	//		Engine.postDraw()
	//
	//		Debug.draw()
	//		Input.drawCursor()
	//
	function loop(): void {
		setTimeout(() => {
			let newT: number = +new Date();
			dT = Math.min(maxDelta, (newT - currentT) / frameDur);
			currentT = newT;
			
			preStep(dT);
			World.step(dT);
			postStep(dT);
			Input.step();

			ctx.clearRect(-1, -1, cW + 1, cH + 1);
			preDraw(ctx, dT);
			World.draw(ctx, dT);
			Debug.draw(ctx, dT);
			Input.drawCursor(ctx, dT);
			postDraw(ctx, dT);

			window.requestAnimationFrame(loop.bind(this));
		}, frameDur - (+new Date()) + currentT);
	};
}