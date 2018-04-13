import { Engine } from './Engine';

export module Input {
    //
    // Types / Interfaces
    //
    type Point = {
        x : number;
        y : number;
    };

    interface KeyBoard {
        down    : string;
        up      : string;
        pressed : string[];
    };

    interface Mouse extends Point {
        left  : MouseButton;
        right : MouseButton;
    };

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
    };

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

    export function clear(): void {
        resetMouseButton(mouse.left);
        resetMouseButton(mouse.right);

        key.down = null;
        key.up   = null;
    };

    export function toggleContextMenu(show = true): void {
        if (show) {
            window.oncontextmenu = function (e) { };
        } else {
            window.oncontextmenu = function (e) {
                e.preventDefault();
            };
        }
    };

    export function checkKey(...keys: string[]): boolean | object {
        return keys.some(k => key.pressed.indexOf(k) !== -1);
    };

    export function setCursor(cursor: (ctx: CanvasRenderingContext2D, delta: number)=>void | string) {
        if (typeof cursor === 'string') {
            (Engine.getCanvasEl() as HTMLElement).style.cursor = cursor;
        } else {
            (Engine.getCanvasEl() as HTMLElement).style.cursor = 'none';
            customCursor = cursor;
        }
    };

    export function drawCursor(ctx: CanvasRenderingContext2D, delta: number) {
        if (customCursor) {
            ctx.save();
                ctx.translate(mouse.x, mouse.y);
                customCursor(ctx, delta);
            ctx.restore();
        }
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
}