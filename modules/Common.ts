import { World } from './World';
import { Input } from './Input';
import { Graphics } from './Graphics';

//
// Classes
//

/**
  Base class from which all other game objects will inherit
*/
export abstract class GameObject {
	/** Current area object is in */
	public area: World.Area;
	public colBox: {x: number, y: number, width: number, height: number};
	public clipBox: {x: number, y: number, width: number, height: number};
	public sprite: Graphics.Sprite | HTMLImageElement;
	public mask: {x: number, y: number}[];
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

	get z(): number {
		return this._z;
	}
	set z(newZ: number) {
		this._z = newZ;
		this.area.zSort(this);
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
		Returns instances in objects with overlapping clip boxes
		When onlyInView is true, search is limited to only objects within current view
	*/
	public getCollisions(objects: GameObject[], onlyInView: boolean = false): GameObject[] {
		return objects.filter(o => (
			(!onlyInView || o.inView) &&
			o.x + o.colBox.x < this.x + this.colBox.x + this.colBox.width &&
			o.x + o.colBox.x + o.colBox.width > this.x + this.colBox.x &&
			o.y + o.colBox.y < this.y + this.colBox.y + this.colBox.height &&
			o.y + o.colBox.y + o.colBox.height > this.y + this.colBox.y
		));
	}

	/* Returns true if rectangle defined by parameters is within objects colBox */
	public checkCollision(x: number, y: number, w: number = 0, h: number = 0): boolean {
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
		this.area.remove(this);
	}
}