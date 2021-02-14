import { Engine } from './Engine';
import { World } from './World';
import { Bindable } from './Common';
import { Debug } from './Debug';

/** This module creates lighting effects including shadow casting, background lighting and coloured lighting */
export module Light {

	//
	// Private Variables
	//

	let
		// Canvas for drawing the background light (shadow)
			can0: HTMLCanvasElement,
			ctx0: CanvasRenderingContext2D,
		// Canvas for storing the light from all sources, before removing from can0 light
			can1: HTMLCanvasElement,
			ctx1: CanvasRenderingContext2D,
		// Canvas for drawing a single source
			can2: HTMLCanvasElement,
			ctx2: CanvasRenderingContext2D,
		// Canvas for drawing a shadow
			can3: HTMLCanvasElement,
			ctx3: CanvasRenderingContext2D;
		

	//
	// Private Methods
	//

	function lightEngineInit() {
		can0 = document.createElement('canvas');
		can1 = document.createElement('canvas');
		can2 = document.createElement('canvas');
		can3 = document.createElement('canvas');
		can0.width  = can1.width  = can2.width  = can3.width  = Engine.cW;
		can0.height = can1.height = can2.height = can3.height = Engine.cH;
		ctx0 = can0.getContext('2d');
		ctx1 = can1.getContext('2d');
		ctx2 = can2.getContext('2d');
		ctx3 = can3.getContext('2d');
		ctx0.imageSmoothingEnabled = false;
		ctx1.imageSmoothingEnabled = false;
		ctx2.imageSmoothingEnabled = false;
		ctx3.imageSmoothingEnabled = false;

		// can3.style.position = 'fixed';
		// can3.style.border = '1px solid red';
		// can3.style.zIndex = '100';
		// can3.style.top = '-50';
		// can3.style.left = '-50';
		// document.body.appendChild(can3);
	}

	function angDiff(a0: number, a1: number): number {
		let a = a0 - a1;
		a += (a > Math.PI) ? -2 * Math.PI : (a < -Math.PI) ? 2 * Math.PI : 0;
		return a;
	};

	function getAng(x: number, y: number): number {
		return (6.2832 + Math.atan2(y, x)) % 6.2832;
	};


	//
	// Public Classes
	//

	/** Light settings for an Area */
	export class LightArea {
		public active: boolean = true;
		public sources: Source[] = [];
		public blocks: Block[] = [];

		/*
			bgLight is a hex value of the background light of the area, defaults to #000000ff (fully opaque black)
			bgLight can also be a CanvasGradient, which will be used to fill the area background
		*/
		constructor(
			public area: World.Area,
			bgLight: string | CanvasGradient = '#000'
		) {
			if (!can1) {
				lightEngineInit();
			}
			ctx0.fillStyle = bgLight;
		}

		set bgLight(color: string | CanvasGradient) {
			ctx0.fillStyle = color;
		}

		/** */
		public addSource(source: Source | Source[]) {
			[].concat(source).forEach(s => {
				s.delete();
				s.lightArea = this;
				this.sources.push(s);
			});
		}

		/** */
		public addBlock(block: Block | Block[]) {
			[].concat(block).forEach(s => {
				s.delete();
				s.lightArea = this;
				this.blocks.push(s);
			});
		}

