- [Engine](#engine)
    - [Types](#types)
    - [Public Variables](#public-variables)
    - [Getters](#getters)
    - [Lifecycle Hooks](#lifecycle-hooks)
    - [Public Methods](#public-methods)

# Engine
```ts
import { Engine } from './Bunas';
```
This module provide all the bsaic functionaily for the engine, including initalisation, loading of assets and time keeping.

## Types
```ts
    type AssetRouteList = {
        sprites? : { [name : string] : string };
        sounds?  : { [name : string] : string };
        bgs?     : { [name : string] : string };
    }

    let a: AssetNameList = {
        sprites: {
            walk: 'assets/character/walking.png',
            stand: 'assets/character/sanding.png'
        },
        sounds: {
            start: 'assets/audio/gong.mp3'
        }
    }
```
An object repersenting project assets, assigning names to the locations of sound and image file within the project.

```ts
    type AssetList = {
        sprites? : { [name : string] : HTMLImageElement };
        sounds?  : { [name : string] : HTMLAudioElement };
        bgs?     : { [name : string] : HTMLImageElement };
    }
```
An object with the same structure of an AssetNameList, but with the routes of each asset replaced with its actual loadede element.

## Public Variables
```ts
    cW : number
    cH : number
```
The in-browser (real) width and height of the drawing canvas in pixels.

## Getters
```ts
    getDelta()    => number
    getCanvasEl() => HTMLCanvasElement
    getAssets()   => AssetList
```
- *getDelta* returns the current delta, which is how closely the game is running to the target FPS. A value of 1 means the game is running at exactly the correct FPS, 0.5 means half as slow, etc.
- *getCanvasEl* returns a reference to the HTML Canvas Element which is being used to render content to the screen.
- *getAssets* returns all game assets (audio, images, etc) as an *AssetList* object

## Lifecycle hooks
```ts
    preStep  : ()=>void
    postStep : ()=>void
    preDraw  : ()=>void
    postDraw : ()=>void
```
These variables allow you to assign functions to be run at specific points of the frame render process.
- *preStep* and *postStep* run before and after all object step methods have been processed and calcualted.
- *preDraw* and *postDraw* run before and after all object draw methods have been rendered to the screen.

## Public Methods
```ts
    init(
        exBind    : Function = null,
        canEl?    : string | HTMLElement, 
        cW        : number = window.innerWidth,
        cH        : number = window.innerHeight,
        targetFPS : number = 30
    )=>void
```
This function is called to initalise the **Bunas** engine. It must be the first function called in a **Bunas** project.  
It can be called with following optional parameters:
- *exBind*  
If a **Bunas** engine project is being initalized in a context other than the global context, a refernece to the correct context can be provided here.
- *canEl*  
The HTML Canvas element the engine will render to. It will accpet either the `id` of the canvas of a reference to HTML element itself. If none is provided, **Bunas** will select the first Canvas it finds, and if none are found, create a new full screen sized canvas as a child of the pages `<body>`. 
- *cW*, *cH*  
Define the width and height of the Canvas element in pixels. If none are provided the current width and height of the canvas is used.
- *targetFPS*  
The frames per second you want your project to render at. Projects may run slower than this target value depending on size and the system being used. Default used is 30FPS

```ts
    load(
        assets            : AssetRouteList,
        externalCallback  : ()=>void,
        loadingDrawFunc?  : (fractionLoaded: number)=>void
    )=>void
```
This function is called after *Engine.init* to begin the loading of assets to the project, and to start the engine lifecycle.
It requires the following parameters:
- *assets*  
An *AssetRouteList* containing the project assets to be pre-loaded before starting the game.
- *externalCallback*  
The main game function to be called to start the project once the loading of assets has been completed.
It also accepts the optional parameter:
- *loadingDrawFunction*  
This is a draw function which will be rendered to the canvas while the assets are loading. It takes the parameter *fractionLoaded* which is a number between 0 and 1 indicating the current asset loading progress which can be usde to correctly render loading bars or other indictors.
