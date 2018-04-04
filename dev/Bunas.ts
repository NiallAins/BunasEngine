//
//  Interfaces
//
export class GameObject {
    public area;

    constructor(
        public x : number,
        public y : number,
        public z : number = 0,
        public clipRadius : number = 0
    ) {
        if (!World.globalArea) {
            World.globalArea = new World.Area();
            World.globalArea.open();
        }
        World.globalArea.addObject(this);
    }

    public startStep (delta: number): void {};
    public step      (delta: number): void {}
    public endStep   (delta: number): void {};

    public startDraw (ctx: CanvasRenderingContext2D, delta: number): void {};
    public draw      (ctx: CanvasRenderingContext2D, delta: number): void {};
    public endDraw   (ctx: CanvasRenderingContext2D, delta: number): void {};
}

//
// Module: Core Engine
//
export module Engine {
    //
    // Types
    //
    export type AssetList = {
        sprites : { [name : string] : string | HTMLImageElement };
        sounds  : { [name : string] : string | HTMLImageElement };
        bgs     : { [name : string] : string | HTMLAudioElement };
    }

    //
    // Public Variables
    //
    export let
        preStep  : ()=>void = ()=>{},
        postStep : ()=>void = ()=>{},
        preDraw  : ()=>void = ()=>{},
        postDraw : ()=>void = ()=>{},
        cW : number,
        cH : number;

    //
    // Setters / Getters
    //
    
    export function getDelta()    : number            {return dT; }
    export function getCanvasEl() : HTMLCanvasElement { return can; }
    export function getAssets()   : AssetList         { return assets; }

    //
    // Process: Initalisation
    // public method = init
    //
    let
        initDone  : boolean = false,
        delayInit : ()=>void = null,
        delayLoad : ()=>void = null,
        can       : HTMLCanvasElement,
        ctx       : CanvasRenderingContext2D,
        dT        : number = 0,
        currentT  : number = +new Date(),
        frameDur  : number,
        exBind    : Function,
        assets    : AssetList;

    document.onreadystatechange = function() {
        if (document.readyState === "complete") {
            if (delayInit) {
                delayInit();
            }
            if (delayLoad) {
                delayLoad();
            }
        }
    }

    export function init(
        canId     : string, 
        _exBind   : Function,
        _cW       : number = window.innerWidth,
        _cH       : number = window.innerHeight,
        targetFPS : number = 30
    ): void {
        if (document.readyState !== "complete") {
            delayInit = init.bind(null, canId, _exBind, _cW, _cH, targetFPS);
            return;
        } else {
            delayInit = null;
        }

        can         = <HTMLCanvasElement> document.getElementById(canId);
        cW          = _cW;
        cH          = _cH;
        can.width   = cW;
        can.height  = cH;
        ctx         = can.getContext('2d');

        ctx.translate(0.5, 0.5);
        exBind = _exBind;
        Input.init();
        frameDur = 1000 / targetFPS;

        initDone = true;
    }

    //
    // Process: Asset Loading
    // public method = load
    //
    let loading           : number = 0,
        assetTotal        : number,
        externalCallback  : Function,
        spriteLoader      : any,
        soundLoader       : any,
        bgLoader          : any;

    export function load(
        _assets            : AssetList,
        _externalCallback  : ()=>void,
        loadingDrawFunc?   : (fractionLoaded: number)=>void
    ) : void {
        if (document.readyState !== "complete") {
            delayLoad = load.bind(null, _assets, _externalCallback, loadingDrawFunc);
            return;
        }
        delayLoad = null;

        if (!initDone) {
            throw 'Loading Error: Engine has not been initalized. "load()" call must be preceded by a call to "init()"';
        }
        spriteLoader = _assets.sprites;
        soundLoader  = _assets.sounds;
        bgLoader     = _assets.bgs;

        externalCallback = _externalCallback;
        assetTotal = Object.keys(spriteLoader).length +
                     Object.keys(soundLoader).length +
                     Object.keys(bgLoader).length;
        assetLoader();
        
        advanceLoading(
            loadingDrawFunc ||
            function(fractionLoaded) {
                ctx.strokeStyle = '#fff';
                ctx.fillStyle = '#fff';
                ctx.lineWidth = 10;
                ctx.beginPath();
                    ctx.arc(
                        625, 295, 140,
                        (-Math.PI / 2),
                        (-Math.PI / 2) + ((Math.PI * 2) * (1 - fractionLoaded)),
                        false
                    );
                ctx.stroke();
            }
        );
    }

