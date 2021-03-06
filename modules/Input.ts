import { Engine } from './Engine';
import { GameObject } from './Common';
import { World } from './World';
import { Graphics } from './Graphics';

/** This module provides an interface for user inputs */
export module Input {

	//
	// Types / Interfaces
	//
	
	type ClickableObject = {
		obj	: GameObject;
		x0	: number;
		x1	: number;
		y0	: number;
		y1	: number;
		circ: boolean;
	};

	/** Private: Describes state of keyboard input */
	interface KeyBoard {
		down    : string;
		up      : string;
		pressed : string[];
	};

	/** Private: Describes single mouse button state */
	interface MouseButton {
		down       : boolean;
		up         : boolean;
		doubleDown : boolean;
		pressed    : boolean;
		drag       : boolean;
		startDrag  : boolean;
		endDrag    : boolean;
		dragging   : boolean;
		dragPts    : {x: number, y: number}[];
	};

	/** Describes current state of mouse input */
	export interface Mouse {
		x: number,
		y: number,
		left  : MouseButton;
		right : MouseButton;
	};


	//
	// Private Variables
	//
	const CLICKCODE: string[] = ['left', 'middle', 'right'];
	let
		dragCheck = {
			tolerance : 10,
			originX   : 0,
			originY   : 0,
			dragPts   : []
		},
		dblClickWait : number = 500,
		customCursor : (ctx: CanvasRenderingContext2D, delta: number) => void,
		clickableObjects: ClickableObject[] = [];


	//
	// Public Variables
	//

	export let
		/** Current state of mouse input */
		mouse: Mouse = {
			x:    0,
			y:    0,
			left: {
				down       : false,
				up         : false,
				doubleDown : false,
				pressed    : false,
				drag       : false,
				startDrag  : false,
				endDrag    : false,
				dragging   : false,
				dragPts    : []
			},
			right: {
				down       : false,
				up         : false,
				doubleDown : false,
				pressed    : false,
				drag       : false,
				startDrag  : false,
				endDrag    : false,
				dragging   : false,
				dragPts    : []
			}
		},

		/**
			Current state of keyboard input
			key.pressed stores name of all keys currently pressed
		*/
		key: KeyBoard = {
			up      : null,
			down    : null,
			pressed : []
		};


	//
	// Public Methods
	//

	export function init(): void {
		window.addEventListener('mousemove', onMouseMove.bind(this));
		window.addEventListener('mousedown', onMouseDown.bind(this));
		window.addEventListener('mouseup'  , onMouseUp.bind(this));

		window.onkeydown = onKeyDown.bind(this);
		window.onkeyup   = onKeyUp.bind(this);

		allowContextMenu(false);
	};

	export function step(): void {
		emitClickableObjectEvents();

		[mouse.left, mouse.right].forEach(b => {
			b.down       = false;
			b.up         = false;
			b.doubleDown = false;
			b.drag       = false;
			b.startDrag  = false;
			b.endDrag    = false;
		});

		key.down = null;
		key.up   = null;
	};

	/** Sets number of pixels cursor must move while pressed before drag event is triggered */
	export function setDragTolerance(tolerance: number): void {
		dragCheck.tolerance = tolerance * tolerance;
	};
	/** Sets maximum milliseconds between clicks in a double click in order for event to be trigged */
	export function setDoubleClickTiming(wait: number): void {
		dblClickWait = wait;
	};

	/**
		Enable/Disable browser context menu on right click
		Disabled by default
	 */
	export function allowContextMenu(show: boolean = true): void {
		if (show) {
			window.oncontextmenu = function (e) { };
		} else {
			window.oncontextmenu = function (e) {
				e.preventDefault();
			};
		}
	};

	/** Returns true is any of the key names provided are currently pressed  */
	export function isPressed(...keys: string[]): boolean | object {
		return keys.some(k => key.pressed.indexOf(k) !== -1);
	};

	/** Gets position of mouse within the current view of an area */
	export function mouseInArea(a?: World.Area): {x: number, y: number} {
		let view = a ? a.view : World.area.view;
		return {
			x: (mouse.x / view.z) + view.x,
			y: (mouse.y / view.z) + view.y
		};
	}

