import { Engine as Eng, Input } from './Bunas';

export module Game {
    export function init() {
        Eng.init(document.getElementById('mainCanvas'), this);

        Eng.load({
            sprites : {

            },
            sounds: {

            },
            bgs : {

            }
        }, startGame);
    }

    function startGame() {
        
    }
}