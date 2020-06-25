import {
	Engine,
	World,
	Input,
	Debug,
} from 'Bunas';
import generateBlockLayout from 'layout';
import CameraClass from 'Camera';
import Guy from 'Guy';
import Fish from 'Fish';
import Block from 'Block';
import HUDClass from 'HUD';


//
// Global Variables
//
export let
	levelBlocks: Block[] = [],
	guy: Guy,
	score: {money: number} = {money: 0},
	camera: CameraClass,
	HUD: HUDClass;

export const
	seaLevel: number = 500,
	gems: {name: string, value: number, color: string, pureColor: string}[] = [
		{ name: 'Aquamarine', color: '#19A', pureColor: '#4CD',  value: 1 },
		{ name: 'Rhodonite', 	color: '#C15', pureColor: '#F48',  value: 3 },
		{ name: 'Amethyst', 	color: '#A0C', pureColor: '#D0F',  value: 8 },
		{ name: 'Lapis', 			color: '#00C', pureColor: '#31F',  value: 15 },
		{ name: 'Amber', 			color: '#CA2', pureColor: '#FC5',  value: 24 },
		{ name: 'Jade', 			color: '#2A1', pureColor: '#5D4',  value: 35 },
		{ name: 'Obsidian', 	color: '#405', pureColor: '#738',  value: 50 }
	];


//
// Local Variables
//
let
	wave: World.background,
	wavePulse: number = 0;


//
// Global Methods
//

// Set up procedural number generator with RNG[3] as seed
let RNG = [0x80000000, 1103515245, 12345, 29];
export
	function rand(to: number = 1, from: number = 0, int: boolean = false) {
  	RNG[3] = (RNG[1] * RNG[3] + RNG[2]) % RNG[0];
		let num = from + ((to - from) * RNG[3] / RNG[0]);
		return int ? Math.floor(num) : num;
	};


//
// Initalise Engine
//

Engine.preLoad({
	sprites: {
		guy_front: 		'assets/sprites/guy_front.png',
		fish_1: 			'assets/sprites/fish_1.png',
		icon_battery: 'assets/sprites/icon_battery.png'
	},
	bgs: {
		bgTile: 		'assets/sprites/bgTile.png',
		bgWave: 		'assets/sprites/bgWave.png',
		fgTile: 		'assets/sprites/fgTile.png',
		block_bg:		'assets/sprites/block_bg.png',
		block_fg:		'assets/sprites/block_fg.png',
		caveBg:			'assets/sprites/caveBg.png',
		gemsTile:		'assets/sprites/gemsTile.png'
	},
});
Engine.init(start);


//
// Game entry point
//

function start(): void {
	// Graphic Settings
	Input.setCursor('none');
	World.area.addBackground('#6C8AA4');
	World.area.addBackground('bgTile', false, 0, {x: 0.7, y: 1}, 0, {x: true, y: false});
	wave = World.area.addBackground('bgWave', false, 1, 1, {x: 0, y: seaLevel - 17}, {x: true, y: false});
	World.area.toggleLight();
	World.area.view.z = 1;
	// Debug.toggle();

	// Level layout
	let gridWidth = 60,
			gridHeight = 100,
			gridCellWidth = 96;
	generateBlockLayout(gridWidth, gridHeight, gridCellWidth, Math.ceil(seaLevel / gridCellWidth) + 2);
	guy = new Guy(500, 600);
	for (let i = 0; i < 100; i++) {
		new Fish(1900 + (Math.random() * 500), 2000 + (Math.random() * 500));
	}

	// Views
	World.area.view.track(
		guy,
		[
			(Engine.cH / 2) - 28,
			(Engine.cW / 2) + 28,
			(Engine.cH / 2) + 28,
			(Engine.cW / 2) - 28
		],
		0.2,
		[0, 0, gridWidth * gridCellWidth, gridHeight * gridCellWidth]
	);

	camera = new CameraClass(World.area.view);
	HUD = new HUDClass();
}


//
// Lifecycle Hooks
//

Engine.postStep = function() {
	// Animate wave
	wavePulse += 0.01;
	wavePulse %= Math.PI * 2;
	wave.offset.x = -800 - (Math.sin(wavePulse) * 800);
	camera.step();
	HUD.step();
}

Engine.preDraw = function(ctx: CanvasRenderingContext2D) {
	// Set BG Darkness
	let depth = Math.max(Math.min(1, (guy.y - seaLevel) / 4000), 0);
	World.area.light.bgLight = 'rgba(25, 60, 100, ' + (1 - Math.pow(1 - depth, 3)) + ')';
}

Engine.postDraw = function(ctx: CanvasRenderingContext2D) {
	camera.draw(ctx);
	HUD.draw(ctx);
}
