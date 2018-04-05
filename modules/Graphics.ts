import { Engine as Eng } from './Engine';

export module Graphics {
    //
    // Types / Interfaces
    //
    export type keyframe     = number | number[] | number[][] | (number | string)[][];
    export type keyframeSet  = { [property: string] : keyframe }
    export type drawFunction = (frame: { [property: string] : number }, ctx: CanvasRenderingContext2D)=>void
    export type spriteState  = {
        duration   : number,
        elements   : { [element: string] : keyframeSet }
        fr?        : number,
        iteration? : number
        easeIn?    : string,
        easeOut?   : string,
        onEnd?     : ()=>void
    }

    export interface ISprite {
        duration: number;
        draw: (x: number, y: number, ang: number, ctx: CanvasRenderingContext2D)=>void;
        toggle: (play: boolean, setFrame: number)=>void;
        reverse: ()=>void;
        onEnd: ()=>void;
    };

    //
    // Class: Bitmap Sprite
    //
    export class Sprite implements ISprite {
        public width      : number;
        public height     : number;
        public duration   : number;
        public onEnd      : ()=>void = ()=>{};
        private frCurrent : number = 0;

        constructor(
            private sprite  : HTMLImageElement,
            private frTotal : number,
            private frRate  : number,
            private ctx     : CanvasRenderingContext2D
        ) {
            this.width  = sprite.width / frTotal;
            this.height = sprite.height;
            this.frRate = 60;
        }
        
        public draw(canX, canY, delta = 1): void {
            this.ctx.drawImage(
                this.sprite,
                Math.floor(this.frCurrent) * this.width, 0,
                this.width, this.height,
                canX, canY,
                this.width, this.height
            );
            if (this.frRate !== 0) {
                if (this.frRate > 1) {
                    this.frCurrent += (this.frRate / 33) * delta;
                    if (this.frCurrent >= this.frTotal) {
                        this.frCurrent = 0;
                    }
                } else {
                    this.frCurrent -= (this.frRate / 30) * delta;
                    if (this.frCurrent <= 0) {
                        this.frCurrent = this.frTotal - 1;
                    }
                }
            }
        }

        public toggle() {

        }

        public reverse() {

        }
    }

    //
    // Class: Vector Sprite
    //
    export class VectorSprite implements ISprite {
        public fr        : number = 0;
        public onEnd     : () => void = () => {};
        private isPaused : boolean = false;

        constructor(
            public drawFunction: drawFunction,
            public keyframeSet: keyframeSet = null,
            public duration: number = 30
        ) {
        }

        public draw(x: number, y: number, ang: number, ctx: CanvasRenderingContext2D) {
            ctx.save();
                ctx.translate(x, y);
                ctx.rotate(ang);
                this.drawFunction(this.keyframeSet ? tween(this.keyframeSet, this.fr) : null, ctx);
            ctx.restore();

            if (this.isPaused) {
                return;
            }

            this.fr += (1 / this.duration) * Eng.getDelta();
            
            if (this.fr > 1 || this.fr < 0) {
                this.fr = (this.fr + 1) % 1;
                this.onEnd();
            }
        }

        public toggle(play: boolean = null, setFrame?: number) {
            this.isPaused = play === null ? !this.isPaused : !play
            if (setFrame || setFrame === 0) {
                this.fr = setFrame;
            }
        }

        public reverse() {
            this.duration *= -1;
        }
    }

    //
    // Class: Dynamic Vector Sprite
    //
    export class DynamicVectorSprite implements ISprite {
        public fr        : number = 0;
        public duration  : number;
        public onEnd     : ()=>void = ()=>{};
        public currentState  : string;
        public currentAction : string;
        private state    : spriteState;
        private action   : spriteState = null;
        private isPaused : boolean = false;

        constructor(
            public elements : { [element: string] : drawFunction },
            public states   : { [state: string]   : spriteState  },
            public actions  : { [action: string]  : spriteState  }
        ) {
            for (let s in states) {
                states[s].onEnd = states[s].onEnd || (() => {});
            }
            for (let a in actions) {
                actions[a].fr = 0;
                actions[a].onEnd = actions[a].onEnd || (() => {});
            }
            this.currentState = Object.keys(states)[0];
            this.state = states[this.currentState];
            this.duration = this.state.duration;
        }

