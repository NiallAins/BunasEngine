import { Engine } from './Engine';
import { World } from './World';
import { Input } from './Input';
import { GameObject } from './Common';

/** Provides helper functions to debug application */
export module Debug {
	//
	// Private Variables
	//
	let
		show			: boolean = false,
		dTCounter	:	number = +new Date(),
		logs      : string[] = [],
		permLog   : string[] = [],
		clipBoxes	: GameObject[] = [],
		colBoxes	: GameObject[] = [],
		positions : GameObject[] = [],
		container : HTMLDivElement = document.createElement('div'),
		output    : HTMLPreElement = document.createElement('pre'),
		color			: string[] = ['dodgerblue', 'tomato'];
	
	container.setAttribute('style', `
		position: fixed;
		height: 100vh;
		padding-top: 20px; 
		top: 0px;
		left: 20px;
		width: 60vw;
		color: ${color[0]};
		text-shadow: 0 0 2px #000;
		pointer-events: none;
	`);
	container.appendChild(output);

	//
	// Public Variables
	//
	export let
		/** Debugger output font size */
		fontSize        : number = 14,
		/** Toggle default proporties displayed in debugger */
		options  : {[option: string] : boolean} = {
			dt: true,
			view: true,
			input : true,
			area: true,
			colBox: false,
			clipBox: false,
			positions: false
		};

	//
	// Public Methods
	//
	/** Turn debugger on/off */
	export function toggle(state?): void {
		if (state !== show) {
			show = state === undefined ? !show : state;
			show ? document.body.appendChild(container) : document.body.removeChild(container);
		}
	};

	/**
		Log a variable to the debugger.
		Objects will be stringifyed.
		If logging a variable on every step, set persist = false to continually clear previous output.
	*/
	export function log(data: any, persist = false): void {
		let entry = JSON.stringify(data, null, '\t');
		persist ? permLog.push(entry) : logs.push(entry);
	};

	/** Clear debugger output */
	export function clear(): void {
		permLog = [];
	};

	/** Draw given objects clip boxes on next draw  */
	export function drawClipBox(...objs: GameObject[]) {
		clipBoxes = [...this.clipBoxes, objs];
	}

	/** Draw given objects collision boxes on next draw  */
	export function drawColBox(...objs: GameObject[]) {
		colBoxes = [...this.colBoxes, objs];
	}

	/** Draw given objects collision boxes on next draw  */
	export function drawPosition(...objs: GameObject[]) {
		positions = [...this.positions, objs];
	}

	/** Sets colors of debug text */
	export function setColor(primaryColor: string, secondaryColor?: string) {
		color[0] = primaryColor;
		if (secondaryColor) {
			color[1] = secondaryColor;
		}
		this.container.style.color = color[0];
	}

	export function draw(ctx: CanvasRenderingContext2D, dT: number): void {
		ctx.fillStyle = color[0];
		ctx.strokeStyle = color[0];
		ctx.lineWidth = 1;

		// Collision boxes
		ctx.save();
			ctx.strokeStyle = color[options.clipBox || clipBoxes.length ? 1 : 0];
			if (options.colBox) {
				World.currentAreas.forEach(a => {
					ctx.save();
						ctx.translate(-a.view.x, -a.view.y);
						a.objs.forEach(o => {
							if (o.inView) {
								ctx.strokeRect(
									o.x + o.colBox.x,
									o.y + o.colBox.y,
									o.colBox.width,
									o.colBox.height
								);
							}
						});
					ctx.restore();
				});
			} else if (colBoxes.length) {
				colBoxes.forEach(o => {
					if (o.inView) {
						ctx.save();
							ctx.translate(-o.area.view.x, -o.area.view.y);
							ctx.strokeRect(
								o.x + o.colBox.x,
								o.y + o.colBox.y,
								o.colBox.width,
								o.colBox.height
							);
						ctx.restore();
					}
				});
			}
		ctx.restore();

		// Clip boxes
		if (options.clipBox) {
			World.currentAreas.forEach(a => {
				ctx.save();
					ctx.translate(-a.view.x, -a.view.y);
					a.objs.forEach(o => {
						if (o.inView) {
							ctx.strokeRect(
								o.x + o.clipBox.x,
								o.y + o.clipBox.y,
								o.clipBox.width,
								o.clipBox.height
							);
						}
					});
				ctx.restore();
			});
		} else if (clipBoxes.length) {
			clipBoxes.forEach(o => {
				if (o.inView) {
					ctx.save();
						ctx.translate(-o.area.view.x, -o.area.view.y);
						ctx.strokeRect(
							o.x + o.clipBox.x,
							o.y + o.clipBox.y,
							o.clipBox.width,
							o.clipBox.height
						);
					ctx.restore();
				}
			});
		}

		// Positions
		if (options.positions) {
			World.currentAreas.forEach(a => {
				ctx.save();
					ctx.translate(-a.view.x, -a.view.y);
					a.objs.forEach(o => {
						if (o.inView) {
							ctx.fillRect(o.x - 2, o.y - 2, 4, 4);
						}
					});
				ctx.restore();
			});
		} else if (positions.length) {
			positions.forEach(o => {
				if (o.inView) {
					ctx.save();
						ctx.translate(-o.area.view.x, -o.area.view.y);
						ctx.fillRect(o.x - 2, o.y - 2, 4, 4);
					ctx.restore();
				}
			});
		}

		if (+new Date() - dTCounter < 250) {
			logs = [];
			return;
		}
		dTCounter = +new Date();

		output.setAttribute('style', `
			font-size: ${fontSize};
			color: ${color};
			max-height: 100%;
			overflow: hidden;
			white-space: pre-wrap;
		`);

		output.innerHTML = '';
		if (options.dt) {
			output.innerHTML +=
				`dT    : ${dT.toFixed(3)}<br/>`;
		}
		if (options.area) {
			output.innerHTML +=
				`Area  : ${World.currentAreas.map(a => a.name).join(',')}<br/>`;
		}
		if (options.view) {
			output.innerHTML +=
				`View  : <br/>` +
				`    x: ${World.area.view.x.toFixed(2)},<br/>` +
				`    y: ${World.area.view.y.toFixed(2)},<br/>` +
				`    z: ${World.area.view.z.toFixed(2)}<br/>`;
		}
		if (options.input) {
			output.innerHTML +=
				`Input : ${getInputData()}<br/><br/>`;
		}
		output.innerHTML += permLog.concat(logs).join('<br/>');

		output.scrollTop = output.scrollHeight;
		logs = [];
		clipBoxes = [];
		colBoxes = [];
	};

	//
	// Private Methods
	//
	function getInputData(): string {
		var str = [];
		str.push(`<br/>    keyPressed = [${Input.key.pressed.join(', ')}]`);
		str.push(`    mouseState =`);
		str.push(`        x: ${Input.mouse.x}`);
		str.push(`        y: ${Input.mouse.y}`);
		if (Input.mouse.left.pressed)  str.push(`        left.pressed`);
		if (Input.mouse.left.dragging) str.push(`        left.dragging ${Input.mouse.left.drag ? ' left.drag' : ''}`);
		if (Input.mouse.right.pressed)  str.push(`        right.pressed`);
		if (Input.mouse.right.dragging) str.push(`        right.dragging ${Input.mouse.right.drag ? 'right.drag' : ''}`);
		return str.join('<br/>');
	};
}