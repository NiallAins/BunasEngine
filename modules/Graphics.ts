import { Engine } from './Engine';
import { GameObject } from './Common';
import { Physics } from './Physics';
import { Debug } from './Debug';

/** Provides functions and classes for rendering bitmap and vector graphics on the canvas */
export module Graphics {
	//
	// Types / Interfaces
	//
	/** Describes how to animate the properties of a vector sprite.
			The value associated with each property is converted to a constant value based on what the current frame of the animation loop is.
			This constant value is then passed to the sprite's draw function to be rendered.
			The value can be expressed as:
				A range of values to be reached at equal intervals
					[10, 5, 30, 5]
				A range of values to be reached at a specific time during the animation cycle
					[[0, 10], [0.2, 5], [0.8, 9]]
				A range of values to be reached with an easing function specified
					[[0, 30, 'bounceIn'], [1, 20, 'bounceOut']]
	*/
	export type keyframeSet  = {
		[property: string] :
			number[] |
			number[][] |
			(number | string)[][]
	};
	/** Function which describes how to draw the sprite.
			Frame is a keyframe set whoses values have been interpolated to constants for each property
	*/
	export type drawFunction = (frame: { [property: string] : number }, ctx: CanvasRenderingContext2D)=>void;
	export type spriteState  = {
		duration   : number,
		elements   : { [element: string] : keyframeSet },
		fr?        : number,
		iteration? : number,
		easeIn?    : string,
		easeOut?   : string,
		onEnd?     : ()=>void
	};

	/** Base interface implemented by all sprites, both vector and bitmap */
	export interface Sprite {
		setDuration: (frames: number, perFrame?: boolean)=>void;
		draw: (ctx: CanvasRenderingContext2D, x: number, y: number, ang?: number)=>void;
		toggle: (play: boolean, setFrame: number)=>void;
		reverse: ()=>void;
		onEnd: ()=>void;
	};


	//
	// Static Methods
	//
	
	/**
		Turn on/off image smoothing (anti-aliasing)
		This is turned off by default
	*/
	export function setImageSmoothing(on: boolean) {
		Engine.getCanvasContext().imageSmoothingEnabled = on;
	}

	
	//
	// Class: Bitmap Tileset
	//
	/** Class for a bitmap tileset, a single image containing several individual static tiles */
	export class TileSet {
		private tileSet: HTMLImageElement;
		/** Width of a single Tile */
		public width: number;
		/** Height of a single Tile */
		public height: number;

		/**
			Tileset can be provided as an Image element or the name of a preloaded asset.
			If no tile height is given, it is assumed the tileset is one tile high
		*/
		constructor(
			tileImage: string | HTMLImageElement,
			tileWidth: number,
			tileHeight?: number
		) {
			this.tileSet = typeof tileImage === 'string' ? Engine.getBackground(tileImage) : tileImage;
			this.width = tileWidth;
			this.height = tileHeight || this.tileSet.height;
		};
		
		/** Draw the tile to the canvas at the point { canX, canY }. */
		public draw(
			ctx: CanvasRenderingContext2D,
			canX: number,
			canY: number,
			tileNum: number
		): void {
			ctx.save();
				ctx.translate(canX, canY);
				let x = tileNum * this.width,
						y = 0;
				if (x >= this.tileSet.width) {
					y = Math.floor(x / this.tileSet.width) * this.height; 
					x %= this.tileSet.width;
				}
				ctx.drawImage(
					this.tileSet,
					x,          y,
					this.width, this.height,
					0,          0,
					this.width, this.height
				);
			ctx.restore();
		};
	};


	//
	// Class: Bitmap Sprite
	//
	/** Class for a bitmap sprite */
	export class SpriteSheet implements Sprite {
			private sprite    : HTMLImageElement;
			private frCurrent : number = 0;
			private frDur     : number;
			private paused    : boolean = false;
			private reversed  : boolean = false;
			/** */
			public width      : number;
			/** */
			public height     : number;
			/** Animation lifecycle hook to run after animation completes a loop */
			public onEnd      : ()=>void = ()=>{};