		public draw(ctx: CanvasRenderingContext2D) {
			if (!this.active) {
				return;
			}

			// Update position of bound objects
			this.sources.forEach(s => {
				if (s.bound) {
					if (typeof s.bound.angOffset === 'undefined') {
						s.x = s.bound.obj.x + s.bound.xOffset;
						s.y = s.bound.obj.y + s.bound.yOffset;
					} else {
						let ang = s.bound.obj.ang + s.bound.angOffset;
						s.x = s.bound.obj.x + s.bound.xOffset + (Math.cos(ang) * s.bound.xCenter);
						s.y = s.bound.obj.y + s.bound.yOffset + (Math.sin(ang) * s.bound.yCenter);
						s.ang = ang;
					}
				}
			});
			this.blocks.forEach(b => {
				if (b.bound.obj) {
					b.x = b.bound.obj.x + b.bound.xOffset;
					b.y = b.bound.obj.y + b.bound.yOffset;
					if (typeof b.bound.angOffset === 'number') {
						b.ang = b.bound.obj.ang + b.bound.angOffset;
					}
				}
			});

			ctx1.clearRect(0, 0, can1.width, can1.height);

			ctx2.save();
				ctx2.scale(this.area.view.z, this.area.view.z);
				ctx2.translate(-this.area.view.x, -this.area.view.y);
			ctx3.save();
				ctx3.scale(this.area.view.z, this.area.view.z);
				ctx3.translate(-this.area.view.x, -this.area.view.y);
				this.sources
					.filter(s => (
						s.active &&
						s.x + s.rad > this.area.view.x &&
						s.x - s.rad < this.area.view.x + this.area.view.width &&
						s.y + s.rad > this.area.view.y &&
						s.y - s.rad < this.area.view.y + this.area.view.height
					))
					.forEach(source => {
						if (!source.castShadows) {
							// Draw non-shadow casting lights straight to can1 to save time
							ctx1.save();
								ctx1.scale(this.area.view.z, this.area.view.z);
								ctx1.translate(source.x - this.area.view.x, source.y - this.area.view.y);
								ctx1.rotate(source.ang);
								ctx1.globalCompositeOperation = 'soft-light';
								ctx1.drawImage(source.mask, -source.rad, -source.rad);
							ctx1.restore();
						} else {
							let
								nearBlocks: [Block, number][] = [],
								sourceInBlock = false;
							// Only draw shadows for blocks within reach of light
							this.blocks.forEach(block => {
								let dis =
									Math.pow(block.x + block.bound.xCenter - source.x, 2) +
									Math.pow(block.y + block.bound.yCenter - source.y, 2);
								if (dis < Math.pow(source.rad + block.clipRad, 2)) {
									// If light is within block and block has blockLightInside = true, draw no light from source
									if (block.blockLightInside && dis < Math.pow(block.clipRad, 2)) {
										sourceInBlock = true;
									}
									// Add block to array in order of distance from source to draw overlapping shadows correctly
									for (let i = 0; i <= nearBlocks.length; i++) {
										if (i === nearBlocks.length) {
											nearBlocks.push([block, dis]);
											break;
										}
										if (dis > nearBlocks[i][1]) {
											nearBlocks.splice(i, 0, [block, dis]);
											break;
										}
									}
								}
							});
							
							if (!sourceInBlock) {
								ctx2.save();
									ctx2.translate(source.x, source.y);
									ctx2.rotate(source.ang);
									ctx2.globalCompositeOperation = 'source-over';
									ctx2.drawImage(source.mask, -source.rad, -source.rad);
								ctx2.restore();

								let group = [];
								nearBlocks
									.map(b => b[0])
									.sort((a, b) => a.group - b.group)
									.forEach((block, i, blockArr) => {
										let	corners: {x: number, y: number}[] = [];
										if (block.mask) {
											// Get shadow casting corners of polygon
											let
												poly = block.mask.map(m => {
													return {
														x: m.x + block.x - source.x,
														y: m.y + block.y - source.y
													}
												}),
												diff = 3.1416 - getAng(block.x + block.bound.xCenter - source.x, block.y + block.bound.yCenter - source.y),
												sAng = Math.sin(diff),
												cAng = Math.cos(diff),
												max = 3.1416,
												min = 3.1416,
												maxP: {x: number, y: number},
												minP: {x: number, y: number};
											poly.forEach(p => {
												let a = getAng(
													(p.x * cAng) - (p.y * sAng),
													(p.x * sAng) + (p.y * cAng)
												);
												if (a > max) {
													max = a;
													maxP = p;
												} else if (a < min) {
													min = a;
													minP = p;
												} 
											});
											corners.push(
												{ x: minP.x + source.x, y: minP.y + source.y },
												{ x: maxP.x + source.x, y: maxP.y + source.y },						
											);
										} else {
											// Get shadow casting corners of circle
											let angDiff = getAng(block.x + block.bound.xCenter - source.x, block.y - block.bound.yCenter - source.y);
											corners.push(
												{
													x: block.x + block.bound.xCenter + (Math.cos(angDiff - (Math.PI / 2)) * block.clipRad),
													y: block.y + block.bound.yCenter + (Math.sin(angDiff - (Math.PI / 2)) * block.clipRad)
												},
												{
													x: block.x + block.bound.xCenter + (Math.cos(angDiff + (Math.PI / 2)) * block.clipRad),
													y: block.y + block.bound.yCenter + (Math.sin(angDiff + (Math.PI / 2)) * block.clipRad)
												}
											);
										}
										// Calculate where shadow edges meet boundary of light
										let ang = Math.atan2(
											corners[1].y - source.y,
											corners[1].x - source.x
										);
										corners.push({
											x : source.x + (source.rad * Math.cos(ang)),
											y : source.y + (source.rad * Math.sin(ang))
										});
										ang = Math.atan2(
											corners[0].y - source.y,
											corners[0].x - source.x
										);
										corners.push({
											x : source.x + source.rad * Math.cos(ang),
											y : source.y + source.rad * Math.sin(ang)
										});

										// Draw shadow pattern
										if (
											block.group === -1 ||
											i === 0 ||
											blockArr[i - 1].group !== block.group
										) {
											ctx2.beginPath();
											group = [];
										}
										ctx2.moveTo(corners[0].x, corners[0].y);
										ctx2.lineTo(corners[1].x, corners[1].y);
										ctx2.lineTo(corners[2].x, corners[2].y);
										ctx2.lineTo(corners[3].x, corners[3].y);

										group.push(
											corners[0],
											corners[1],
											corners[2],
											corners[3],
											corners[0],
										);

										let ang0 = Math.atan2(
											corners[2].y - source.y,
											corners[2].x - source.x
										);
										let ang1 = Math.atan2(
											corners[3].y - source.y,
											corners[3].x - source.x
										);
										ctx2.arc(
											source.x, source.y,
											source.rad,
											ang0, ang1,
											angDiff(ang0, ang1) > 0
										);
										ctx2.lineTo(corners[0].x, corners[0].y);

										if (
											block.group === -1 ||
											i === blockArr.length - 1 ||
											blockArr[i + 1].group !== block.group
										) {
											ctx2.fillStyle = block.translucentColor;
											ctx2.globalCompositeOperation = 'destination-out';
											ctx2.fill();

											//group.forEach(b => {
												let b = {
													block: block,
													corners: corners,
													ang0: ang0,
													ang1: ang1
												};
												let mask = b.block.spriteMask;
												if (b.block.translucentColor === '#000') {
													mask.draw(ctx2);
												} if (b.block.group === -1) {
													mask.draw();
													mask.ctx.save();
														mask.ctx.translate(-b.block.x, -b.block.y);
														mask.ctx.beginPath();
															mask.ctx.moveTo(b.corners[0].x, b.corners[0].y);
															mask.ctx.lineTo(b.corners[1].x, b.corners[1].y);
															mask.ctx.lineTo(b.corners[2].x, b.corners[2].y);
															mask.ctx.lineTo(b.corners[3].x, b.corners[3].y);
															mask.ctx.arc(
																source.x, source.y,
																source.rad,
																b.ang0, b.ang1,
																angDiff(b.ang0, b.ang1) > 0
															);
															mask.ctx.lineTo(b.corners[0].x, b.corners[0].y);
														mask.ctx.fillStyle = '#000';
														mask.ctx.globalCompositeOperation = 'destination-out';
														mask.ctx.fill();
													mask.ctx.restore();
													ctx2.drawImage(mask.can, b.block.x - (b.block.clipRad / 4), b.block.y - (b.block.clipRad / 4));

													ctx2.globalCompositeOperation = 'source-atop';
													ctx2.fill();
													ctx2.drawImage(mask.can, b.block.x - (b.block.clipRad / 4), b.block.y - (b.block.clipRad / 4));
												} else {
													
													//ctx3.globalCompositeOperation = 'destination-out';
													ctx3.save();
													ctx3.setTransform(1, 0, 0, 1, 0, 0);
													ctx3.clearRect(0, 0, can3.width, can3.height);
													ctx3.restore();
													ctx3.globalCompositeOperation = 'source-over';
													mask.mask(ctx3);
													ctx3.beginPath();
													group.forEach((p, i) => {
														if (i % 5) {
															ctx3.lineTo(p.x, p.y);
														} else {
															ctx3.moveTo(p.x, p.y);
															}
														})
														ctx3.globalCompositeOperation = 'destination-out';
													ctx3.fillStyle = 'green';
													ctx3.fill();
													
													ctx3.globalCompositeOperation = 'source-in';
													ctx3.save();
													ctx3.setTransform(1, 0, 0, 1, 0, 0);
													ctx3.fillStyle = block.translucentColor;
													ctx3.fillRect(0, 0, can3.width, can3.height);
													ctx3.restore();

													ctx2.save();
														ctx2.setTransform(1, 0, 0, 1, 0, 0);
														ctx2.drawImage(can3, 0, 0);
													ctx2.restore();
												}
											// });
											//ctx3.restore();
										}
									});

								// Add light to light from other sources
								ctx1.globalCompositeOperation = 'lighter';
								ctx1.drawImage(can2, 0, 0);

								// Reset working canvas
								ctx2.save();
									ctx2.setTransform(1, 0, 0, 1, 0, 0);
									ctx2.clearRect(0, 0, can2.width, can2.height);
								ctx2.restore();
							}
						}
					});
			ctx2.restore();
			ctx3.restore();

			// Draw the background light (shadows)
			ctx0.globalCompositeOperation = 'source-over';
			ctx0.clearRect(0, 0, can0.width, can0.height);
			ctx0.fillRect(0, 0, can0.width, can0.height);
			ctx0.globalCompositeOperation = 'destination-out';
			ctx0.drawImage(can1, 0, 0);

			// Draw the lighting
			ctx.globalCompositeOperation = 'source-over';
			ctx.drawImage(can0, 0, 0);
			ctx.globalCompositeOperation = 'lighter';
			ctx.drawImage(can1, 0, 0);
			ctx.globalCompositeOperation = 'source-over';
		}
	}

