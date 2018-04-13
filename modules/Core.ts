import { World } from './World';

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
    public step      (delta: number): void {};
    public endStep   (delta: number): void {};

    public startDraw (ctx: CanvasRenderingContext2D, delta: number): void {};
    public draw      (ctx: CanvasRenderingContext2D, delta: number): void {};
    public endDraw   (ctx: CanvasRenderingContext2D, delta: number): void {};
}