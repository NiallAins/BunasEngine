import { Engine } from './Engine';
import { GameObject } from './Common';
import { Light } from './Light';
import { Graphics } from './Graphics';
import { Debug } from './Debug';

/**
	Contains classes which allow
		- Creation of seperate game areas
		- Area level design
		- Viewport control
*/
export module World {

		// Types
		export type background = {
			name: string,
			img: HTMLImageElement | string,
			parralax: {x: number, y: number},
			repeat: {x: boolean, y: boolean},
			offset: {x: number, y: number},
			z: number
		};

		//
		// Public Variables
		//
		export let area: Area;
		
		
		//
		// Private Variables
		//
		let
			areas: { [name: string]: Area } = {},
			currentAreas: Area[] = [];


		//
		// Public Methods
		//
		export function step(dT: number) {
			currentAreas.forEach(a => a.step(dT));
		};

		export function draw(ctx: CanvasRenderingContext2D, dT: number) {
			currentAreas.forEach(a => a.draw(ctx, dT));
		};
		
		/* Opens a new area, if replace is false the previous Area is not closed first */
		export function goTo(areaName: string, replace: boolean = true) {
			if (replace) {
				currentAreas.forEach(a => a.close());
			}
			areas[areaName].open();
		};


		//
		// Class: Area
		//
		/** Class for creating a game area */
		export class Area {
			public objs: GameObject[] = [];
			/** View assigned to this Area */
			public view: View;
			/** Light.LightArea assigned to this area if using lighting */
			public light: Light.LightArea;
			private active: boolean = false;
			private _zIndex: number;
			private layout: {
				grid: string;
				objects: {[instance: string]: any[]};
				width: number;
				height: number;
				x: number,
				y: number
			};
			private backgrounds: background[] = [];
			private foregrounds: background[] = [];

			/**
				If persist is true, objects in area will persists after close(), until open() is called again.
				If persist is false, all object will be deleted on close, and recreated again on open()
				zIndex sets the order in which this Area is drawn if multiple areas are open at once
				onInit, onOpen, onClose are custom functions to call 
				onInit is called when a persistent Area is opened for the first time
			*/
			constructor(
				private name			: string,
				private persist   : boolean = false,
				zIndex						:	number = 0,
				public onInit     : ()=>void = ()=>{},
				public onOpen     : ()=>void = ()=>{},
				public onClose    : ()=>void = ()=>{},
			) {
				areas[name] = this;
				this.view = new View();
				this._zIndex = zIndex;
			};

			get zIndex(): number {
				return this._zIndex;
			}
			set zIndex(newVal: number) {
				this._zIndex = newVal;
				currentAreas.sort((a, b) => a.zIndex - b.zIndex);
			}

			/**
				Sets the background of area
				Asset can be the name of background asset, or the string value of a color
			*/
			public addBackground(
				asset: string,
				isForeGround: boolean = false,
				zIndex: number = 0,
				parralax: number | {x: number, y: number} = 1,
				offset: number | {x: number, y: number} = 0,
				repeat: boolean | {x: boolean, y: boolean} = true,
				customName?: string
			): background {
				let bg = 	{
					name: 		customName || asset,
					img: 			Engine.getBackground(asset, true) || asset,
					parralax: typeof parralax === 'number' ? {x: parralax, y: parralax} : parralax,
					offset: 	typeof offset === 'number' ? {x: offset, y: offset} : offset,
					repeat: 	typeof repeat === 'boolean' ? {x: repeat, y: repeat} : repeat,
					z: 				zIndex
				};
				if (isForeGround) {
					this.foregrounds.push(bg);
					this.foregrounds.sort((a, b) => a.z - b.z);
				} else {
					this.backgrounds.push(bg);
					this.backgrounds.sort((a, b) => a.z - b.z);
				}
				return bg;
			}

			public removeBackground(bg: string | background) {
				if (typeof bg !== 'string') {
					bg = bg.name;
				}
				this.backgrounds.splice(this.backgrounds.findIndex(x => bg === x.name), 1);
				this.foregrounds.splice(this.foregrounds.findIndex(x => bg === x.name), 1);
			}

			public step(dT: number) {
				this.objs.forEach(o => o.startStep && o.startStep(dT));
				this.objs.forEach(o => {
					if (o.bound) {
						if (typeof o.bound.angOffset === 'undefined') {
							o.x = o.bound.obj.x + o.bound.xOffset;
							o.y = o.bound.obj.y + o.bound.yOffset;
						} else {
							let ang = o.bound.obj.ang + o.bound.angOffset;
							o.x = o.bound.obj.x + o.bound.xOffset + (Math.cos(ang) * o.bound.xCenter);
							o.y = o.bound.obj.y + o.bound.yOffset + (Math.sin(ang) * o.bound.yCenter);
						}
					}
					o.step(dT);
				});
				this.objs.forEach(o => o.endStep && o.endStep(dT));
			}

