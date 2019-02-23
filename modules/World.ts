import { Engine } from './Engine';
import { GameObject } from './Common';
import { Input } from './Input';

export module World {
    //
    // Class: Area
    //
    export class Area {
        public objs : GameObject[] = [];
        public views : View[] = [];
        private layout: {
            grid: string;
            objects: {[instance: string]: any[]};
            width: number;
            height: number;
            x: number,
            y: number
        };
        private active : boolean = false;

        constructor(
            public onInit     : ()=>void = ()=>{},
            public onOpen     : ()=>void = ()=>{},
            public onClose    : ()=>void = ()=>{},
            private persist   : boolean = false,
            view?             : View
        ) {
            if (!view) {
                this.addView(new View(0, 0, 1));
            }
        };

        private createLayout() {
            let grid = this.layout.grid.split('\n');
            let startCol = -1,
                startRow = -1;
            for (let i = 0; i < grid.length; i++) {
                let m = grid[i].match(/[a-z0-9]/i);
                if (m) {
                    if (startCol === -1) {
                        startCol = i;
                    }
                    if (m.index < startRow) {
                        startRow = m.index;
                    }
                }
            }
            grid.forEach((l, row) => {
                l.replace(
                    /[a-z0-9]/gi, 
                    (o, col) => {
                        try {
                            let obj = this.layout.objects[o];
                            let inst = new obj[0](...obj.slice(1));
                            inst.x = this.layout.x + ((col - startCol) * this.layout.width);
                            inst.y = this.layout.y + ((row - startRow) * this.layout.height);
                            this.addObject(inst);
                        } catch {
                            console.error(`Bunas Error: Cannot create object for character "${o}" in level layout`);
                        }
                        return o;
                    }
                );
            });
        }

        public setLayout(
            objs: {[instance: string]: any[]},
            grid: string,
            width: number = 64,
            height?: number,
            x: number = 0,
            y: number = 0
        ): void {
            this.layout = {
                grid: grid,
                objects: objs,
                width: width,
                height: height || width,
                x: x,
                y: y
            };
        }

        public open(): void {
            if (!this.active) {
                if (this.layout) {
                    this.createLayout();
                }
                this.onInit();
                this.views.forEach(v => v.reset());
                this.active = true;
            }
            areas.push(this);
            this.onOpen();
        };

        public close() {
            if (!this.persist) {
                this.active = false;
                this.objs = [];
            }
            areas.splice(1, areas.indexOf(this));
            this.onClose();
        };

        public addObject(o: GameObject, duplicate: Boolean = false): void {
            if (!duplicate && o.area) {
                o.area.removeObject(o);
            }
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
        };

        public removeObject(o: GameObject): void {
            this.objs.splice(this.objs.indexOf(o), 1);
        }

        public addView(v: View): number {
            this.views.push(v);
            return this.views.length;
        };

        public removeView(v: View): number {
            this.views.splice(1, this.views.indexOf(v));
            return this.views.length;
        };

        public togglePersistance(state?) {
            this.persist = state === undefined ? this.persist = !this.persist : state;
            if (!this.persist && !this.active) {
                this.objs = [];
            }
        };
    };

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
            public width  : number = Engine.cW,
            public height : number = Engine.cH,
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
        };

        public translate(dx : number, dy : number) {
            this.x += dx;
            this.y += dy;
        };

        public zoom(dz : number) {
            this.z *= dz;
        };

        public reset() {
            this.x      = this.init_x;
            this.y      = this.init_y;
            this.z      = this.init_z;
            this.width  = this.init_width;
            this.height = this.init_height;
            this.canX   = this.init_canX;
            this.canY   = this.init_canY;
            this.canZ   = this.init_canZ;
        };
    };

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
            if (activeObjs[i].startStep) {
                activeObjs[i].startStep(dT);
            }
        }
        for (let i = 0, len = activeObjs.length; i < len; i += 1) {
            activeObjs[i].step(dT);
        }
        for (let i = 0, len = activeObjs.length; i < len; i += 1) {
            if (activeObjs[i].endStep) {
                activeObjs[i].endStep(dT);
            }
        }
    };

    export function draw(ctx: CanvasRenderingContext2D, dT: number) {
        areas
            .reduce((t, a) => t.concat(a.views), [])
            .forEach(v => {
                let visibleObjs = activeObjs.filter(o =>
                    true
                    // o.clipRadius < 0 || (
                    //     o.x + o.clipRadius > v.x &&
                    //     o.x - o.clipRadius < v.x + v.width &&
                    //     o.y + o.clipRadius > v.y &&
                    //     o.y - o.clipRadius < v.y + v.height
                    // )
                );

                ctx.save();
                    ctx.translate(v.width, v.height);
                    ctx.rotate(v.ang);
                    ctx.translate(v.x - v.width, v.y - v.height);

                    for (let i = 0, len = visibleObjs.length; i < len; i += 1) {
                        if (activeObjs[i].startDraw) {
                            visibleObjs[i].startDraw(ctx, dT);
                        }
                    }
                    for (let i = 0, len = visibleObjs.length; i < len; i += 1) {
                        visibleObjs[i].draw(ctx, dT);
                    }
                    for (let i = 0, len = visibleObjs.length; i < len; i += 1) {
                        if (activeObjs[i].endDraw) {
                            visibleObjs[i].endDraw(ctx, dT);
                        }
                    }
                ctx.restore();
            });
    };
    
    export function goTo(a: Area, replace: boolean = true) {
        if (replace) {
            areas.forEach(act => act.close());
        }
        a.open();
    };
}