        public draw(x: number, y: number, ang: number, ctx: CanvasRenderingContext2D) {
            ctx.save();
                ctx.translate(x, y);
                ctx.rotate(ang);
                for (let el in this.elements) {
                    let props;
                    if (this.action && this.action.elements[el]) {
                        props = tween(this.action.elements[el], this.action.fr);
                    }
                    if (this.state.elements[el]) {   
                        let stateProps = tween(this.state.elements[el], this.fr);
                        if (!props) {
                            props = stateProps;
                        } else {
                            for (let p in stateProps) {
                                if (!props[p]) {
                                    props[p] = stateProps[p];
                                }
                            }
                        }
                    }
                    if (props) {
                        this.elements[el](props, ctx); 
                    }
                }
            ctx.restore();

            if (!this.isPaused) {
                if (this.duration) {
                    this.fr += (1 / this.duration) * Eng.getDelta();
                    if (this.fr > 1 || this.fr < 0) {
                        this.fr = (this.fr + 1) % 1;
                        this.state.onEnd();
                        this.onEnd();
                    }
                }
                if (this.action) {
                    this.action.fr += (1 / this.action.duration) * Eng.getDelta();
                    if (this.action.fr > 1 || this.action.fr < 0) {
                        if (this.action.iteration > 1) {
                            this.action.iteration--;
                        } else {
                            if (this.action.iteration === -1) {
                                this.action.onEnd();
                            } else {
                                this.action.onEnd();
                                this.action = null;
                                this.currentAction = null;
                            }
                        }
                    }
                }
            }
        }

        public changeState(state: string, setFrame: number = -1, transition: number = 5, ease: string = 'sine'): void {
            if (this.currentState === state && setFrame === -1) {
                return;
            }
            this.currentState = state;

            if (transition) {
                let nextState = this.states[state],
                    endFrame;
                if (nextState.duration) {
                    endFrame = setFrame === -1 ? (1 + this.fr + (transition / nextState.duration)) % 1 : setFrame;
                } else {
                    endFrame = 0;
                }
                let transState = {
                    duration : transition,
                    onEnd    : this.setState.bind(this, state, endFrame),
                    elements : {}
                };
                for (let el in nextState.elements) {
                    transState.elements[el] = {};
                    let startValues = this.state.elements[el] ? tween(this.state.elements[el], this.fr) : false,
                        endValues   = tween(nextState.elements[el], endFrame);
                    for (let param in nextState.elements[el]) {
                        if (!startValues || startValues[param] === undefined) {
                            transState.elements[el][param] = endValues[param];
                        } else {
                            transState.elements[el][param] = [[0, startValues[param], ease], [1, endValues[param], ease]];
                        }
                    }
                }
                this.state = transState;
                this.duration = transition;
                this.fr = 0;
            } else {
                this.setState(state, setFrame);
            }
        }

        private setState(state: string, setFrame = -1) {
            this.state = this.states[state];
            if (setFrame !== -1) {
                this.fr = setFrame;
            }
            this.duration = this.state.duration;
        }

        public trigger(action: string, iterations: number = 1, transition: number = 10, ease: string = 'sine'): void {
            if (this.currentAction === action) {
                return;
            }
            this.currentAction = action;

            if (transition) {
                let nextAction = this.actions[action];
                this.action = {
                    fr        : 0,
                    iteration : -1,
                    duration  : transition,
                    onEnd     : this.setAction.bind(this, action, iterations),
                    elements  : {}
                };
                for (let el in nextAction.elements) {
                    this.action.elements[el] = {};
                    let startValues = this.state.elements[el] ? tween(this.state.elements[el], this.fr) : false,
                        endValues   = tween(nextAction.elements[el], 0);
                    for (let param in nextAction.elements[el]) {
                        if (!startValues || startValues[param] === undefined) {
                            this.action.elements[el][param] = endValues[param];
                        } else {
                            this.action.elements[el][param] = [[0, startValues[param], ease], [1, endValues[param], ease]];
                        }
                    }
                }
            } else {
                this.setAction(action, iterations)
            }
        }

        private setAction(action, iterations) {
            this.action = this.actions[action];
            this.action.iteration = iterations;
            this.action.fr = 0;
        }

        public toggle(play: boolean = null, setFrame?: number, setActionFrame?: number) {
            this.isPaused = play === null ? !this.isPaused : !play;
            if (setFrame || setFrame === 0) {
                this.state.fr = setFrame;
            }
            if ((setActionFrame || setActionFrame === 0) && this.action) {
                this.action.fr = setActionFrame;
            }
        }

        public reverse() {
            this.duration *= -1;
        }
    }

    //
    // Private Methods
    //
    function tween(keyframeSet : keyframeSet, currentFrame : number): {[param : string] : number} {
        let params = {};
        for (let key in keyframeSet) {
            if (typeof keyframeSet[key] === 'number') {
                params[key] = keyframeSet[key];
            } else {
                params[key] = interpolate(keyframeSet[key], currentFrame);
            }
        }
        return params;
    }   