	/** Light emitting object */
	export class Source extends Bindable {
		/** Direction light is pointing; only matters if light arc is set */
		public ang: number = 0;
		public mask: HTMLCanvasElement;
		public lightArea: LightArea;
		public customMask: (ctx: CanvasRenderingContext2D, radius: number, color: string)=>void;
		public active: boolean = true;
		private maskCtx: CanvasRenderingContext2D;
		private _rad: number;
		private _color: string;
		private transColor: string;
		private _arc: number;
		private _edgeBlur: number;

		/**
		  rad is the radius of the light circle cast.
			color is a hex value, defaults set to #fff (white)
			If castShadows is false, light will not be affected by blockers
			arc is the angle in radians of the light circle cast. Default is 2PI, a full circle.
			If arc is not a full circle, edgeBlue defines the blur of the arc edges.
		 */
		constructor(
			public x: number,
			public y: number, 
			rad: number,
			color: string = '#fff',
			public castShadows: boolean = true,
			arc: number = 6.2832,
			edgeBlur: number = 0
		) {
			super();
			this._rad = rad;
			this._arc = arc;
			this._edgeBlur = edgeBlur;

			this.mask = document.createElement('canvas');
			this.maskCtx = this.mask.getContext('2d');
			this.mask.width = this.mask.height = rad * 2;

			this.color = color;

			if (!World.area.light) {
				console.error('Bunas Light Error: Can\'t add Block before calling Area.toggleLight()');
				return;
			}
			World.area.light.addSource(this);
			this.lightArea = World.area.light;
		}