			public draw(ctx: CanvasRenderingContext2D, dT: number) {
				ctx.save();
					this.view.update();
					ctx.scale(this.view.z, this.view.z);
					ctx.translate(-this.view.x, -this.view.y);

					this.drawBackgrounds(ctx, false);
							
					let visibleObjs = this.objs.filter(o => {
						if (
							o.x + o.clipBox.x + o.clipBox.width > this.view.x &&
							o.x + o.clipBox.x < this.view.x + this.view.width &&
							o.y + o.clipBox.y + o.clipBox.height > this.view.y &&
							o.y + o.clipBox.y  < this.view.y + this.view.height
						) {
							o.inView = true;
						} else {
							o.inView = false;
						}
						return o.inView;
					});
					visibleObjs.forEach(o => o.startDraw && o.startDraw(ctx, dT));
					visibleObjs.forEach(o => o.draw(ctx, dT));
					visibleObjs.forEach(o => o.endDraw && o.endDraw(ctx, dT));
				ctx.restore();

				if (this.light) {
					this.light.draw(ctx);
				}

				if (this.foregrounds.length) {
					ctx.save();
						ctx.scale(this.view.z, this.view.z);
						ctx.translate(-this.view.x, -this.view.y);
						this.drawBackgrounds(ctx, true);
					ctx.restore();
				}
			}

			private drawBackgrounds(ctx: CanvasRenderingContext2D, isForeground: boolean) {
				this[isForeground ? 'foregrounds' : 'backgrounds'].forEach(bg => {
					if (typeof bg.img === 'string') {
						ctx.save();
							ctx.fillStyle = bg.img;
							ctx.fillRect(this.view.x, this.view.y, Engine.cW / this.view.z, Engine.cH / this.view.z);
						ctx.restore();
					} else {
						let x = (this.view.x * bg.parralax.x) - bg.offset.x;
						if (bg.repeat.x) {
							x %= bg.img.width;
						}
						x = this.view.x - x;
						let xEnd = bg.repeat.x ? this.view.x + Engine.cW : x + 1;
						for (; x < xEnd; x += bg.img.width) {
							let y = (this.view.y * bg.parralax.y) - bg.offset.y;
							if (bg.repeat.y) {
								y %= bg.img.width;
							}
							y = this.view.y - y;
							let yEnd = bg.repeat.y ? this.view.y + Engine.cH : y + 1;
							for (; y < yEnd; y += bg.img.height) {
								ctx.drawImage(bg.img, x, y);
							}
						}
					}
				});
			}

			/*
				Adds game objects based on an area layout grid string
				grid		-
					a multiline string where the number of lines is the grid height and the number of characters per line is the grid width
					each non-space character will add the object its character represents, at a position in the Area relative to its position in the grid string
				objs		- a list of characters, and the GameObjects they represent int he grid string
				width 	- the width in px that one character in the grid string represents
				height	- the height in px that one character in the grid string represents, defaults to the width value if not provided
				x, y		- the x position in the Area to start drawing the grid objects
			*/
			public setLayout(
				grid: string,
				objs: {[instance: string]: any[]},
				cellWidth: number,
				cellHeight?: number,
				x: number = 0,
				y: number = 0
			): void {
				this.layout = {
					grid: grid,
					objects: objs,
					width: cellWidth,
					height: cellHeight || cellWidth,
					x: x,
					y: y
				};
			};

			private createLayout() {
				let grid = this.layout.grid.split('\n');
				let startCol = -1,
						startRow = -1;
				for (let i = 0; i < grid.length; i++) {
					let m = grid[i].match(/[a-z0-9]/i);
					if (m) {
						if (startCol === -1) {
							startCol = i;
						}
						if (m.index < startRow) {
							startRow = m.index;
						}
					}
				}
				grid.forEach((l, row) => {
					l.replace(
						/[a-z0-9]/gi, 
						(o, col) => {
							try {
								let obj = this.layout.objects[o];
								let inst = new obj[0](...obj.slice(1));
								inst.x = this.layout.x + ((col - startCol) * this.layout.width);
								inst.y = this.layout.y + ((row - startRow) * this.layout.height);
								this.add(inst);
							} catch {
								console.error(`Bunas Error: Cannot create object for character "${o}" in level layout`);
							}
							return o;
						}
					);
				});
			};

			/** */
			public open(): void {
				if (!this.active) {
					if (this.layout) {
						this.createLayout();
					}
					this.onInit();
					this.view.reset();
					this.active = true;
				}
				currentAreas.push(this);
				currentAreas.sort((a, b) => a.zIndex - b.zIndex);
				
				this.onOpen();
			};

			/** */
			public close() {
				currentAreas.splice(1, currentAreas.indexOf(this));
				this.onClose();
				if (!this.persist) {
					this.objs = [];
				}
			};

			/** */
			public delete(): void {
				this.objs = [];
				if (this.light) {
					this.light.sources.forEach(s => s.delete());
					this.light.blocks.forEach(s => s.delete());
				}
				delete areas[this.name];
			}