			/**
					Sprite can be provided as an Image element or the name of a preloaded asset.
					Animated sprites must take the form of an unpadded horizontal sprite sheet.
					frTotal is the number of frames in the sprite sheet.
					duration is the number of game frame animation will last; may be a fraction.
			*/
			constructor(
				sprite  : string | HTMLImageElement,
				private frTotal: number = 1,
				duration: number = 0
			) {
				this.sprite = typeof sprite === 'string' ? Engine.getSprite(sprite) : sprite;
				this.width  = this.sprite.width / frTotal;
				this.height = this.sprite.height;
				this.frDur = duration / frTotal;
			};

			get frame(): number {
				return Math.floor(this.frCurrent);
			}
			set frame(val: number) {
				this.frCurrent = val;
			}
			
			/**
				Draw the sprite to the canvas at the point { canX, canY }.
				ang may be provided to rotate the sprite by the given angle.
				scale can be a single number to scale x and y equally, or an array of [xScale, yScale];
			*/
			public draw(
				ctx: CanvasRenderingContext2D,
				canX: number,
				canY: number,
				ang: number = 0,
				scale: number | number[] = [1, 1]
			): void {
				if (typeof scale === 'number') {
					scale = [scale, scale];
				}
					ctx.save();
						ctx.translate(canX + (this.width / 2), canY + (this.height / 2));
						ctx.scale(scale[0], scale[1]);
						ctx.rotate(ang);
						let currentFrame = Math.floor(this.frCurrent) * this.width;
						if (this.reversed) {
							currentFrame = this.frTotal - currentFrame;
						}
						ctx.drawImage(
							this.sprite,
							currentFrame, 0,
							this.width, this.height,
							-this.width / 2, -this.height / 2,
							this.width,this.height
						);
						if (this.frDur > 0 && !this.paused) {
							this.frCurrent += this.frDur * Engine.getDelta();
							if (this.frCurrent >= this.frTotal) {
								this.frCurrent = 0;
							}
						}
					ctx.restore();
			};

			/** Sets number of game frames animation will last for
					If perFrame, sets number of game frames a single frame of sprite sheet will last for
			*/
			public setDuration(frames: number, perFrame: boolean = false) {
				this.frDur = perFrame ? frames : frames / this.frTotal;
			}

			/** Play/pause animation.
					Will toggle to opposite of current state if play is not provided.
			*/
			public toggle(play?: boolean) {
				if (typeof play === 'undefined') {
					this.paused = !this.paused;
				} else {
					this.paused = !play;
				} 
			};

			/** Reverse direction of animation.
					Will toggle to opposite of current direction if runBackwards is not provided.
			*/
			public reverse(runBackwards?:boolean) {
				if (typeof runBackwards === 'undefined') {
					this.reversed = !this.reversed;
				} else {
					this.reversed = runBackwards;
				}
			};
	};


	//
	// Class: Vector Sprite
	//
	/** Class for vector graphic sprites */
	export class VectorSprite implements Sprite {
			private fr        : number = 0;
			private paused : boolean = false;
			/** Animation lifecycle hook to run after animation completes a loop */
			public onEnd     : () => void = () => {};

			/** Sprite is provided as a draw function with a series of canvas draw commands
					keyFrameSet contains a list of keyframes whose variables will be interpolated based on the current frame before being provided to the draw function
					duration is the number of game frame animation will last; may be a fraction.
			*/
			constructor(
					public drawFunction: drawFunction,
					public keyframeSet: keyframeSet = null,
					public duration: number = 30
			) {
			};

			/** Draw the sprite to the canvas at the point { canX, canY }.
					Ang may be provided to rotate the sprite by the given angle.
			*/
			public draw(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number = 0) {
					ctx.save();
							ctx.translate(x, y);
							ctx.rotate(ang);
							this.drawFunction(this.keyframeSet ? tween(this.keyframeSet, this.fr) : null, ctx);
					ctx.restore();

					if (this.paused) {
							return;
					}

					this.fr += (1 / this.duration) * Engine.getDelta();
					
					if (this.fr > 1 || this.fr < 0) {
							this.fr = (this.fr + 1) % 1;
							this.onEnd();
					}
			};

