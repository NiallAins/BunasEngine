import { Engine } from './Engine';
import { GameObject } from './Common';
import { Graphics } from './Graphics';

/** This module provides an interface for user inputs */
export module Input {
    //
    // Types / Interfaces
    //
    /** Private: to store cursor position */
    type Point = {
        x : number;
        y : number;
    };

    type ClickableObject = {
        obj: GameObject;
        x0: number;
        x1: number;
        y0: number;
        y1: number;
        circ: boolean;
    };

    /** Private: Describes state of keyboard input */
    interface KeyBoard {
        down    : string;
        up      : string;
        pressed : string[];
    };

    /** Private: Describes single mouse button state */
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
    };

    /** Describes current state of mouse input */
    export interface Mouse extends Point {
        left  : MouseButton;
        right : MouseButton;
    };

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
        customCursor : (ctx: CanvasRenderingContext2D, delta: number) => void,
        clickableObjects: ClickableObject[] = [];

    //
    // Public Variables
    //
    export let
        /** Current state of mouse input */
        mouse: Mouse = {
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

        /**
            Current state of keyboard input
            Pressed stores names of all keys currently pressed
        */
        key: KeyBoard = {
            up      : null,
            down    : null,
            pressed : []
        };

    //
    // Setters / Getters
    //
    /** Sets number of pixels cursor must move while pressed before drag event is triggered */
    export function setDragTolerance(tolerance: number): void {
        dragCheck.tolerance = tolerance;
    };
    /** Sets maximum milliseconds between clicks in a double click in order for event to be trigged */
    export function setdoubleClickWait(v: number): void {
        dblClickWait = v;
    };

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
    };

    export function step(): void {
        emitClickableObjectEvents();

        resetMouseButton(mouse.left);
        resetMouseButton(mouse.right);

        key.down = null;
        key.up   = null;
    };

    /**
        Enable/Disable browser context menu on right click
        Disabled by default
     */
    export function toggleContextMenu(show: boolean = true): void {
        if (show) {
            window.oncontextmenu = function (e) { };
        } else {
            window.oncontextmenu = function (e) {
                e.preventDefault();
            };
        }
    };

    /** Returns true is any of the key names provided are currently pressed  */
    export function checkKey(...keys: string[]): boolean | object {
        return keys.some(k => key.pressed.indexOf(k) !== -1);
    };

    /**
        Sets cursor type if CSS cursor name is provided
        Sets a custom cursor to be rendered if draw function is provided
    */
    export function setCursor(cursor: (ctx: CanvasRenderingContext2D, delta: number)=>void | string): void {
        if (typeof cursor === 'string') {
            (Engine.getCanvasEl() as HTMLElement).style.cursor = cursor;
        } else {
            (Engine.getCanvasEl() as HTMLElement).style.cursor = 'none';
            customCursor = cursor;
        }
    };

    export function drawCursor(ctx: CanvasRenderingContext2D, delta: number): void {
        if (customCursor) {
            ctx.save();
                ctx.translate(mouse.x, mouse.y);
                customCursor(ctx, delta);
            ctx.restore();
        }
    };

    /**
        Registers game object with relative hit box in which to listener for mouseover events
        If circular, hit box will be a circle
        If centered, box will be centered on object.x, object.y; otherwise, will be aligned with top left
    */
    export function setMouseListener(g: GameObject, width: number, height: number, circular: boolean = false, centered: boolean = false) {
        let x0, y0, x1, y1 = 0;
        if (circular) {
            x1 = y1 = width / 2;
            if (!centered) {
                x0 = y0 = width / 2;
            }
        } else if (centered) {
            x0 = -width / 2;
            x1 = width / 2;
            y0 = -height / 2;
            y1 = height /2;
        } else {
            x1 = width;
            y1 = height;
        }
        clickableObjects.push({
            obj: g,
            x0: x0,
            x1: x1,
            y0: y0,
            y1: y1,
            circ: circular
        });
    };

    /** Calls setMouseListener with width and height of provided sprite */
    export function setMouseListenerFromSprite(g: GameObject, sprite: Graphics.Sprite, centered: boolean = false) {
        setMouseListener(g, sprite.width, sprite.height, false, centered);
    };

    //
    // Private Methods
    //
    function onMouseDown(e: MouseEvent): void {
        dragCheck.originX = e.clientX;
        dragCheck.originY = e.clientY;
        mouse[clickCode[e.button]].pressed = true;
        mouse[clickCode[e.button]].down    = true;
    };

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
    };

    function onMouseMove(e: MouseEvent): void {
        mouse.x = e.clientX;
        mouse.y = e.clientY;

        checkDrag(mouse.left);
        checkDrag(mouse.right);
    };

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
    };

    function resetMouseButton(b: MouseButton): void {
        b.down       = false;
        b.up         = false;
        b.doubleUp   = false;
        b.drag       = false;
        b.startDrag  = false;
        b.endDrag    = false;
    };

    function onKeyDown(e: KeyboardEvent): void {
        let keyName = e.code;
        key.down = keyName;
        if (key.pressed.indexOf(keyName) === -1) {
            key.pressed.push(keyName);
        }
    };

    function onKeyUp(e: KeyboardEvent): void {
        let keyName = e.code;
        key.up = keyName;
        key.pressed.splice(key.pressed.indexOf(keyName), 1);
    };

    function emitClickableObjectEvents() {
        clickableObjects.forEach(o => {
            if (o.obj.onMouseOver) {
                let clicked: boolean;
                if (o.circ) {
                    clicked =
                        Math.sqrt(
                            Math.pow(mouse.y - (o.obj.y + o.y0), 2) +
                            Math.pow(mouse.x - (o.obj.x + o.x0), 2)
                        ) < o.x1;
                } else {
                    clicked =
                        o.obj.x - o.x0 < mouse.x &&
                        o.obj.x + o.x1 > mouse.x &&
                        o.obj.y - o.y0 > mouse.y &&
                        o.obj.y + o.y1 > mouse.y;
                }
                if (clicked) {
                    o.obj.onMouseOver.call(o.obj, mouse);
                }
            }
        });
    };
}