import { Engine } from './Engine';
import { World } from './World';
import { Input } from './Input';

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
		container : HTMLDivElement = document.createElement('div'),
		output    : HTMLPreElement = document.createElement('pre');
	
	container.setAttribute('style', `
		position: fixed;
		height: 100vh;
		padding-top: 20px; 
		top: 0px;
		left: 20px;
		width: 60vw;
		pointer-events: none;
		text-shadow: 0 0 2px #000;
	`);
	container.appendChild(output);

	//
	// Public Variables
	//
	export let
		/** Debugger output font size */
		fontSize        : number = 14,
		/** Degugger output font color */
		color           : string = 'dodgerblue',
		/** Toggle default proporties displayed in debugger */
		defaultOptions  : {[option: string] : boolean} = {
			dt: true,
			view: true,
			input : true
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

	export function draw(ctx: CanvasRenderingContext2D, dT: number): void {
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
		if (defaultOptions.dt) {
			output.innerHTML +=
				`dT    : ${dT.toFixed(3)}<br/>`;
		}
		if (defaultOptions.view) {
			output.innerHTML +=
				`View  :<br/>` +
				`    x: ${World.area.view.x.toFixed(2)},<br/>` +
				`    y: ${World.area.view.y.toFixed(2)},<br/>` +
				`    z: ${World.area.view.z.toFixed(2)}<br/>`;
		}
		if (defaultOptions.input) {
			output.innerHTML +=
				`Input : ${getInputData()}<br/><br/>`;
		}
		output.innerHTML += permLog.concat(logs).join('<br/>');

		output.scrollTop = output.scrollHeight;
		logs = [];
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
		if (Input.mouse.left.pressed)  str.push(`    left.pressed`);
		if (Input.mouse.left.dragging) str.push(`    left.dragging ${Input.mouse.left.drag ? ' left.drag' : ''}`);
		if (Input.mouse.left.dragPts.length) {
			str.push(`        left.dragPts: [<br/>${Input.mouse.left.dragPts.reduce((str, p) =>
				str = (str.length > 200 ? '...' + str.substr(-200) : str) + '(' + p.x + ', ' + p.y + ')', '')}]`);
		}
		if (Input.mouse.right.pressed)  str.push(`    right.pressed`);
		if (Input.mouse.right.dragging) str.push(`    right.dragging ${Input.mouse.right.drag ? 'right.drag' : ''}`);
		if (Input.mouse.right.dragPts.length) {
			str.push(`        right.dragPts: [<br/>${Input.mouse.right.dragPts.reduce((str, p) =>
				str = (str.length > 200 ? '...' + str.substr(-200) : str) + '(' + p.x + ', ' + p.y + ')', '')}]`);
		}
		return str.join('<br/>');
	};
	
}