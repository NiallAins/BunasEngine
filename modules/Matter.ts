import { GameObject } from './Core';
import { World } from './World';

export module Matter {
    //
    // Types
    //
    export type Vector = {
        x: number;
        y: number;
        create?: (x: number, y: number)=> Vector;
        div?:    (v: Vector, s: number)=> Vector;
        mult?:   (v: Vector, s: number)=> Vector;
        clone?:  (a: Vector)=> Vector;
        add?:    (a: Vector, b: Vector)=> Vector;
        angle?:  (a: Vector, b: Vector)=> Vector;
        cross?:  (a: Vector, b: Vector)=> Vector;
        cross3?: (a: Vector, b: Vector, c: Vector)=> Vector;
        dot?:    (a: Vector, b: Vector)=> number;
        sub?:    (a: Vector, b: Vector)=> Vector;
        perp?:   (v: Vector, negate?: boolean)=> Vector;
        neg?:    (a: Vector)=> Vector;
        rotate?: (a: Vector, ang: number)=> Vector;
        normalise?:  (a: Vector)=> Vector;
        magnitude?:  (a: Vector)=> number;
        rotateAbout?:    (a: Vector, ang: number, p: number)=> Vector;
        magnitudeSquared?:   (a: Vector)=> number;
    };

    type Matter = {
        Engine: Engine,
        World: World,
        Body: Body,
        Bodies: Bodies,
        Query: Query,
        Vector: Vector
    };

    type Engine = {
        world: World;
        timing : {
            timeScale: number;
            timestamp: number;
        };
        clear:  (e: Engine)=> void;
        create: (opts?: object)=> Engine;
        merge:  (a: Engine, b: Engine)=> Engine;
        run: (a: Engine)=> void;
    };

    type World = {
        gravity: {
            scale: number;
            x: number;
            y: number;
        },
        add: (w: World, b: Body | Body[])=> void;
        remove: (w: World, b: Body)=> void;
    };

    export type Body = {
        friction: number;
        frictionAir: number;
        frictionStatic: number;
        isStatic: boolean;
        mass: number;
        restitution: number;
        slop: number;
        readonly id: number;
        readonly angle: number;
        readonly angularSpeed: number;
        readonly angularVelocity: number;
        readonly area: string;
        readonly axes: Vector[];
        readonly density: number;
        readonly force: Vector;
        readonly motion: number;
        readonly parent: Body;
        readonly parts: Body[];
        readonly position: Vector;
        readonly speed: number;
        readonly torque: number;
        readonly velocity: Vector;
        readonly vertices: number;
        create: (opts?: object)=> Body;
        rotate: (b: Body, ang: number, p?: Vector)=> void;
        scale: (b: Body, x: number, y: number, p?: Vector)=> void;
        set: (b: Body, s: string | {p: string, v: any}[], v?: any)=> void;
        setPosition: (b: Body, v: Vector)=> void;
        applyForce: (b: Body, p: Vector, f: Vector)=> void;
        translate: (b: Body, t: Vector)=> void;
    };

    type Bodies = {
        circle: (x: number, y: number, r: number, opts?: object, max?: number)=> Body;
        polygon: (x: number, y: number, sides: number, r: number, opts?: object)=> Body;
        rectangle: (x: number, y: number, w: number, h: number, opts?: object)=> Body;
        trapezoid: (x: number, y: number, w: number, h: number, slope: number, opts?: object)=> Body;
        fromVertices: (
            x: number,
            y: number,
            v?: Vector[],
            opts?: object,
            internal?: boolean,
            removeCollinear?: number,
            minArea?: number
        )=> Body;
    };

    type Query = {
        collides: (b: Body, bodies: Body[])=> Body[];
        point:  (bodies: Body[], point: Vector)=> Body[];
        ray: (bodies: Body[], start: Vector, end: Vector, width?: number)=> Object[];
        region: (bodies: Body[], bounds: Object, outside?: Boolean)=> Body[];
    };

    //
    // Private Variables
    //
    declare let MatterJs: Matter;
    let M: Matter = MatterJs,
        mainEng: Engine;
    
    //
    // Public Methods
    //
    export function init(topDown: boolean = false): void {
        mainEng = M.Engine.create();
        if (topDown) {
            mainEng.world.gravity.y = 0;
        }
        M.Engine.run(mainEng);
    };

    export let Query = {
        ray: function(
            area: World.Area,
            start: Vector,
            end: Vector,
            width: number = 1
        ) {
            let bodies: Body[] = area.objs.filter(b => b instanceof BodyBase);
            return bodies.filter(b => M.Query.ray([b], start, end, width));
        }
    };

    //
    //  Private Classes
    //
    class BodyBase extends GameObject {
        constructor(
            public body: Body
        ) {
            super(body.position.x, body.position.y);
            M.World.add(mainEng.world, body);
        }

        public die() {
            M.World.remove(mainEng.world, this.body);
            super.die();
        }

        public rotate(ang: number, p?: Vector): void {
            M.Body.rotate(this.body, ang, p);
        }

        public scale(x: number, y: number, p?: Vector): void {
            M.Body.scale(this.body, x, y, p);
        }

        public translate(v: Vector | number, y?: number): void {
            if (typeof v === 'number') {
                v = M.Vector.create(v, y);
            }
            M.Body.translate(this.body, v);
        }

        public applyForce(f: Vector, p?: Vector): void {
            M.Body.applyForce(this.body, p || this.body.position, f);
        }

        public setProp(p: string | {[p: string]: any}, v?: any) {
            if (typeof p === 'string') {
                M.Body.set(this.body, p, v);
            } else {
                for (let prop in p) {
                    M.Body.set(this.body, prop, p[prop]);
                }
            }
        }

        public collisions(bodies?: BodyBase[]): BodyBase[] {
            if (!bodies) {
                bodies = this.area.objs.filter(b => b instanceof BodyBase && b !== this);
            }
            return bodies.filter(b => M.Query.collides(this.body, [b.body]).length);
        }

        //
        // Shorthand getters/setters
        //
        get ang(): number { return this.body.angle; };

        get x(): number { return this.body.position.x };
        set x(v: number) { this.body ? M.Body.setPosition(this.body, {x: v, y: this.body.position.y}) : ''; };

        get y(): number { return this.body.position.y };
        set y(v: number) { this.body ? M.Body.setPosition(this.body, {x: this.body.position.x, y: v}) : ''; };
    };

    //
    //  Public Classes
    //
    export class Rect extends BodyBase {
        constructor(
            x: number,
            y: number,
            private w: number,
            private h?: number
        ) {
            super(M.Bodies.rectangle(x, y, w, h || w, { frictionAir : 0 }));
            if (typeof this.h === 'undefined') {
                this.h = this.w;
            }
        }

        public draw(ctx: CanvasRenderingContext2D) {
            ctx.translate(this.x - (this.w / 2), this.y - (this.h / 2));
            ctx.rotate(this.ang);
            ctx.fillRect(0, 0, this.w, this.h);
        }
    };

    export class Circ extends BodyBase {
        constructor(
            x: number, 
            y: number, 
            public r: number
        ) {
            super(M.Bodies.circle(x, y, r, { frictionAir : 0 }));
        }

        public draw(ctx: CanvasRenderingContext2D) {
            ctx.beginPath();
                ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();
        }
    };
}