			/* Moves a Game Object, or an array of Game Objects, from thier current Area, to this Area */
			public add(objs: GameObject | GameObject[]): void {
				[].concat(objs).forEach(o => {
					if (o.area) {
						o.area.remove(o);
					}
					for(let i = 0; true; i++) {
						if (i === this.objs.length || o.z > this.objs[i].z) {
							this.objs.splice(i, 0, o);
							break;
						}
					}
					o.area = this;
				});
			};

			/** Remove an object from the Area */
			public remove(o: GameObject): void {
				this.objs.splice(this.objs.indexOf(o), 1);
				o.area = null;
			};

			public zSort(o: GameObject) {
				this.objs.splice(this.objs.indexOf(o), 1);
				for(let i = 0; true; i++) {
					if (i === this.objs.length || o.z > this.objs[i].z) {
						this.objs.splice(i, 0, o);
						break;
					}
				}
			}

			/** If persist is not provided, value is set to oppsite of its current value */
			public togglePersistance(persist?: boolean) {
				this.persist = persist === undefined ? !this.persist : persist;
				if (!this.persist && currentAreas.indexOf(this) === -1) {
					this.objs = [];
				}
			};

			/** Use Light engine in this Area */
			public toggleLight(on?: boolean): void {
				if (!this.light) {
					this.light = new Light.LightArea(this);
				} else {
					this.light.active = typeof on === 'undefined' ? !this.light.active : on;
				}
			};
	};

	//
	// Class: View Port
	//
	export class View {
		public width: number;
		public height: number;
		public tracking: GameObject;
		private trackOn: boolean = false;
		private trackPad: number[];
		private trackLag: number;
		private trackBound: number[];
		private initX: number;
		private initY: number;
		private initZ: number;

		/*
			x, y 					- top left position of View in Area
			z							- View zoom level
			ang						- angle of View in Area
			width, height - width and height to draw the view on the canvas, default to cover the canvas
			canX, canY	  - top left position to draw View on the canvas
			canZ					- scale size to draw the view on the canvas
		*/
		constructor(
			public x: number = 0,
			public y: number = 0,
			private _z: number = 1
		) {
			this.initX = x;
			this.initY = y;
			this.initZ = _z;
			this.width = Engine.cW / _z;
			this.height = Engine.cH / _z;
		};

		get z(): number {
			return this._z
		}
		set z(val: number) {
			this._z = val;
			this.width = Engine.cW / val;
			this.height = Engine.cH / val;
		}

		/**
			Set the view to keep an Game Object in frame
			padding is the distance the object must be from the edge of the view before the view is moved
			If padding is a number it is applied equally for all edges, if an array it is applied as [top, left, bottom, right]
			trackSpeed is how quickly the view catchs up with the object
		*/
		public track(
			object			: GameObject,
			padding			: number | number[] = 0,
			trackSpeed	: number = 0,
			bound?			: number[]
		) {
			this.tracking = object;
			this.trackLag = trackSpeed;
			this.trackOn = true;
			if (bound) {
				bound[2] += bound[0];
				bound[3] += bound[1];
				bound[2] -= this.width;
				bound[3] -= this.height;
				this.trackBound = bound;
			}
			if (typeof padding === 'number') {
				this.trackPad = [padding, padding, padding, padding];
			} else if (padding.length === 2) {
				this.trackPad = [...padding, ...padding]
			} else {
				this.trackPad = padding;
			}
		}

		/**
			Temporarily turn object tracking on or off
			If turnOn is not provided, value is set to oppsite of its current value
		*/
		public toggleTracking(turnOn?: boolean) {
			if (typeof turnOn === undefined) {
				this.trackOn = !this.trackOn;
			} else {
				this.trackOn = turnOn;
			}
		}

		public update() {
			if (this.tracking) {
				if (this.tracking.y < this.y + this.trackPad[0]) {
					this.y -= (this.y - this.tracking.y + this.trackPad[0]) * this.trackLag;
				}  if (this.tracking.y > this.y + this.height - this.trackPad[2]) {
					this.y += (this.tracking.y - (this.y + this.height - this.trackPad[2])) * this.trackLag;
				}
				if (this.tracking.x < this.x + this.trackPad[3]) {
					this.x -= (this.x - this.tracking.x + this.trackPad[3]) * this.trackLag;;
				}  if (this.tracking.x > this.x + this.width - this.trackPad[1]) {
					this.x += (this.tracking.x - (this.x + this.width - this.trackPad[1])) * this.trackLag;;
				}
				if (this.trackBound) {
					if (this.y < this.trackBound[1]) {
						this.y = this.trackBound[1];
					} else if (this.y > this.trackBound[3]) {
						this.y = this.trackBound[3];
					}
					if (this.x < this.trackBound[0]) {
						this.x = this.trackBound[0];
					} else if (this.x > this.trackBound[2]) {
						this.x = this.trackBound[2];
					}
				}
				this.x = Math.floor(this.x);
				this.y = Math.floor(this.y);
			}
		}

		public reset() {
			this.x = this.initX;
			this.y = this.initY;
			this.z = this.initZ;
		}
	};
}