    function advanceLoading(loadScreen: (completion: number)=>void): void {
        if (loading > 0) {
            ctx.clearRect(0, 0, cW, cH);
            loadScreen(loading / assetTotal);
            window.requestAnimationFrame(advanceLoading.bind(this));
        } else {
            assets = {
                sprites : spriteLoader,
                sounds  : soundLoader,
                bgs     : bgLoader
            }
            initLoop(externalCallback);
        }
    }   

    function assetLoader(): void {
        for (let element in spriteLoader) {
            loading += 1;
            let spr = new Image();
            spr.src = spriteLoader[element];
            spriteLoader[element] = spr;

            spr.onload = () => loading -= 1;
        }

        for (let element in bgLoader) {
            loading += 1;
            let bg = new Image();
            bg.src = bgLoader[element];
            bgLoader[element] = bg;

            bg.onload = () => loading -= 1;
        }

        for (let element in soundLoader) {
            loading += 1;
            let sound = new Audio();
            sound.src = soundLoader[element];
            soundLoader[element] = sound;
            sound.volume = 0.1;

            sound.load();
            sound.oncanplaythrough = () => loading -= 1;
        }
    }

    //
    // Process: Engine Lifecycle
    //
    function initLoop(externalCallback): void {
        externalCallback.call(exBind);
        loop();
    }

    function loop(): void {
        setTimeout(() => {
            let newT: number = +new Date();
            dT = (newT - currentT) / frameDur;
            currentT = newT;

            preStep.call(exBind);
            World.step(dT);
            postStep.call(exBind);

            preDraw.call(exBind);
            ctx.clearRect(-1, -1, cW + 1, cH + 1);
            World.draw(ctx, dT);
            Debug.draw(ctx);
            Input.drawCursor(ctx, dT);
            postDraw.call(exBind);

            Input.clear();
            window.requestAnimationFrame(loop.bind(this));
        }, frameDur - (+new Date()) + currentT);
    }
}

//
// Module: Debugger
//
export module Debug {
    //
    // Private Variables
    //
    let show       : boolean = false,
        prevT      : number = 0,
        dT         : string = '1.000',
        logs       : string[] = [],
        permLog    : string[] = [],
        container  : HTMLDivElement = document.createElement('div'),
        output     : HTMLPreElement = document.createElement('pre'),
        dTInterval = setInterval(function() {
            dT = Engine.getDelta().toFixed(3).toString();
        }, 500);
    
    container.setAttribute('style', `
        position: fixed;
        height: 100vh;
        padding-top: 20px; 
        top: 0px;
        left: 20px;
        width: 60vw;
        pointer-events: none;
    `);
    container.appendChild(output);

    //
    // Public Variables
    //
    export let
        fontSize        : number = 14,
        color           : string = 'orangered',
        defaultOptions  : {[option: string] : boolean} = {
            dt: true, 
            input : true
        }

    //
    // Public Methods
    //
    export function toggle(state?): void {
        if (state !== show) {
            show = state === undefined ? !show : state;
            show ? document.body.appendChild(container) : document.body.removeChild(container);
        }
    }

    export function log(data: any, persist = true): void {
        let entry = JSON.stringify(data, null, '\t');
        persist ? permLog.push(entry) : logs.push(entry);
    }

    export function clear(): void {
        permLog = [];
    }

    export function draw(ctx: CanvasRenderingContext2D): void {
        output.setAttribute('style', `
            font-size: ${fontSize};
            color: ${color};
            max-height: 100%;
            overflow: hidden;
            white-space: pre-wrap;
        `);

        output.innerHTML = '';
        if (defaultOptions['dt']) {
            output.innerHTML += `dT    : ${dT}<br/>`;
        }
        if (defaultOptions['input']) {
            output.innerHTML += `Input : ${getInputData()}<br/>`;
        }
        output.innerHTML += permLog.concat(logs).join('<br/>');

        output.scrollTop = output.scrollHeight;
        logs = [];
    }