		get rad(): number {
			return this._rad;
		}
		set rad(newRad: number) {
			if (newRad < 1) {
				this._rad = 1;
				this.active = false;
			} else if (newRad !== this._rad) {
				this._rad = newRad;
				this.active = true;
				this.mask.width = this.mask.height = newRad * 2;
				this.setMask();
			}
		}

		get opacity(): number {
			return parseInt(this._color.substr(7, 2), 16) / 255;
		}
		set opacity(val: number) {
			let val16 = Math.floor(Math.max(0, Math.min(1, val)) * 255).toString(16);
			this.color = this._color.substring(0, 7) + (val16.length === 1 ? '0' + val16 : val16);
		}

		get color(): string {
			return this._color;
		}
		set color(val: string) {
			if (val.length === 4) {
				val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
			} else if (val.length === 5) {
				val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3] + val[4] + val[4];
			}
			if (val.length === 7) {
				val += 'ff';
			}
			this._color = val;
			this.transColor = val.substring(0, 7) + '00';
			this.setMask();
		}

		set arc(newArc: number) {
			if (newArc !== this._arc) {
				this._arc = newArc;
				this.setMask();
			}
		}

		set edgeBlur(newBlur: number) {
			if (newBlur !== this._edgeBlur) {
				this._edgeBlur = newBlur;
				this.setMask();
			}
		}