			/** Sets number of game frames to display animation for */
			public setDuration(frames: number) {
					this.duration = this.duration < 0 ? frames * -1 : frames;
			}

			/** Play/pause animation.
					Will toggle to opposite of current state if play is not provided.
			*/
			public toggle(play?: boolean ) {
					if (typeof play === 'undefined') {
							this.paused = !this.paused;
					} else {
							this.paused = !play;
					}
			};

			/** Reverse direction of animation.
					Will toggle to opposite of current direction if runBackwards is not provided.
			*/
			public reverse(runBackwards?:boolean) {
					if (
							(typeof runBackwards === 'undefined') ||
							(this.duration < 0 && !runBackwards) ||
							(this.duration > 0 && runBackwards)
					) {
							this.duration *= -1;
					}
			};
	};

	//
	// Class: Dynamic Vector Sprite
	//
	// export class DynamicVectorSprite implements ISprite {
	//     public fr        : number = 0;
	//     public duration  : number;
	//     public onEnd     : ()=>void = ()=>{};
	//     public currentState  : string;
	//     public currentAction : string;
	//     private state    : spriteState;
	//     private action   : spriteState = null;
	//     private isPaused : boolean = false;

	//     constructor(
	//         public elements : { [element: string] : drawFunction },
	//         public states   : { [state: string]   : spriteState  },
	//         public actions  : { [action: string]  : spriteState  }
	//     ) {
	//         for (let s in states) {
	//             states[s].onEnd = states[s].onEnd || (() => {});
	//         }
	//         for (let a in actions) {
	//             actions[a].fr = 0;
	//             actions[a].onEnd = actions[a].onEnd || (() => {});
	//         }
	//         this.currentState = Object.keys(states)[0];
	//         this.state = states[this.currentState];
	//         this.duration = this.state.duration;
	//     };

	//     public draw(ctx: CanvasRenderingContext2D, x: number, y: number, ang: number = 0) {
	//         ctx.save();
	//             ctx.translate(x, y);
	//             ctx.rotate(ang);
	//             for (let el in this.elements) {
	//                 let props;
	//                 if (this.action && this.action.elements[el]) {
	//                     props = tween(this.action.elements[el], this.action.fr);
	//                 }
	//                 if (this.state.elements[el]) {   
	//                     let stateProps = tween(this.state.elements[el], this.fr);
	//                     if (!props) {
	//                         props = stateProps;
	//                     } else {
	//                         for (let p in stateProps) {
	//                             if (!props[p]) {
	//                                 props[p] = stateProps[p];
	//                             }
	//                         }
	//                     }
	//                 }
	//                 if (props) {
	//                     this.elements[el](props, ctx); 
	//                 }
	//             }
	//         ctx.restore();

	//         if (!this.isPaused) {
	//             if (this.duration) {
	//                 this.fr += (1 / this.duration) * Engine.getDelta();
	//                 if (this.fr > 1 || this.fr < 0) {
	//                     this.fr = (this.fr + 1) % 1;
	//                     this.state.onEnd();
	//                     this.onEnd();
	//                 }
	//             }
	//             if (this.action) {
	//                 this.action.fr += (1 / this.action.duration) * Engine.getDelta();
	//                 if (this.action.fr > 1 || this.action.fr < 0) {
	//                     if (this.action.iteration > 1) {
	//                         this.action.iteration--;
	//                     } else {
	//                         if (this.action.iteration === -1) {
	//                             this.action.onEnd();
	//                         } else {
	//                             this.action.onEnd();
	//                             this.action = null;
	//                             this.currentAction = null;
	//                         }
	//                     }
	//                 }
	//             }
	//         }
	//     };

	//     /** Sets number of game frames to display sprite animation for */
	//     public setDuration(frames: number) {
	//         this.duration = frames;
	//     }