    //
    // Private Methods
    //
    function getInputData(): string {
        return `keyPressed = [${Input.key.pressed.join(', ')}]
        mouseState =
            x: ${Input.mouse.x}
            y: ${Input.mouse.y}
            ${Input.mouse.left.pressed ? `left.pressed
            ` : ''}${Input.mouse.left.dragging ? `left.dragging` : ''} ${Input.mouse.left.drag ? `left.drag
            ` : `
            `}${Input.mouse.left.dragPts.length ? `left.dragPts: [${
                       Input.mouse.left.dragPts.reduce(
                           (str, p) => str =
                            (str.length > 200 ? '...' + str.substr(-200) : str) + '(' + p.x + ', ' + p.y + ')'
                        , '')}]
            ` : ''}${Input.mouse.right.pressed ? `right.pressed
            ` : ''}${Input.mouse.right.dragging ? `right.dragging` : ''} ${Input.mouse.right.drag ? `right.drag
            ` : `
            `}${Input.mouse.right.dragPts.length ? `right.dragPts: [${
                       Input.mouse.right.   dragPts.reduce(
                           (str, p) => str =
                            (str.length > 200 ? '...' + str.substr(-200) : str) + '(' + p.x + ', ' + p.y + ')'
                        , '')}]` : ''}
        `;
    }
    
}

//
// Module: Input Listener
//
export module Input {
    //
    // Types / Interfaces
    //
    type Point = {
        x : number;
        y : number;
    }

    interface KeyBoard {
        down    : string;
        up      : string;
        pressed : string[];
    }

    interface Mouse extends Point {
        left  : MouseButton;
        right : MouseButton;
    }

    interface MouseButton {
        down       : boolean;
        up         : boolean;
        doubleUp   : boolean;
        pressed    : boolean;
        drag       : boolean;
        startDrag  : boolean;
        endDrag    : boolean;
        dragging   : boolean;
        dragPts    : Point[];
    }

    //
    // Private Variables
    //
    const clickCode: string[] = ['left', 'middle', 'right'];
    let dragCheck = {
            tolerance : 40,
            originX   : 0,
            originY   : 0,
            dragPts   : []
        },
        dblClickWait : number = 500,
        customCursor : (ctx: CanvasRenderingContext2D, delta: number) => void;

    //
    // Public Variables
    //
    export
        let mouse: Mouse = {
            x:    0,
            y:    0,
            left: {
                down       : false,
                up         : false,
                doubleUp   : false,
                pressed    : false,
                drag       : false,
                startDrag  : false,
                endDrag    : false,
                dragging   : false,
                dragPts    : []
            },
            right: {
                down       : false,
                up         : false,
                doubleUp   : false,
                pressed    : false,
                drag       : false,
                startDrag  : false,
                endDrag    : false,
                dragging   : false,
                dragPts    : []
            }
        },

        key: KeyBoard = {
            up      : null,
            down    : null,
            pressed : []
        };

    //
    // Setters / Getters
    //
    export function setDragTolerance(tolerance: number): void {
        dragCheck.tolerance = tolerance;
    }

    export function setdoubleClickWait(v: number): void {
        dblClickWait = v;
    }

    //
    // Public Methods
    //
    export function init(): void {
        window.addEventListener('mousemove', onMouseMove.bind(this));
        window.addEventListener('mousedown', onMouseDown.bind(this));
        window.addEventListener('mouseup'  , onMouseUp.bind(this));

        window.onkeydown = onKeyDown.bind(this);
        window.onkeyup   = onKeyUp.bind(this);

        toggleContextMenu(false);
    }

    export function clear(): void {
        resetMouseButton(mouse.left);
        resetMouseButton(mouse.right);

        key.down = null;
        key.up   = null;
    }

    export function toggleContextMenu(show = true): void {
        if (show) {
            window.oncontextmenu = function (e) { };
        } else {
            window.oncontextmenu = function (e) {
                e.preventDefault();
            };
        }
    }

    export function checkKey(...keys: string[]): boolean | object {
        return keys.some(k => key.pressed.indexOf(k) !== -1);
    }

    export function setCursor(cursor: (ctx: CanvasRenderingContext2D, delta: number)=>void | string) {
        if (typeof cursor === 'string') {
            (Engine.getCanvasEl() as HTMLElement).style.cursor = cursor;
        } else {
            (Engine.getCanvasEl() as HTMLElement).style.cursor = 'none';
            customCursor = cursor;
        }
    }

    export function drawCursor(ctx: CanvasRenderingContext2D, delta: number) {
        if (customCursor) {
            ctx.save();
                ctx.translate(mouse.x, mouse.y);
                customCursor(ctx, delta);
            ctx.restore();
        }
    }

    //
    // Private Methods
    //
    function onMouseDown(e: MouseEvent): void {
        dragCheck.originX = e.clientX;
        dragCheck.originY = e.clientY;
        mouse[clickCode[e.button]].pressed = true;
        mouse[clickCode[e.button]].down    = true;
    }

