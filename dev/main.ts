import { Engine as Eng, Input, Physics as Phy, Debug } from './Bunas';

export module Game {
    export function init() {
        Eng.init('mainCanvas', this);

        Eng.load({
            sprites : {

            },
            sounds: {

            },
            bgs : {

            }
        }, initGameLoop);
    }

    function initGameLoop() {
        Input.setCursor(function(ctx, delta) {
            ctx.beginPath();
                ctx.moveTo(0, 0)
                ctx.lineTo(20, 10);
                ctx.lineTo(5, 22)
            ctx.closePath();
            ctx.fillStyle = 'dodgerblue';
            ctx.fill();
        });
        for(let i = 0; i < 2000; i++) {
            new Phy.Particle(
                Eng.cW * Math.random(),
                Eng.cH * Math.random(), 
                4 + (10 * Math.random())
            ).applyForce(
                new Phy.Vec(
                    60 * Math.random(),
                    Math.PI * 2 * Math.random(),
                    true
                )
            );
        }
    }
}