	/**
		Sets cursor type if CSS cursor name is provided
		Sets a custom cursor to be rendered if draw function, or image is provided is provided
	*/
	export function setCursor(cursor: string | HTMLImageElement | ((ctx: CanvasRenderingContext2D, dT: number)=>void)): void {
		if (typeof cursor === 'string') {
			(Engine.getCanvasEl() as HTMLElement).style.cursor = cursor;
		} else {
			(Engine.getCanvasEl() as HTMLElement).style.cursor = 'none';
			if (typeof cursor === 'function') {
				customCursor = cursor;
			} else {
				customCursor = ctx => ctx.drawImage(cursor, 0, 0);
			}
		}
	};

	export function drawCursor(ctx: CanvasRenderingContext2D, dT: number): void {
		if (customCursor) {
			ctx.save();
				ctx.translate(mouse.x, mouse.y);
				customCursor(ctx, dT);
			ctx.restore();
		}
	};

	/**
		Registers game object with relative hit box in which to listener for mouseover events
		If circular, hit box will be a circle
		If centered, box will be centered on object.x, object.y; otherwise, will be aligned with top left
	*/
	export function setMouseListener(
		g: GameObject,
		width: number,
		height: number,
		circular: boolean = false,
		centered: boolean = false
	): void {
		let x0, y0, x1, y1 = 0;
		if (circular) {
			x1 = y1 = width / 2;
			if (!centered) {
				x0 = y0 = width / 2;
			}
		} else if (centered) {
			x0 = -width / 2;
			x1 = width / 2;
			y0 = -height / 2;
			y1 = height /2;
		} else {
			x1 = width;
			y1 = height;
		}
		clickableObjects.push({
			obj: g,
			x0: x0,
			x1: x1,
			y0: y0,
			y1: y1,
			circ: circular
		});
	};


	//
	// Private Methods
	//

	function onMouseDown(e: MouseEvent): void {
		let b = mouse[CLICKCODE[e.button]];

		dragCheck.originX = e.clientX;
		dragCheck.originY = e.clientY;
		b.pressed = true;
		b.down    = true;

		if (b.dblCheck) {
			b.doubleUp = true; 
			b.dblCheck = false;
		} else {
			b.dblCheck = true;
			setTimeout(() => b.dblCheck = false, dblClickWait);
		}
	};

	function onMouseUp(e: MouseEvent): void {
		let b = mouse[CLICKCODE[e.button]];

		b.pressed = false;
		b.up      = true;

		if (b.dragging) {
			b.endDrag  = true;
			b.dragging = false;
		}
		dragCheck.dragPts = [];
	};

	function onMouseMove(e: MouseEvent): void {
		mouse.x = e.clientX;
		mouse.y = e.clientY;

		checkDrag(mouse.left);
		checkDrag(mouse.right);
	};

	function checkDrag(b: MouseButton): void {
		if (b.pressed) {
			if (b.dragging) {
				b.drag = true;
				b.dragPts.push({
					x: mouse.x,
					y: mouse.y
				});
			} else {
				if (
					Math.pow(mouse.y - dragCheck.originY, 2) +
					Math.pow(mouse.x - dragCheck.originX, 2)
					> dragCheck.tolerance
				) {
					b.dragging = true;
					b.drag = true;
					b.dragPts = dragCheck.dragPts.slice();
				} else {
					dragCheck.dragPts.push({
						x: mouse.x,
						y: mouse.y
					});
				}
			}
		}
	};

	function onKeyDown(e: KeyboardEvent): void {
		key.down = e.code;
		if (key.pressed.indexOf(e.code) === -1) {
			key.pressed.push(e.code);
		}
	};

	function onKeyUp(e: KeyboardEvent): void {
		key.up = e.code;
		key.pressed.splice(key.pressed.indexOf(e.code), 1);
	};

	// TODO: add view position to object position
	function emitClickableObjectEvents() {
		clickableObjects.forEach(o => {
			if (o.obj.onMouseOver) {
				let clicked: boolean;
				if (o.circ) {
					clicked =
						Math.sqrt(
							Math.pow(mouse.y - (o.obj.y + o.y0), 2) +
							Math.pow(mouse.x - (o.obj.x + o.x0), 2)
						) < o.x1;
				} else {
					clicked =
						o.obj.x - o.x0 < mouse.x &&
						o.obj.x + o.x1 > mouse.x &&
						o.obj.y - o.y0 > mouse.y &&
						o.obj.y + o.y1 > mouse.y;
				}
				if (clicked) {
					o.obj.onMouseOver.call(o.obj, mouse);
				}
			}
		});
	};
}