    function onMouseUp(e: MouseEvent): void {
        let b = mouse[clickCode[e.button]];

        b.pressed = false;
        b.up      = true;

        if (b.dragging) {
            b.endDrag  = true;
            b.dragging = false;
        }

        if (b.dblCheck) {
            b.doubleUp = true; 
            b.dblCheck = false;
        } else {
            b.dblCheck = true;
            setTimeout(() => b.dblCheck = false, dblClickWait);
        }
    }

    function onMouseMove(e: MouseEvent): void {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        checkDrag(mouse.left);
        checkDrag(mouse.right);
    }

    function checkDrag(b: MouseButton): void {
        if (b.pressed) {
            if (!b.dragging) {
                if (
                    Math.sqrt(
                        Math.pow(mouse.y - dragCheck.originY, 2) +
                        Math.pow(mouse.x - dragCheck.originX, 2)
                    ) > dragCheck.tolerance
                ) {
                    b.dragging = true;
                    b.dragPts = [];
                    dragCheck.dragPts.forEach(p => b.dragPts.push({ x: p.x, y: p.y }));
                    dragCheck.dragPts = [];
                } else {
                    dragCheck.dragPts.push({
                        x: mouse.x,
                        y: mouse.y
                    });
                }
            } else {
                b.drag = true;
                b.dragPts.push({
                    x: mouse.x,
                    y: mouse.y
                });
            }
        }
    }

    function resetMouseButton(b: MouseButton): void {
        b.down       = false;
        b.up         = false;
        b.doubleUp   = false;
        b.drag       = false;
        b.startDrag  = false;
        b.endDrag    = false;
    }

    function onKeyDown(e: KeyboardEvent): void {
        let keyName = e.code;
        key.down = keyName;
        if (key.pressed.indexOf(keyName) === -1) {
            key.pressed.push(keyName);
        }
    }

    function onKeyUp(e: KeyboardEvent): void {
        let keyName = e.code;
        key.up = keyName;
        key.pressed.splice(key.pressed.indexOf(keyName), 1);
    }
}

//
// Module: Graphics
//
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

            this.fr += (1 / this.duration) * Engine.getDelta();
            
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
                    this.fr += (1 / this.duration) * Engine.getDelta();
                    if (this.fr > 1 || this.fr < 0) {
                        this.fr = (this.fr + 1) % 1;
                        this.state.onEnd();
                        this.onEnd();
                    }
                }
                if (this.action) {
                    this.action.fr += (1 / this.action.duration) * Engine.getDelta();
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

//
// Module: World and Area Creator
//
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

//
// Module: Physics Simulator
//
export module Physics {
    //
    // Class: Vector
    //
	export class Vec {
		public x: number;
		public y: number;

		constructor(a: number = 1, b: number = 0, polar = false) {
			if (polar) {
				this.setMagAng(a, b);
			} else {
				this.x = a;
				this.y = b;
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

		public getAng():number {
			return Math.atan2(this.y, this.x);
		}

		public getMag(): number {
			return Math.sqrt((this.x * this.x) + (this.y * this.y));
		}

		public getNorm(): Vec {
			let ang = this.getAng();
			return new Vec(Math.cos(ang), Math.sin(ang));
		}

		public add(v: Vec): Vec {
			return new Vec(this.x + v.x, this.y +  v.y);
		}

		public sub(v: Vec): Vec {
			return new Vec(this.x - v.x, this.y -v.y);
		}

		public scale(s: number): Vec {
			return new Vec(this.x * s, this.y * s);
		}

		public dot(v:Vec): number {
			return (this.x * v.x) + (this.y * v.y)
		}

		public dis(v:Vec): number {
			let a = (v.x - this.x) * (v.x - this.x);
			let b = (v.y - this.y) * (v.y - this.y);
			return Math.sqrt(a + b);
		}

		public angWith(v:Vec): number {
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
			public m    : number = rad / 2,
			public fric : number = 0,
			public el   : number = 0.5
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

            this.p.x %= Engine.cW;
            this.p.y %= Engine.cH;

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
                ctx.fillStyle = 'dodgerblue';
                ctx.arc(this.p.x, this.p.y, this.rad - 2, 0, TAU);
            ctx.fill();
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
    
    //
    // Public Variables
    //
    export const
        GRAV = 41.18, //pixels per frame^2
        TAU  = 6.2832;

    let globalCtx;
}