	//     public changeState(state: string, setFrame: number = -1, transition: number = 5, ease: string = 'sine'): void {
	//         if (this.currentState === state && setFrame === -1) {
	//             return;
	//         }
	//         this.currentState = state;

	//         if (transition) {
	//             let nextState = this.states[state],
	//                 endFrame;
	//             if (nextState.duration) {
	//                 endFrame = setFrame === -1 ? (1 + this.fr + (transition / nextState.duration)) % 1 : setFrame;
	//             } else {
	//                 endFrame = 0;
	//             }
	//             let transState = {
	//                 duration : transition,
	//                 onEnd    : this.setState.bind(this, state, endFrame),
	//                 elements : {}
	//             };
	//             for (let el in nextState.elements) {
	//                 transState.elements[el] = {};
	//                 let startValues = this.state.elements[el] ? tween(this.state.elements[el], this.fr) : false,
	//                     endValues   = tween(nextState.elements[el], endFrame);
	//                 for (let param in nextState.elements[el]) {
	//                     if (!startValues || startValues[param] === undefined) {
	//                         transState.elements[el][param] = endValues[param];
	//                     } else {
	//                         transState.elements[el][param] = [[0, startValues[param], ease], [1, endValues[param], ease]];
	//                     }
	//                 }
	//             }
	//             this.state = transState;
	//             this.duration = transition;
	//             this.fr = 0;
	//         } else {
	//             this.setState(state, setFrame);
	//         }
	//     };

	//     private setState(state: string, setFrame = -1) {
	//         this.state = this.states[state];
	//         if (setFrame !== -1) {
	//             this.fr = setFrame;
	//         }
	//         this.duration = this.state.duration;
	//     };

	//     public trigger(action: string, iterations: number = 1, transition: number = 10, ease: string = 'sine'): void {
	//         if (this.currentAction === action) {
	//             return;
	//         }
	//         this.currentAction = action;

	//         if (transition) {
	//             let nextAction = this.actions[action];
	//             this.action = {
	//                 fr        : 0,
	//                 iteration : -1,
	//                 duration  : transition,
	//                 onEnd     : this.setAction.bind(this, action, iterations),
	//                 elements  : {}
	//             };
	//             for (let el in nextAction.elements) {
	//                 this.action.elements[el] = {};
	//                 let startValues = this.state.elements[el] ? tween(this.state.elements[el], this.fr) : false,
	//                     endValues   = tween(nextAction.elements[el], 0);
	//                 for (let param in nextAction.elements[el]) {
	//                     if (!startValues || startValues[param] === undefined) {
	//                         this.action.elements[el][param] = endValues[param];
	//                     } else {
	//                         this.action.elements[el][param] = [[0, startValues[param], ease], [1, endValues[param], ease]];
	//                     }
	//                 }
	//             }
	//         } else {
	//             this.setAction(action, iterations)
	//         }
	//     };

	//     private setAction(action, iterations) {
	//         this.action = this.actions[action];
	//         this.action.iteration = iterations;
	//         this.action.fr = 0;
	//     };

	//     public toggle(play: boolean = null, setFrame?: number, setActionFrame?: number) {
	//         this.isPaused = play === null ? !this.isPaused : !play;
	//         if (setFrame || setFrame === 0) {
	//             this.state.fr = setFrame;
	//         }
	//         if ((setActionFrame || setActionFrame === 0) && this.action) {
	//             this.action.fr = setActionFrame;
	//         }
	//     };

	//     public reverse() {
	//         this.duration *= -1;
	//     };
	// };

	/** Class to create a particle emitter */
	export class Emitter extends GameObject {
		public parts				: Particle[] = [];
		private currentRate : number = 0;
		private deleted			: boolean = false;
		
		// Emitter
		private _ang   : number[] = [0, 0];
		private _power : number[] = [1, 0];
		private _rate  : number[] = [-1, 0];
		private _grav  : Physics.Vec;

		// Point particles
		private _size     : number[] = [2, 0];
		private _color    : string[] = ['dodgerblue'];
		private _lifespan : number[] = [100, 0];
		private _fade  		: number[] = [-1, 0];

