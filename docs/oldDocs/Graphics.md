- [Graphics](#graphics)
    - [Types](#types)
        - [Keyframe](#keyframe)
        - [keyframe set](#keyframe-set)
        - [draw function](#draw-function)
        - [sprite state](#sprite-state)
    - [Interaces](#interaces)
        - [ISprite](#isprite)
    - [Easing functions](#easing-functions)
    - [Classes](#classes)
        - [Vector Sprite](#vector-sprite)
            - [constructor](#constructor)
            - [public variables](#public-variables)
            - [methods](#methods)
            - [Example Code](#example-code)
        - [Dynamic Vector Sprite](#dynamic-vector-sprite)

# Graphics
```ts
import { Graphics } from './Bunas';
```
This module provides method for rendering imagagry to the canvas during your game. This can include anything from genreating animated sprites from sprite sheets or vector descriptions, background images, tile sets or GUI features needed for your project, such as menus and heads-up displays.

## Types

### Keyframe
```ts
type keyframe = number | number[] | number[][] | (number | string)[][];

let a : keyframe = 5,
    b : keyframe = [10, 20, 30, 25],
    c : keyframe = [[0, 10], [0.3, 30], [0.9, 20]],
    d : keyframe = [[0, 10], [0.3, 30, 'bounceIn'], [0.9, 20, 'bounceOut']]
```
A *keyframe* describes the values a property will take over the course of an animation.  
If a *number* is provided, the property will remain constant throughout the animation.  
If a *number[]* array is provided the values of the property will vary between each value in the array at equal intervals before looping back to the first value as the animation cycle repeats.  
If a you want to specific exact timings for your animation, instead of letting the time between each value be equal, you can provide a nested *number[][]* array where each inner array has two values, the first a number between 0 - 1 to indicate a point in the animation cycle and the second equal to the value of the property to be reached at that point.  
A third string value can be added to these array values to indicate the *easing function* used between that frame and the next.

### keyframe set
```ts
type keyframeSet = { [property: string] : keyframe }

let set : keyframeSet = {
    height : [0, 20, 50],
    width  : [[0.2, 20], [0.8, 30]]
}
```
A *keyframeSet* is an object where each parameter describes the *keyframe* to animate a particular property.
On each animation frame, each of these properties are mapped to the single values they would have on that particular frame before being sent to a *drawFunction*.

### draw function
```ts
type drawFunction = (frame: { [property: string] : number }, ctx: CanvasRenderingContext2D)=>void
```
A *draw function* is a function which executes a series of canvas drawing calls; such as *ctx.fillRect()*, *ctx.lineTo(),* etc.; to draw a vector image.
The *frame* input is an object derived from a *keyframe set*. On each frame of animation, the values of each property in a *keyframe set* will be mapped to its current single value at that moment of time. This mapped keyframe set becomes the frame input to a *draw function*
The *ctx* input is simply the current canvas drawing context.

### sprite state
```ts
export type spriteState  = {
    duration   : number,
    elements   : { [element: string] : keyframeSet }
    fr?        : number,
    iteration? : number
    easeIn?    : string,
    easeOut?   : string,
    onEnd?     : ()=>void
}
```
A sprite state is 

## Interaces
### ISprite
```ts
interface ISprite {
    duration : number;
    draw     : (x: number, y: number, ang: number, ctx: CanvasRenderingContext2D)=>void;
    toggle   : (play: boolean, setFrame: number)=>void;
    reverse  : ()=>void;
    onEnd    : ()=>void;
};
```
In the *Graphics* module, serveral classes are prvided from creating differnet kinds of sprites. Each of these classes will implement the ISprite interface ensuing that regardles of the method of cration, each sprite in a *Bunas* game can b handled with the same set of functions.

## Easing functions
Many animation functions will accept a string input called *ease*. This input describes the effect to be used when transitioning from one value to another in an animation cycle.
The following easing function names are accepted in this module:
* linear
* sine
    * sineIn
    * sineOut
* cubic
    * cubicIn
    * cubicOut
* quad
    * quadIn
    * quadOut
* quart
    * quartIn
    * quartOut
* quint
* expo
    * expoIn
    * expoOut
* back
    * backIn
    * backOut
* bounce
    * bounceIn
    * bounceOut
* elastic
    * elasticIn
    * elasticOut
* circular
    * circular
    * In
    * circularOut

When none is provided, a *sine* easing will always be used by default.

## Classes
### Vector Sprite
A sprite created from a *draw function* containing a series of canvas drawing commands, and an optional *keyframe set* which describes the animation of parameters which can be used in the draw function.

#### constructor
```ts
constructor(
    drawFunction :drawFunction,
    keyframeSet  :keyframeSet = null,
    duration     :number = 30
) 
```

The *keyframe set* is an object where each key-value pair is the name of a parameter and the values of that parameters that need to be interpolated during the animation cycle. It can take any of the following forms:

```ts
keyframeSet = {
    //constant value for whole animation
    height : 20,

    //transition though values at equal intervals
    width : [10, 30, 50, 40],

    //specify fraction of animation for each value
    left  : [[0, 10], [0.4, 30], [0.8, 40]],
    
    //specify easing function between each frame (sine by default)
    top   : [[0, 10, 'bounce'], [0.5, 50, 'quad']] 
}
```

The draw function takes two inputs:
```ts
function(frame: {[propertyName] : number}, ctx: Canvas2DRenderingContext) { }
```
*frame* contains a list of property values for the current animation frame. The frame object will contain the same keys as the keyframeSet but with each value mapped to its value for the current animation frame.
*ctx* is simply the current canvas drawing context.

The sprite also takes a *duration* input, which is the number of game frames a single animation cycle of the sprite will last.


#### public variables
```ts
drawFunction :drawFunction
keyFrameset  :keyframeSet,
duration     :number;
fr           :number
onEnd        :()=>void
```

*fr* is the current animation frame of the sprite. Since this is a vector sprite this can be any decimal number between 0 and 1 repersenting the fraction of the animation which has elasped so far.

*onEnd* is a function which, if set, will be called at the end of every animation cycle of the sprite.

#### methods
```ts
draw(x: number, y: number, ang: number, ctx: CanvasRenderingContext2D) => void
```
Draws the sprite in next frame of its animation.
*x*, *y* and *ang* are the position and rotation to draw the sprite on the canvas.

*ctx* is the current game canvas context.


```ts
toggle(play: boolean = null, setFrame?: number)=> void
```
Pauses or resumes the animation of the sprite. When paused, each call to draw() will render the sprite but will not increment its animation frame.
If *play* is true, the animation will play; false, it will pause; unset it will change to the state is not currently in.
*setFrame* can be set to a value between 0 and 1 to set the animation frame of the sprite before pausing / resuming.


```ts
reverse()=> void
```
Reverses the direction of the play of the animation cycle.

#### Example Code
```ts
//Static sprite
drawFunction = () => ctx.fillRect(0, 0, 200, 100);

//Sprite with simple keyframe animation
frame = {
    width : [200, 300],
    height: [100, 10, 60, 10]
};
drawFunction = (frame) => ctx.fillRect(0, 0, frame.width, frame.height);

//More complex keyframe sprite
frame = {
    width : [[0, 200, 'bounce'], [90, 300, 'backOut']],
    height: 50
};
drawFunction = (frame) => ctx.fillRect(0, 0, frame.width, frame.height);

//Init and call
let sprite = new Graphics.VectorSprite(drawFunction, frame, 30);
sprite.draw(100, 100, 0, ctx);
```


### Dynamic Vector Sprite
This class allows you to define several elements which make up a sprite, differnet states the sprite can exist in an differnet animated actions the sprite can perform.
You can then trigger the sprite to change elements, states or perform actions with each animation eaing smoothly with the next.

```ts

```