		private setMask() {
			this.maskCtx.save();
				this.maskCtx.translate(this._rad, this._rad);
				if (this.customMask) {
					this.customMask(this.maskCtx, this._rad, this._color);
				} else {
					this.maskCtx.beginPath();
						this.maskCtx.moveTo(0, 0);
						this.maskCtx.arc(
							0, 0,
							this._rad,
							this._arc / -2, this._arc / 2
						);
						this.maskCtx.lineTo(0, 0);
						if (this._arc < 6.282 && this._edgeBlur > 0) {
							let blurX = Math.asin(this._arc / 2) * this._edgeBlur,
									blurY = Math.acos(this._arc / 2) * this._edgeBlur;
							let grdLinTop = this.maskCtx.createLinearGradient(0, 0, blurX, blurY);
							grdLinTop.addColorStop(0, this.transColor);
							grdLinTop.addColorStop(1, this._color);
							let grdLinBtm = this.maskCtx.createLinearGradient(0, 0, blurX, -blurY);
							grdLinBtm.addColorStop(0, this.transColor);
							grdLinBtm.addColorStop(1, this._color);
							this.maskCtx.fillStyle = grdLinTop;
							this.maskCtx.fill();
							this.maskCtx.globalCompositeOperation = 'source-in';
							this.maskCtx.fillStyle = grdLinBtm;
							this.maskCtx.fill();
						}
						let grdRad = this.maskCtx.createRadialGradient(0, 0, 0, 0, 0, this._rad);
						grdRad.addColorStop(0, this._color);
						grdRad.addColorStop(1, this.transColor);
						this.maskCtx.fillStyle = grdRad;
					this.maskCtx.fill();
				}
			this.maskCtx.restore();
		}

