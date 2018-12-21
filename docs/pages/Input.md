- [Input](#input)
    - [Types](#types)
    - [Public Variables](#public-variables)
    - [Setters](#setters)
    - [Lifecycle Hooks](#lifecycle-hooks)
    - [Public Methods](#public-methods)

# Input
```ts
import { Engine } from './Bunas';
```
This module provide all the bsaic functionaily for the engine, including initalisation, loading of assets and time keeping.

## Public Variables
The input modules contains two public variables which hold the state of the mouse and keyboard inputs.
```ts
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
    };
```
*x* and *y* is the cursor location on the canvas.
*left* and *right* store the state of the left and right mouse buttons. On any given step one or more button states can return `true`. Some of these states are instant, meaning they will only be set as true for a single step after an event has occured before being reset to false. Others are continous, meaning they may remain true for several consecutive steps.
- *down* - Instant. Button is pressed
- *up* - Instant. Button is released
- *doubleUp* - Instant. A double click is released
- *pressed* - Continuous. Button was pressed down and has not yet been released
- *drag*- Continuous. Button was pressed down and the cursor was moved. Button has yet to be released.
- *startDrag* - Instant. Button was pressed down and the cursor moves for the first time
- *endDrag* - Instant. Button is released which ends a drag event
- *dragging* - Instant. Button was pressed down and the cursor moves
During a drag event, the *dragPts* holds an array of `{x: number, y: number}` objects, indicating the points over which the cursor has been dragged. This array is not reset until the next drag event begins.


```ts
    key: KeyBoard = {
        up      : null,
        down    : null,
        pressed : []
    };
```
When a key is pressed down, *up* will hold that key's name for a single step.
When a key is released, *up* will hold that key's name for a single step.
The names of all keys that are currently being pressed will appear in the array *pressed*.

## Setters
```ts
    setDragTolerance(tolerance: number)=>void
```
Sets the pixel distance the cursor must move while a button is being pressed, before a drag event is registed.

```ts
    setdoubleClickWait(v: number)=>void
```
Sets the maximum number of milliseconds allowed between mouse clicks for a double click to be registered, triggering the *doubleUp* mouse button state.

## Public Methods
```ts
    toggleContextMenu(show: boolean = true)=>void
```
Toggles whether or not to display the default browser context menu on right click.

```ts
    checkKey(...keys: string[]): boolean | object
```
Returns `true` if any of the key names provided as parameters are currently being pressed.

```ts
    setCursor(cursor: (ctx: CanvasRenderingContext2D, delta: number)=>void | string)=>void
```
If a CSS cursor type string ('pointer', 'disabled', 'none', etc.) is provided, the cursor will be changed to this.
If a draw function is provided, this will be rendered in place of the default mouse cursor.
