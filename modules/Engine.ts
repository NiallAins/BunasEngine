import { Debug } from './Debug';
import { Input } from './Input';
import { World } from './World';

export module Engine {
    //
    // Types
    //
    export type AssetList = {
        sprites? : { [name : string] : string | HTMLImageElement };
        sounds?  : { [name : string] : string | HTMLImageElement };
        bgs?     : { [name : string] : string | HTMLAudioElement };
    };

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
    
    export function getDelta()    : number            {return dT; };
    export function getCanvasEl() : HTMLCanvasElement { return can; };
    export function getAssets()   : AssetList         { return assets; };

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
    };

    export function init(
        _exBind   : Function = null,
        canEl?    : string | HTMLElement, 
        _cW       : number = window.innerWidth,
        _cH       : number = window.innerHeight,
        targetFPS : number = 30
    ) {
        if (document.readyState !== "complete") {
            delayInit = init.bind(null, _exBind, can, _cW, _cH, targetFPS);
            return;
        } else {
            delayInit = null;
        }

        if (canEl) {
            can = <HTMLCanvasElement>(typeof canEl === 'string' ? document.getElementById(canEl) : canEl);
        } else {
            can = document.getElementsByTagName('canvas')[0];
            if (!can) {
                can = document.createElement('canvas');
                document.body.appendChild(can);
            }
        }
        can.width   = _cW;
        can.height  = _cH;
        ctx         = can.getContext('2d');
        ctx.translate(0.5, 0.5);

        cW = _cW;
        cH = _cH;
        exBind = _exBind;
        frameDur = 1000 / targetFPS;

        Input.init();

        initDone = true;
    };

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
        spriteLoader = _assets.sprites || {};
        soundLoader  = _assets.sounds || {};
        bgLoader     = _assets.bgs || {};

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
    };

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
            };
            initLoop(externalCallback);
        }
    };   

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
    };

    //
    // Process: Engine Lifecycle
    //
    function initLoop(externalCallback): void {
        externalCallback.call(exBind);
        loop();
    };

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
    };
}