		// Sprite particles
		private _sprite		: HTMLImageElement | ((ctx: CanvasRenderingContext2D) => void);
		private	_partAng  : number[] = [0, 0];
		private _partDAng	: number[] = [0, 0];

		/** Angle, Power and Rate can be given as a constant or as a range [lowest, highest] to randomly choose from */
		constructor(
			public x: number,
			public y: number,
			z: number,
			ang?   : number | number[],
			power? : number | number[],
			rate?  : number | number[],
		) {
			super(x, y, z);
			if (ang) {
				this._ang = this.configRange(ang);
			}
			if (power) {
				this._power = this.configRange(power);
			}
			if (rate) {
				this._rate = this.configRange(rate);
			}
		};

		set gravity(g : Physics.Vec | number) {
			if (typeof g === 'number') {
				this._grav = new Physics.Vec(g, Math.PI / 2, true);                    
			} else {
				this._grav = g as Physics.Vec;
			}
		}

		set angle(a: number | number[]) {
			this._ang = this.configRange(a);
		}
		set power(a: number | number[]) {
			this._power = this.configRange(a);
		}
		/**
		 * Time between particle emissions, set to -1 to stop emissions
		 */
		set rate(a: number | number[]) {
			this._rate = this.configRange(a);
		}
		set fade(f: number | number[]) {
			this._fade = this.configRange(f);
		}

		private configRange(p): number[] {
			return typeof p === 'number' ? [p, 0] : [p[0], p[1] - p[0]];
		}

		private getValue(range) {
			if (typeof range[0] === 'string') {
				return range[Math.floor(Math.random() * range.length)] as string;
			} else {
				return range[0] + (Math.random() * range[1]);
			}
		}

		public setParticle(
			size: number | number[],
			color?: string | string[],
			lifespan?: number | number[],
			fade?: number | number[]
		) {
			this.sprite = null;
			this._size = this.configRange(size);
			if (color) {
				this._color = typeof color === 'string' ? [color] : color;
			}
			if (lifespan) {
				this._lifespan = this.configRange(lifespan);
			}
			if (fade) {
				this._fade = this.configRange(fade);
			}
		}

		public setSpriteParticle(
			sprite: ((ctx: CanvasRenderingContext2D, rand?: number)=>void) | HTMLImageElement,
			lifespan?: number | number[],
			fade?: number | number[],
			ang?: number | number[],
			dAng?: number | number[]
		) {
			this._sprite = sprite;
			if (lifespan) {
				this._lifespan = this.configRange(lifespan);
			}
			if (fade) {
				this._fade = this.configRange(fade);
			}
			if (ang) {
				this._partAng = this.configRange(ang);
			}
			if (dAng) {
				this._partDAng = this.configRange(dAng);
			}
		}

		public emit(amount: number, offset: number = 0) {
			for (let i = 0; i < amount; i++) {
				this.parts.push(new Particle(
					this.x,
					this.y,
					this.getValue(this._lifespan),
					new Physics.Vec(
						this.getValue(this._power),
						this.ang + this.getValue(this._ang), 
						true
					),
					this.getValue(this._fade),
					offset,
					this._sprite || [
						this.getValue(this._size),
						this.getValue(this._color)
					],
					this._partAng ? this.getValue(this._partAng) : 0,
					this._partDAng ? this.getValue(this._partDAng) : 0
				));
			}
		}

		public step(dt: number) {
			if (this._rate[0] > -1) {
				this.currentRate += dt;
				if (this.currentRate > this._rate[0]) {
					for(let i = this._rate[0]; i < this.currentRate; i += this._rate[0]) {
						this.emit(1, (this.currentRate - i) / this._rate[0]);
					}   
					this.currentRate %= this._rate[0];
					this.currentRate += Math.random() * this._rate[1];
				}
			}
			this.parts.forEach((p, i) => {
				p.step(dt, this._grav);
				if (p.opacity <= 0) {
					this.parts.splice(i, 1);
				}
			});

			if (this.deleted && this.parts.length === 0 ) {
				super.delete();
			}
		}

