import {
	Engine as Eng,
	Matter,
	Input,
	World,
	Physics as Phy,
	GameObject
} from './Bunas';

Eng.init();
Eng.load({}, start);

function start() {
	Matter.init(true);

	World.globalArea = new World.Area();
	World.globalArea.setLayout(
		{
			g: [Guy, 0, 0],
			p: [Person, 0, 0],
			b: [Block, 0, 0]
		},
		`
			bbbbbbbbb
			b       b
			b   g   b
			b       b
			b       b
			bbbbbbbbb
		`,
		36
	);
	World.globalArea.open();
}

class Person extends Matter.Circ {
	protected color: string = '#eee';
	public spriteAng: number = 0;
	
	constructor(x: number, y: number) {
		super(x, y, 20);
		this.body.frictionAir = 0.5;
	}

	public step(dT: number) {
		if (this.body.speed > 0.1) {
			this.spriteAng += (Phy.Vec.getAng(this.body.velocity) - this.spriteAng) / 3;
		}
	}

	public draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
			ctx.lineWidth = 2;
			ctx.strokeStyle = this.color;
			ctx.translate(this.x, this.y);
			ctx.rotate(this.spriteAng);
			ctx.beginPath();
				ctx.arc(0, 0, 20, 0, Math.PI * 2);
				ctx.lineTo(0, 0);
			ctx.stroke();
		ctx.restore();
	}
}

class Guy extends Person {
	private readonly speed: number = 0.02;
	private hold: number = -1;
	private invent = [
		'fist',
		'gun'
	];
	
	constructor(x: number, y: number) {
		super(x, y);
		this.color = '#77f'
	}

	public step(dT: number) {
		let keys = Input.key.pressed;
		let dx = 0,
			dy = 0;

		if (keys.indexOf('ArrowDown') !== -1) {
			dy = this.speed;
		} else if (keys.indexOf('ArrowUp') !== -1) {
			dy = -this.speed;
		}
		if (keys.indexOf('ArrowRight') !== -1) {
			dx = this.speed;
		} else if (keys.indexOf('ArrowLeft') !== -1) {
			dx = -this.speed;
		}
		if (dx || dy) {
			this.applyForce({ x: dx, y: dy });
			super.step(dT);
		}

		if (Input.key.down === 'Z') {
			this.attack();
		}

		let numKey = Input.key.down ? Input.key.down.match(/(digit|numpad)([0-9])/) : null;
		if (numKey) {
			let num = parseInt(numKey[0]);
			if (num < this.invent.length) {
				this.hold = num;
			}
		}
	}

	public attack() {
		if (this.invent[this.hold] === 'gun') {
			new Bullet(this.x, this.y, new Phy.Vec(1.5e-3, this.spriteAng, true));
		}
	}
}

class Block extends Matter.Rect {
	private lifePoints = 3;
	private readonly color = [
		'',
		'#888',
		'#aaa',
		'#eee'
	];

	constructor(x: number, y: number) {
		super(x, y, 36);
		this.body.isStatic = true;
	}
	
	public draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = this.color[this.lifePoints];
		ctx.fillRect(this.x - 18, this.y - 18, 36, 36);
	}
	
	public hit(position: Phy.Vec, force: Phy.Vec) {
		this.lifePoints--;
		if (this.lifePoints === 0) {
			[
				new BlockPiece(this.x - 9, this.y),
				new BlockPiece(this.x + 9, this.y),
				new BlockPiece(this.x - 9, this.y - 11),
				new BlockPiece(this.x + 9, this.y -	 11),
				new BlockPiece(this.x - 9, this.y + 11),
				new BlockPiece(this.x + 9, this.y + 11)
			].forEach(p =>
				p.applyForce(new Phy.Vec(
					Phy.Vec.getMag(force) * (Math.random() * 2),
					Math.atan2(p.y - position.y, p.x - position.x),
					true
				))
			);
			this.delete();
		}
	}
}

class BlockPiece extends Matter.Rect {
	constructor(x, y) {
		super(x, y, 18, 12);
		this.body.frictionAir = 0.2;
	}

	public draw(ctx: CanvasRenderingContext2D) {
		ctx.save();
			ctx.fillStyle = '#888';
			ctx.translate(this.x, this.y);
			ctx.rotate(this.ang);
			ctx.fillRect(-9, -6, 18, 12);
		ctx.restore();
	}
}

class Bullet extends GameObject {
	private lifeSpan: number;

	constructor(
		x: number,
		y: number,
		private velocity: Phy.Vec
	) {
		super(x, y);
		this.lifeSpan = setTimeout(() => this.area.removeObject(this), 2000);
	}

	public draw(ctx: CanvasRenderingContext2D) {
		ctx.fillStyle = '#aaa';
		ctx.beginPath();
			ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
		ctx.fill();
	}

	public step() {
		this.x += this.velocity.x;
		this.y += this.velocity.y;
		let p = new Phy.Vec(this.x, this.y);
		let c = Matter.Query.ray(this.area, p, p.add(this.velocity), 4)[0];
		if (c && c['hit']) {
			c['hit'](p, this.velocity);
			clearTimeout(this.lifeSpan);
			this.delete();
		}
	}
}