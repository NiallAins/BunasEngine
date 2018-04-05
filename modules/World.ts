import { Engine as Eng } from './Engine';
import { GameObject } from './Core';

export module World {
    //
    // Class: Area
    //
    export class Area {
        public objs  : GameObject[] = [];
        public views : View[] = [];
        private active : boolean = false;

        constructor(
            public width      : number = -1, 
            public height     : number = -1,
            public initState : ()=>void = ()=>{},
            public onOpen     : ()=>void = ()=>{},
            public onClose    : ()=>void = ()=>{},
            private persist   : boolean = false,
            view?             : View
        ) {
            if (!view) {
                this.addView(new View(0, 0, 1));
            }
        }

        public open() {
            if (!this.active) {
                this.initState();
                this.views.forEach(v => v.reset());
                this.active = true;
            }
            areas.push(this);
            this.onOpen();
        }

        public close() {
            if (!this.persist) {
                this.active = false;
                this.objs = [];
            }
            areas.splice(1, areas.indexOf(this))
            this.onClose();
        }

        public addObject(o: GameObject): void {
            if (!o.z) {
                o.z = 0;
            }
            for(let i = 0, len = this.objs.length; i < len; i++) {
                if (o.z > this.objs[i].z) {
                    this.objs.splice(i, 0, o);
                    return;
                }
            }
            this.objs.push(o);
            o.area = this;
        }

        public addView(v: View): number {
            this.views.push(v);
            return this.views.length;
        }

        public removeView(v: View): number {
            this.views.splice(1, this.views.indexOf(v));
            return this.views.length;
        }

        public togglePersistance(state?) {
            this.persist = state === undefined ? this.persist = !this.persist : state;
            if (!this.persist && !this.active) {
                this.objs = [];
            }
        }
    }

    //
    // Class: View Port
    //
    export class View {
        private init_x       : number;
        private init_y       : number;
        private init_z       : number;
        private init_width?  : number;
        private init_height? : number;
        private init_canX    : number;
        private init_canY    : number;
        private init_canZ    : number;
        
        constructor(
            public x      : number = 0,
            public y      : number = 0,
            public z      : number = 1,
            public ang    : number = 0, 
            public width  : number = Eng.cW,
            public height : number = Eng.cH,
            public canX   : number = 0,
            public canY   : number = 0,
            public canZ   : number = 0
        ) {
            this.init_x       = x;
            this.init_y       = y;
            this.init_z       = z;
            this.init_width   = width;
            this.init_height  = height;
            this.init_canX    = canX;
            this.init_canY    = canY;
            this.init_canZ    = canZ;
        }

        public translate(dx : number, dy : number) {
            this.x += dx;
            this.y += dy;
        }

        public zoom(dz : number) {
            this.z *= dz;
        }

        public reset() {
            this.x      = this.init_x;
            this.y      = this.init_y;
            this.z      = this.init_z;
            this.width  = this.init_width;
            this.height = this.init_height;
            this.canX   = this.init_canX;
            this.canY   = this.init_canY;
            this.canZ   = this.init_canZ;
        }
    }

    //
    // Public Variables
    //
    export let globalArea: Area;

    //
    // Private Variables
    //
    let areas       : Area[] = [],
        activeObjs  : GameObject[];

    //
    // Public Methods
    //
    export function step(dT: number) {
        activeObjs = areas.reduce((t, a) => t.concat(a.objs), []);

        for (let i = 0, len = activeObjs.length; i < len; i += 1) {
            activeObjs[i].startStep(dT);
        }
        for (let i = 0, len = activeObjs.length; i < len; i += 1) {
            activeObjs[i].step(dT);
        }
        for (let i = 0, len = activeObjs.length; i < len; i += 1) {
            activeObjs[i].endStep(dT);
        }
    }

    export function draw(ctx: CanvasRenderingContext2D, dT: number) {
        areas
            .reduce((t, a) => t.concat(a.views), [])
            .forEach(v => {
                let visibleObjs = activeObjs.filter(o =>
                    o.clipRadius < 0 || (
                        o.x + o.clipRadius > v.x &&
                        o.x - o.clipRadius < v.x + v.width &&
                        o.y + o.clipRadius > v.y &&
                        o.y - o.clipRadius < v.y + v.height
                    )
                );

                ctx.save();
                    ctx.translate(v.width, v.height);
                    ctx.rotate(v.ang);
                    ctx.translate(v.x - v.width, v.y - v.height);

                    for (let i = 0, len = visibleObjs.length; i < len; i += 1) {
                        visibleObjs[i].startDraw(ctx, dT);
                    }
                    for (let i = 0, len = visibleObjs.length; i < len; i += 1) {
                        visibleObjs[i].draw(ctx, dT);
                    }
                    for (let i = 0, len = visibleObjs.length; i < len; i += 1) {
                        visibleObjs[i].endDraw(ctx, dT);
                    }
                ctx.restore();
            });
    }
    
    export function goTo(a: Area, replace: boolean= true) {
        if (replace) {
            areas.forEach(act => act.close());
        }
        a.open();
    }
}