		public draw(ctx: CanvasRenderingContext2D, dt: number) {
			ctx.save();
				this.parts.forEach(p => p.draw(ctx));
			ctx.restore();
		}

		public delete(force: boolean = false) {
			if (force) {
				this.parts = [];
				super.delete();
			} else {
				this.deleted = true;
			}
		}
	}

	class Particle {
		public opacity: number = 1;
		private randomSeed: number;
		public draw: (ctx: CanvasRenderingContext2D)=>void;

		constructor (
			private x         : number,
			private y         : number,
			public lifespan 	: number,
			private velocity  : Physics.Vec,
			private fade			: number,
			offset			      : number,
			sprite: 
				((ctx: CanvasRenderingContext2D, rand: number)=>void) |
				HTMLImageElement |
				[number, string],
			private ang				: number,
			private dAng			: number
		) {
			if (!velocity) {
				this.velocity = new Physics.Vec(0, 0);
			}
			let rad = 0;
			// Draw function
			if (typeof sprite === 'function') {
				this.randomSeed = Math.random();
				this.draw = ctx => {
					ctx.save();
						ctx.globalAlpha = this.opacity;
						ctx.translate(this.x, this.y);
						ctx.rotate(this.ang);
						sprite(ctx, this.randomSeed);
					ctx.restore();
					this.ang += this.dAng;
				}
			}
			// Sprite image
			else if (typeof sprite[0] !== 'number') {
				rad = Math.sqrt(
					Math.pow((sprite as HTMLImageElement).width, 2) +
					Math.pow((sprite as HTMLImageElement).height, 2)
				) / 2;
				this.draw = ctx => {
					ctx.save();
						ctx.globalAlpha = this.opacity;
						ctx.translate(this.x - rad, this.y - rad);
						ctx.rotate(this.ang);
						ctx.drawImage(sprite as HTMLImageElement, 0, 0);
					ctx.restore();
					this.ang += this.dAng;
				}
			}
			// [size, color] point
			else {
				const
					size = sprite[0],
					color = sprite[1];
				rad = size / 2;
				this.draw = (ctx) => {
					ctx.beginPath();
						ctx.moveTo(this.x, this.y);
						ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
					ctx.globalAlpha = this.opacity;
					ctx.fillStyle = color;
					ctx.fill();
				}
			}
			this.x += this.velocity.scale(offset).x - rad;
			this.y += this.velocity.scale(offset).y - rad;
		};

		public step(dt: number, gravity?: Physics.Vec) {
			if (gravity) {
				this.velocity = this.velocity.add(gravity);
			}
			this.x += this.velocity.x;
			this.y += this.velocity.y;

			if (this.lifespan > 0) {
				this.lifespan -= dt;
			} else {
				if (this.fade === - 1) {
					this.opacity = 0;
				} else {
					this.opacity -= this.fade;
				}
			}
		}
	}

	//
	// Private Methods
	//
	function tween(keyframeSet: keyframeSet, currentFrame: number): {[param : string] : number} {
			let params = {};
			for (let key in keyframeSet) {
					if (typeof keyframeSet[key] === 'number') {
							params[key] = keyframeSet[key];
					} else {
							params[key] = interpolate(keyframeSet[key], currentFrame);
					}
			}
			return params;
	};   

	function interpolate(keyframe: number[] | number[][] | (number|string)[][], currentFrame: number): number {
		let nextKeyframe = 0;
		//TODO: optimise for number[] case
		keyframe = keyframe as number[] | number[][] | (number|string)[][];
		if (typeof keyframe[0] === 'number') {
				keyframe = (keyframe as number[]).map((k, i) => [i / (keyframe as number[]).length, k]);
		}

		for(let k = 0; k < keyframe.length; k++) {
				if (currentFrame < keyframe[k][0]) {
						nextKeyframe = k;
						break; 
				}
		}

		let end   = keyframe[nextKeyframe],
				start = keyframe[nextKeyframe === 0 ? keyframe.length - 1 : nextKeyframe - 1];
		if (end[0] === 1) {
				end[0] = 0.9999;
		}

		let frameDiff = (1 + end[0] - start[0]) % 1;
		return Easings[start[2] || 'sine'](currentFrame - start[0], start[1], end[1] - start[1], frameDiff);
	};