		/** */
		public delete() {
			if (this.lightArea) {
				this.lightArea.sources.splice(this.lightArea.sources.indexOf(this), 1);
			}
			this.lightArea = null;
		}
	}

	/** Light blocking / shadow casting object */
	export class Block extends Bindable {
		public mask: {x: number, y: number}[];
		public clipRad: number;
		public lightArea: LightArea;
		public group: number = -1;
		public spriteMask: {
			draw: (ctx?: CanvasRenderingContext2D, block?: Block)=>void,
			mask: (ctx: CanvasRenderingContext2D)=>void,
			can?: HTMLCanvasElement,
			ctx?: CanvasRenderingContext2D
		} = {
			draw: null, 
			mask: null
		};
		private _ang: number = 0;
		private _transColor: string;

		/**
		 	Mask is the polygon which blocks light
			  - If mask is a polygon, it is given as an array of points which define the shape
			  - If mask is a rectangle, it can be given as an object of {width, height}
			  - If mask is a circle, it is given as a number of the circle's radius length
			spriteMask is an optional sprite shape which will be removed from the shadow in addition to the mask
			  - spriteMask allows a block to be made for a complex spirte shape but using a simple underlying polygon mask to improve render time
			blockLightInside, if true, blocks all light from a light source if it is within the bounds of the block
			translucent color is the colour light passing through the blocker will turn if it is not fully opaque
		*/
		constructor(
			public x: number,
			public y: number,
			mask: {x: number, y: number}[] | {width: number, height: number} | number,
			spriteMask?: (ctx: CanvasRenderingContext2D)=>void,
			public blockLightInside: boolean = false,
			translucentColor = '#000'
		) {
			super();
			if (!World.area.light) {
				console.error('Bunas Error - Light: Tried to add Block before calling Area.toggleLight().');
				return;
			}
			World.area.light.addBlock(this);
			this.lightArea = World.area.light;

			// Mask is the radius of a circle
			if (typeof mask === 'number') {
				this.clipRad = mask;
				this.bound = {
					obj: null,
					xOffset: 0,
					yOffset: 0,
					xCenter: mask,
					yCenter: mask
				};
			} else {
				// Mask is the width and height of a rectangle
				if (!Array.isArray(mask)) {
					let w = mask.width / 2,
							h = mask.height / 2;
					mask = [
						{x: this.x - w, y: this.y - h},
						{x: this.x + w, y: this.y - h},
						{x: this.x + w, y: this.y + h},
						{x: this.x - w, y: this.y + h}
					];
				}
				this.mask = mask;

				let
					minX = this.mask.reduce((min, p) => Math.min(min, p.x), this.mask[0].x),
					maxX = this.mask.reduce((max, p) => Math.max(max, p.x), this.mask[0].x),
					minY = this.mask.reduce((min, p) => Math.min(min, p.y), this.mask[0].y),
					maxY = this.mask.reduce((max, p) => Math.max(max, p.y), this.mask[0].y);
				
				this.clipRad = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2)) / 2;
				this.bound = {
					obj: null,
					xOffset: 0,
					yOffset: 0,
					xCenter: minX + ((maxX - minX) / 2),
					yCenter: minY + ((maxY - minY) / 2)
				};
			}

			this._transColor = translucentColor;

			this.spriteMask.mask = spriteMask;
			this.setSpriteMask();
		}

		private setSpriteMask() {
			if (this._transColor === '#000' && this.spriteMask.mask) {
				this.spriteMask.draw = this.spriteMask.mask;
			} else {
				if (!this.spriteMask.can) {
					this.spriteMask.can = document.createElement('canvas');
					this.spriteMask.ctx = this.spriteMask.can.getContext('2d');
				}
				let
					sCan = this.spriteMask.can,
					sCtx = this.spriteMask.ctx;
				sCan.width = sCan.height = this.clipRad * 2.5;
				sCtx.translate(this.clipRad / 4, this.clipRad / 4);
				sCtx.fillStyle = this._transColor;

				if (typeof this.spriteMask.mask === 'undefined') {
					this.spriteMask.draw = () => {
						sCtx.save();
							sCtx.clearRect(-this.clipRad / 4, -this.clipRad / 4, sCan.width, sCan.height);
							sCtx.translate(-this.x, -this.y);
							sCtx.beginPath();
								if (this.mask) {
									this.mask.forEach(p => sCtx.lineTo(p.x, p.y));
								} else {
									sCtx.arc(this.x, this.y, this.clipRad, 0, Math.PI * 2);
								}
								sCtx.closePath();
							sCtx.fill();
						sCtx.restore();
					}
				} else {
					this.spriteMask.draw = (opaque) => {
						if (opaque) {
							sCtx.fillStyle = '#000';
						}
						sCtx.save();
							sCtx.clearRect(-this.clipRad / 4, -this.clipRad / 4, sCan.width, sCan.height);
							sCtx.translate(-this.x, -this.y);
							this.spriteMask.mask(sCtx);
						sCtx.restore();
						sCtx.globalCompositeOperation = 'source-in';
							sCtx.fillRect(-this.clipRad / 4, -this.clipRad / 4, sCan.width, sCan.height);
						sCtx.globalCompositeOperation = 'source-over';
					}
				}
			}
		}

		get translucentColor(): string {
			return this._transColor;
		}
		set translucentColor(newCol: string) {
			if (newCol !== this.translucentColor) {
				this._transColor = newCol;
				this.setSpriteMask();
			}
		}

		get ang(): number {
			return this._ang;
		}
		set ang(newVal: number) {
			if (newVal !== this._ang) {
				if (this.mask) {
					let xDiff = Math.cos(newVal - this._ang),
							yDiff = Math.sin(newVal - this._ang);
					this.mask.forEach(p => {
						p.x -= this.bound.xCenter,
						p.y -= this.bound.yCenter;
						let newX = (p.x * xDiff) - (p.y * yDiff),
						newY = (p.x * yDiff) + (p.y * xDiff);
						p.x = newX + this.bound.xCenter;
						p.y = newY + this.bound.yCenter;
					});
				}
				this._ang = newVal;
			}
		}

		/** */
		public delete() {
			if (this.lightArea) {
				this.lightArea.blocks.splice(this.lightArea.blocks.indexOf(this), 1);
			}
			this.lightArea = null;
		}
	}
}
