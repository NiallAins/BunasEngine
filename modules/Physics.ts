import { GameObject } from './Common';
import { Matter } from './Matter';

export module Physics {
	//
    // Public Variables
    //
    export const
        GRAV = 41.18, //pixels per frame^2
        TAU  = 6.2832;

	let globalCtx;
	
    //
    // Class: Vector
    //
	export class Vec {
		public x: number;
		public y: number;

		constructor(xm: number = 1, ya: number = 0, polar = false) {
			if (polar) {
				this.setMagAng(xm, ya);
			} else {
				this.x = xm;
				this.y = ya;
			}
		}

		public setAng(rad: number): void {
			let mag = this.getMag();
			this.x = Math.cos(rad) * mag;
			this.y = Math.sin(rad) * mag;
		}

		public setMagAng(mag: number, ang: number): void {
			this.x = Math.cos(ang) * mag;
			this.y = Math.sin(ang) * mag;
		}

		public getAng(): number {
			return Math.atan2(this.y, this.x);
		}

		public static getAng(v: Vec | Matter.Vector): number {
			return Math.atan2(v.y, v.x);
		}

		public getMag(): number {
			return Math.sqrt((this.x * this.x) + (this.y * this.y));
		}

		public static getMag(v: Vec | Matter.Vector): number {
			return Math.sqrt((v.x * v.x) + (v.y * v.y));
		}

		public getNorm(): Vec {
			let ang = this.getAng();
			return new Vec(Math.cos(ang), Math.sin(ang));
		}

		public add(v: Vec | Matter.Vector): Vec {
			return new Vec(this.x + v.x, this.y +  v.y);
		}

		public sub(v: Vec | Matter.Vector): Vec {
			return new Vec(this.x - v.x, this.y -v.y);
		}

		public scale(s: number): Vec {
			return new Vec(this.x * s, this.y * s);
		}

		public dot(v:Vec | Matter.Vector): number {
			return (this.x * v.x) + (this.y * v.y)
		}

		public dis(v:Vec | Matter.Vector): number {
			let a = (v.x - this.x) * (v.x - this.x);
			let b = (v.y - this.y) * (v.y - this.y);
			return Math.sqrt(a + b);
		}

		public angWith(v:Vec | Matter.Vector): number {
			return Math.atan2(v.y - this.y, v.x - this.x);
		}

		public toString(): String {
			let pos = '<' +  Math.round(this.x) + ', ' + Math.round(this.y) + '>';
			let mag = Math.round(this.getMag() * 100) /  100;
			let angR = Math.round(this.getAng() * 100) /  1000;
			let angD = Math.round(angR * (180 / Math.PI));

			return ('Pos: ' + pos + '\nMag: ' + mag + '\nAng: ' + angR + ' rads / ' + angD + '°');
		}

		public clone(): Vec {
			return new Vec(this.x, this.y);
		}
    }
    
    //
    // Class: Physics Context
    //
	export class Context {
        private objs: Particle[] = [];
        public  grav: Vec;

		constructor(
            public fric: number = 0,
            gravity: boolean | number | Vec = false
		) {
            if (gravity === true) {               
                this.grav = new Vec(0, GRAV);
            } else if (typeof gravity === 'number') {
                this.grav = new Vec(0, gravity);
            } else {
                this.grav = gravity as Vec;
            }
        }

		public addParticle(p: Particle): Particle {
            this.objs.push(p);
            p.phyCtx = this;
            return p;
		}
	}

    //
    // Class: Particle Object
    //
	export class Particle extends GameObject {
		public p: Vec;
		public v: Vec = new Vec(0, 0);
        public f: Vec = new Vec(0, 0);
        public phyCtx: Context;

		constructor(
			public x    : number,
			public y    : number,
            public rad  : number,
			public fric : number = 0,
			public el   : number = 0.5,
			public m    : number = rad / 2
		) {
            super(x, y, 0, rad);
            this.p = new Vec(x, y);
            
            if (!globalCtx) {
                globalCtx = new Context();
            }
            globalCtx.addParticle(this);
		}

		public step(delta) {
            if (this.phyCtx.grav) {
                this.applyForce(this.phyCtx.grav);
            }

            let friction: Vec = this.v.clone();
            friction.setAng((friction.getAng() + Math.PI) % (2 * Math.PI));
            friction = friction.scale(this.m * this.phyCtx.fric * this.fric);
            this.f = this.f.add(friction);

            this.f.scale(delta);

            this.v = this.v.add(this.f);
            if (this.v.getMag() > 0.1) {
                this.p = this.p.add(this.v);
                this.x = this.p.x;
                this.y = this.p.y;
            } else if (this.v.getMag() !== 0) {
                this.v = new Vec(0, 0);
            }

            this.f = new Vec(0, 0);

            this.collisionAndBounce();
        }
        
        public draw(ctx, dT) {
            ctx.beginPath();
                ctx.strokeStyle = 'dodgerblue';
                ctx.arc(this.p.x, this.p.y, this.rad - 2, 0, TAU);
            ctx.stroke();
        }

		public applyForce(F: Vec) {
			this.f = this.f.add(F);
        }

		private collisionAndBounce = function() {
			for (let i = 0, len = this.phyCtx.objs.length; i < len; i++) {
				if ((this.phyCtx.objs[i] != this) &&
					((this.p.dis(this.phyCtx.objs[i].p) - (this.rad + this.phyCtx.objs[i].rad) < 0))
				) {
					let delta: Vec = this.p.sub(this.phyCtx.objs[i].p);
					let d: number = delta.getMag();
					var mtd = delta.scale(((this.rad + this.phyCtx.objs[i].rad) - d) / d); 

					let im1: number = 1 / this.m; 
					let im2: number = 1 / this.phyCtx.objs[i].m;

					this.p = this.p.add(mtd.scale(im1 / (im1 + im2)));
					this.phyCtx.objs[i].p = this.phyCtx.objs[i].p.sub(mtd.scale(im2 / (im1 + im2)));

					let iv: Vec = this.v.sub(this.phyCtx.objs[i].v);
					mtd = mtd.getNorm();
					let vn: number = iv.dot(mtd);

					if (vn <= 0) {
						var imp = ((-1 * vn) * (1 + this.el)) / (im1 + im2);
						var impulse = mtd.scale(imp);

						this.v = this.v.add(impulse.scale(im1));
						this.phyCtx.objs[i].v = this.phyCtx.objs[i].v.sub(impulse.scale(im2));
					}
				}
			}
		}
    }
}