    function interpolate(keyframe: keyframe, currentFrame: number): number {
        let nextKeyframe = 0;
        //TODO: optimise for number[] case
        keyframe = keyframe as number[] | number[][] | (number|string)[][];
        if (typeof keyframe[0] === 'number') {
            keyframe = (keyframe as number[]).map((k, i) => [i / (keyframe as number[]).length, k]);
        }

        for(let k = 0; k < keyframe.length; k++) {
            if (currentFrame < keyframe[k][0]) {
                nextKeyframe = k;
                break; 
            }
        }

        let end   = keyframe[nextKeyframe],
            start = keyframe[nextKeyframe === 0 ? keyframe.length - 1 : nextKeyframe - 1];
        if (end[0] === 1) {
            end[0] = 0.9999;
        }

        let frameDiff = (1 + end[0] - start[0]) % 1;
        return Easings[start[2] || 'sine'](currentFrame - start[0], start[1], end[1] - start[1], frameDiff);
    }

    //
    // Easing Functions
    //
    const Easings = {
        linear:     (t, b, c, d) => b + (c * (t / d)),
        sine:       (t, b, c, d) => -c/2 * (Math.cos(Math.PI*t/d) - 1) + b,
        cubic:      (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t*t + b : c/2*((t-=2)*t*t + 2) + b,
        quad:       (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t + b : -c/2 * ((--t)*(t-2) - 1) + b,
        quart:      (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t*t*t + b : -c/2 * ((t-=2)*t*t*t - 2) + b,
        quint:      (t, b, c, d) => (t/=d/2) < 1 ? c/2*t*t*t*t*t + b : c/2*((t-=2)*t*t*t*t + 2) + b,
        expo:       (t, b, c, d) => {
                        if (t==0) return b;
                        if (t==d) return b+c;
                        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b;
                        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b;
                    },
        back:       (t, b, c, d) =>  (t/=d/2) < 1 ? c/2*(t*t*((3.6)*t - 2.6)) + b : c/2*((t-=2)*t*(3.6*t + 2.6) + 2) + b,
        bounce:     (t, b, c, d) => t < d/2 ? Easings.bounceIn(t*2, 0, c, d) * .5 + b : Easings.bounceOut(t*2-d, 0, c, d) * .5 + c*.5 + b,
        elastic:    (t, b, c, d) => {
                        var s=1.70158;var p=0;var a=c;
                        if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5);
                        if (a < Math.abs(c)) { a=c; var s=p/4; }
                        else var s = p/(2*Math.PI) * Math.asin (c/a);
                        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
                        return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b;
                    },
        circular:   (t, b, c, d) => (t/=d/2) < 1 ? -c/2 * (Math.sqrt(1 - t*t) - 1) + b : c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b,
        sineIn:     (t, b, c, d) => -c * Math.cos(t/d * (Math.PI/2)) + c + b,
        cubicIn:    (t, b, c, d) => c*(t/=d)*t*t + b,
        quadIn:     (t, b, c, d) => c*(t/=d)*t + b,
        quartIn:    (t, b, c, d) => c*(t/=d)*t*t*t + b,
        expoIn:     (t, b, c, d) => (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b,
        circularIn: (t, b, c, d) => -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b,
        backIn:     (t, b, c, d) => c*(t/=d)*t*(2.7*t - 1.7) + b,
        bounceIn:   (t, b, c, d) => c - Easings.bounceOut(d-t, 0, c, d) + b,
        elasticIn:  (t, b, c, d) => {
                        var s=1.70158;var p=0;var a=c;
                        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
                        if (a < Math.abs(c)) { a=c; var s=p/4; }
                        else var s = p/(2*Math.PI) * Math.asin (c/a);
                        return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b;
                    },
        sineOut:    (t, b, c, d) => c * Math.sin(t/d * (Math.PI/2)) + b,
        cubicOut:   (t, b, c, d) => c*((t=t/d-1)*t*t + 1) + b,
        quadOut:    (t, b, c, d) => -c *(t/=d)*(t-2) + b,
        quartOut:   (t, b, c, d) => -c * ((t=t/d-1)*t*t*t - 1) + b,
        expoOut:    (t, b, c, d) => (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b,
        circularOut:(t, b, c, d) => c * Math.sqrt(1 - (t=t/d-1)*t) + b,
        backOut:    (t, b, c, d) => c*((t=t/d-1)*t*(2.7*t + 1.7) + 1) + b,
        bounceOut:  (t, b, c, d) => {
                        if ((t/=d) < (1/2.75)) {
                            return c*(7.5625*t*t) + b;
                        } else if (t < (2/2.75)) {
                            return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b;
                        } else if (t < (2.5/2.75)) {
                            return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b;
                        } else {
                            return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b;
                        }
                    },
        elasticOut:(t, b, c, d) => {
                        var s=1.70158;var p=0;var a=c;
                        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3;
                        if (a < Math.abs(c)) { a=c; var s=p/4; }
                        else var s = p/(2*Math.PI) * Math.asin (c/a);
                        return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b;
                    }
    };
}