	//
	// Easing Functions
	//
	const Easings = {
		linear: (t, b, c, d) => b + (c * (t / d)),
		sine:   (t, b, c, d) => -c/2 * (Math.cos(Math.PI*t/d) - 1) + b,
		cubic:  (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t*t + b : c/2*((t-=2)*t*t + 2) + b,
		quad:   (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t + b : -c/2 * ((--t)*(t-2) - 1) + b,
		quart:  (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t*t*t + b : -c/2 * ((t-=2)*t*t*t - 2) + b,
		quint:  (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t*t*t*t + b : c/2*((t-=2)*t*t*t*t + 2) + b,
		expo:   (t, b, c, d) => {
			if (t==0) return b;
			if (t==d) return b+c;
			if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
			return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
		},
		back:    (t, b, c, d) =>  (t/=d/2) < 1 ? c/2*(t*t*((3.6)*t - 2.6)) + b : c/2*((t-=2)*t*(3.6*t + 2.6) + 2) + b,
		bounce:  (t, b, c, d) => t < d/2 ? Easings.bounceIn(t*2, 0, c, d) * .5 + b : Easings.bounceOut(t*2-d, 0, c, d) * .5 + c*.5 + b,
		elastic: (t, b, c, d) => {
			let s=1.70158, p=0, a=c;
			if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
			if (a < Math.abs(c)) { a=c; s=p/4; }
			else s = p/(2*Math.PI) * Math.asin (c/a);
			if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
			return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
		},
		circular:   (t, b, c, d) => (t/=d/2) < 1 ? -c/2 * (Math.sqrt(1 - t*t) - 1) + b : c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b,
		sineIn:     (t, b, c, d) => -c * Math.cos(t/d * (Math.PI/2)) + c + b,
		cubicIn:    (t, b, c, d) => c*(t/=d)*t*t + b,
		quadIn:     (t, b, c, d) => c*(t/=d)*t + b,
		quartIn:    (t, b, c, d) => c*(t/=d)*t*t*t + b,
		expoIn:     (t, b, c, d) => (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b,
		circularIn: (t, b, c, d) => -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b,
		backIn:     (t, b, c, d) => c*(t/=d)*t*(2.7*t - 1.7) + b,
		bounceIn:   (t, b, c, d) => c - Easings.bounceOut(d-t, 0, c, d) + b,
		elasticIn:  (t, b, c, d) => {
			let s=1.70158, p=0, a=c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; s=p/4; }
			else s = p/(2*Math.PI) * Math.asin (c/a);
			return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
		},
		sineOut:    (t, b, c, d) => c * Math.sin(t/d * (Math.PI/2)) + b,
		cubicOut:   (t, b, c, d) => c*((t=t/d-1)*t*t + 1) + b,
		quadOut:    (t, b, c, d) => -c *(t/=d)*(t-2) + b,
		quartOut:   (t, b, c, d) => -c * ((t=t/d-1)*t*t*t - 1) + b,
		expoOut:    (t, b, c, d) => (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b,
		circularOut:(t, b, c, d) => c * Math.sqrt(1 - (t=t/d-1)*t) + b,
		backOut:    (t, b, c, d) => c*((t=t/d-1)*t*(2.7*t + 1.7) + 1) + b,
		bounceOut:  (t, b, c, d) => {
			if ((t/=d) < (1/2.75)) {
				return c*(7.5625*t*t) + b;
			} else if (t < (2/2.75)) {
				return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
			} else if (t < (2.5/2.75)) {
				return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
			} else {
				return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
			}
		},
		elasticOut: (t, b, c, d) => {
			var s=1.70158;var p=0;var a=c;
			if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
			if (a < Math.abs(c)) { a=c; var s=p/4; }
			else var s = p/(2*Math.PI) * Math.asin (c/a);
			return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
		}
	};
}
