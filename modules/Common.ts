import { World } from './World';
import { Input } from './Input';
import { Graphics } from './Graphics';
import { Light } from './Light';

//
// Types and Interfaces
//
export abstract class Bindable {
	public bound: {
		obj: GameObject,
		xOffset: number,
		yOffset: number,
		angOffset?: number,
		xCenter?: number,
		yCenter?: number,
		matchAng?: boolean
	};

	/** Match a GameObjects position and angle to this GameObjects position and angle */
	public bindPosition(
		obj: GameObject,
		xOffset: number = 0,
		yOffset: number = 0,
		angOffset?: number,
		xCenter: number = 0,
		yCenter: number = 0,
		matchAng: boolean = false
	) {
		this.bound = {
			obj: obj,
			xOffset: xOffset,
			yOffset: yOffset
		};
		if (typeof angOffset !== 'undefined') {
			this.bound.angOffset = angOffset;
			this.bound.xCenter = xCenter;
			this.bound.yCenter = yCenter;
			this.bound.matchAng = matchAng;
		}
	}
	/** */
	public unbindPosition() {
		this.bound = null;
	}
};

//
// Classes
//

/**
  Base class from which all other game objects will inherit
*/
export abstract class GameObject extends Bindable {
	/** Current area object is in */
	public area: World.Area;
	public colBox: {x: number, y: number, width: number, height: number};
	public clipBox: {x: number, y: number, width: number, height: number};
	public sprite: Graphics.Sprite | HTMLImageElement;
	public mask: {x: number, y: number}[];
	public ang: number = 0;
	/** Is the object currently on screen (set before step events are called) */
	public inView: boolean = true;

	/**
		z value determines order of draw/step events relative to other objects
		colBox is used in collision detection and checking if object is in view
	*/
	constructor(
		public x: number,
		public y: number,
		private _z: number = 0,
		colWidth: number | {x?: number, y?: number, width: number, height?: number} = 0,
		clipWidth: number | {x?: number, y?: number, width: number, height?: number} = -1
	) {
		super();
		if (typeof colWidth === 'number') {
			this.colBox = {
				x: 0,
				y: 0,
				width: colWidth,
				height: colWidth
			}
		} else {
			this.colBox = {
				x: colWidth.x || 0,
				y: colWidth.y || 0,
				width: colWidth.width,
				height: colWidth.height || colWidth.width
			}
		}
		if (typeof clipWidth === 'number') {
			if (clipWidth === -1) {
				this.clipBox = this.colBox;
			} else {
				this.clipBox = {
					x: 0,
					y: 0,
					width: clipWidth,
					height: clipWidth
				}
			}
		} else {
			this.clipBox = {
				x: clipWidth.x || 0,
				y: clipWidth.y || 0,
				width: clipWidth.width,
				height: clipWidth.height || clipWidth.width
			}
		}
		World.area.add(this);
	}

	/** Returns false if object is not being rendered in an area */
	get alive(): boolean {
		return !!this.area;
	}

	get z(): number {
		return this._z;
	}
	set z(newZ: number) {
		if (newZ !== this._z) {
			this._z = newZ;
			this.area.zSort(this);
		}
	}

	/** Called on each Engine step event */
	public step      (delta: number): void {};
	/** Called at start of each Engine step event */
	public startStep?(delta: number): void;
	/** Called at end of each Engine step event */
	public endStep?  (delta: number): void;

	/** Called on each Engine draw event */
	public draw      (ctx: CanvasRenderingContext2D, delta: number): void {};
	/** Called at start of each Engine draw event */
	public startDraw?(ctx: CanvasRenderingContext2D, delta: number): void;
	/** Called at end of each Engine draw event */
	public endDraw?  (ctx: CanvasRenderingContext2D, delta: number): void;

	/** Called on object mouseover if Input.setMouseListener() has been set */
	public onMouseOver?(m: Input.Mouse): void;

	/**
		Returns instances of other GameObjects with overlapping clip boxes
		If objects is not provided, all GameObjects in area are checked
		When checkOutsideView is false, search is limited to only objects within current view
	*/
	public getCollisions(
		objects: GameObject[] = this.area.objs,
		checkOutsideView: boolean = false
	): GameObject[] {
		return objects.filter(o => (
			(checkOutsideView || o.inView) &&
			o.x + o.colBox.x < this.x + this.colBox.x + this.colBox.width &&
			o.x + o.colBox.x + o.colBox.width > this.x + this.colBox.x &&
			o.y + o.colBox.y < this.y + this.colBox.y + this.colBox.height &&
			o.y + o.colBox.y + o.colBox.height > this.y + this.colBox.y
		));
	}

	/**
		Returns true if point [x, y] (or rectangle [x, y, w, h] if provided) is within objects colBox
		x can be given as a GameObject, to use that objects colBox as the rectangle to check
	*/
	public checkCollision(x: number | GameObject, y?: number, w: number = 0, h: number = 0): boolean {
		if (typeof x !== 'number') {
			y = x.y + x.colBox.y;
			w = x.colBox.width;
			h = x.colBox.height;
			x = x.x + x.colBox.x;
		}
		return (
			x < this.x + this.colBox.x + this.colBox.width &&
			x + w > this.x + this.colBox.x &&
			y < this.y + this.colBox.y + this.colBox.height &&
			y + h > this.y + this.colBox.y
		);
	}

	/** Set a polygon mask to be used when casting shadows from a light source */
	public setShadowMask(poly: {x: number, y: number}[] | Graphics.Sprite) {
		if (typeof poly[0].x === 'number') {
			this.mask = <{x: number, y: number}[]>poly;
		}
	}

	/* Removes instance from game */
	public delete(): void {
		if (this.area) {
			this.area.remove(this);
		}
	}
}