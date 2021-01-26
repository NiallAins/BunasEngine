import {
	Engine,
	World,
	Input,
	Debug,
	GameObject,
} from 'Bunas';
import generateBlockLayout from 'layout';
import CameraClass from 'Camera';
import Guy from 'Guy';
import { PinkFish, Eel } from 'Fish';
import HUDClass from 'HUD';
import MenuClass from 'Menu';


//
// Global Variables
//
export let
	guy: Guy,
	score: {money: number} = {money: 0},
	camera: CameraClass,
	HUD: HUDClass,
	menu: MenuClass,
	dingy: Dingy;

export const seaLevel: number = 500;


//
// Local Variables
//
let
	wave: World.background,
	wavePulse: number = 0;

//
// Global Methods
//

// Set up procedural number generator
const
	RNGSeed = 13,
	RNG = [0x80000000, 1103515245, 12345, RNGSeed];
export
	function rand(to: number = 1, from: number = 0, int: boolean = false): number {
  	RNG[3] = (RNG[1] * RNG[3] + RNG[2]) % RNG[0];
		const num = from + ((to - from) * RNG[3] / RNG[0]);
		return int ? Math.floor(num) : num;
	};


//
// Initalise Engine
//

Engine.preLoad({
	sprites: {
		guy_front: 		'assets/sprites/guy_front.png',
		guy_arm: 			'assets/sprites/guy_arm.png',
		fish_1: 			'assets/sprites/fish_1.png',
		fish_2: 			'assets/sprites/fish_2.png',
		fish_piranha: 'assets/sprites/fish_piranha.png',
		icon_stats:		'assets/sprites/icon_stats.png',
		dingy:				'assets/sprites/dingy.png',
		shop_fins1:		'assets/sprites/fins1.png',
		shop_fins2:		'assets/sprites/fins1.png',
		shop_fins3:		'assets/sprites/fins1.png',
		shop_tank1:		'assets/sprites/tank1.png',
		shop_tank2:		'assets/sprites/tank1.png',
		shop_tank3:		'assets/sprites/tank1.png',
		shop_torch1:	'assets/sprites/fins1.png',
		shop_torch2:	'assets/sprites/fins1.png',
		shop_torch3:	'assets/sprites/fins1.png',
	},
	bgs: {
		bgTile: 		'assets/sprites/bgTile.png',
		bgWave: 		'assets/sprites/bgWave.png',
		fgTile: 		'assets/sprites/fgTile.png',
		block_bg:		'assets/sprites/block_bg.png',
		block_fg:		'assets/sprites/block_fg.png',
		caveBg:			'assets/sprites/caveBg.png',
		gemsTile:		'assets/sprites/gemsTile.png',
		pageBg:			'assets/sprites/pageBg.png',
		page0:			'assets/sprites/page0.png',
		page1:			'assets/sprites/page1.png',
		page2:			'assets/sprites/page2.png',
		page3:			'assets/sprites/page3.png',
		page4:			'assets/sprites/page4.png',
	},
})

// Fit canvas to screen to a max width of 1920px;
let
	canWidth = window.innerWidth,
	canHeight = window.innerHeight;
if (canWidth > 1920) {
	canWidth = 1920;
	canHeight = Math.ceil(canHeight * (canWidth / window.innerWidth));
}
Engine.init(start, null, canWidth, canHeight);


//
// Game entry point
//

function start(): void {
	// Graphic Settings
	Input.setCursor('none');
	World.area.addBackground('#6C8AA4');
	World.area.addBackground('bgTile', false, 0, {x: 0.7, y: 1}, 0, {x: true, y: false});
	wave = World.area.addBackground('bgWave', false, 1, 1, {x: 0, y: seaLevel - 17}, {x: true, y: false});
	dingy = new Dingy();
	World.area.toggleLight();

	// Level layout
	const
		gridWidth = 60,
		gridHeight = 100,
		gridCellWidth = 96;
	generateBlockLayout(gridWidth, gridHeight, gridCellWidth, Math.ceil(seaLevel / gridCellWidth) + 2);
	guy = new Guy(0, 0);

	for (let i = 0; i < 20; i++) {
		// new Piranha(900 + (Math.random() * 400), 2100 + (Math.random() * 500));
	}
	for (let i = 0; i < 10; i++) {
		new PinkFish(1000 + (Math.random() * 400), 5600 + (Math.random() * 500));
	}
  new Eel(600, 600, 140);

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
	menu = new MenuClass();

	//menu.openMenu();
	Debug.toggle();
	Debug.logObject(guy, true);
}


//
// Lifecycle Hooks
//

Engine.postStep = function(dt: number) {
	// Animate wave
	wavePulse += 0.01 * dt;
	wavePulse %= Math.PI * 2;
	wave.offset.x = -800 - (Math.sin(wavePulse) * 800);

	camera.step(dt);
	HUD.step(dt);
	menu.step();
}

Engine.preDraw = function(ctx: CanvasRenderingContext2D) {
	// Set BG Darkness
	let depth = Math.max(Math.min(1, (guy.y - seaLevel) / 4000), 0);
	World.area.light.bgLight = 'rgba(25, 60, 100, ' + (1 - Math.pow(1 - depth, 3)) + ')';
}

Engine.postDraw = function(ctx: CanvasRenderingContext2D, dt: number) {
	camera.draw(ctx);
	HUD.draw(ctx);
}

class Dingy extends GameObject {
	constructor() {
		super(400, seaLevel - 34, 0);
		this.sprite = Engine.getSprite('dingy');
		this.colBox.width = this.sprite.width;
		this.colBox.height = this.sprite.height;
	}

	draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
			ctx.imageSmoothingEnabled = true;
			ctx.translate(this.x, this.y + (Math.cos(wavePulse * 3) * 5));
			ctx.rotate(Math.sin(wavePulse * 3) / 15);
			ctx.drawImage(this.sprite as HTMLImageElement, 0, 0);
		ctx.restore();
	}
}