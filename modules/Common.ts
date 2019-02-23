import { World } from './World';
import { Input } from './Input';

//
//  Interfaces
//
/**
    Base class from which all other game objects will inherit
*/
export abstract class GameObject {
    /** Current area object is in */
    public area: World.Area;

    /**
        All game objects will sorted by z to determine draw/step order.
        If clipRadius > 0, draw/step will only be called if object is within clipRadius pixels of an active World.View port.
    */
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

    /** Called on each Engine step event */
    public step      (delta: number): void {};
    /** Called at start of each Engine step event */
    public startStep?(delta: number): void;
    /** Called at end of each Engine step event */
    public endStep?  (delta: number): void;

    /** Called on each Engine draw event */
    public draw      (ctx: CanvasRenderingContext2D, delta: number): void {};
    /** Called at start of each Engine draw event */
    public startDraw?(ctx: CanvasRenderingContext2D, delta: number): void;
    /** Called at end of each Engine draw event */
    public endDraw?  (ctx: CanvasRenderingContext2D, delta: number): void;

    /** Called on object mouseover if Input.setMouseListener() has been set */
    public onMouseOver?(m: Input.Mouse): void;

    /* Removes instance from game */
    public die(): void {
        this.area.removeObject(this);
    }
}