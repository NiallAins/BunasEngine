import { Engine as Eng } from './Engine';
import { Input } from './Input';

export module Debug {
    //
    // Private Variables
    //
    let show       : boolean = false,
        prevT      : number = 0,
        dT         : string = '1.000',
        logs       : string[] = [],
        permLog    : string[] = [],
        container  : HTMLDivElement = document.createElement('div'),
        output     : HTMLPreElement = document.createElement('pre'),
        dTInterval = setInterval(function() {
            dT = Eng.getDelta().toFixed(3).toString();
        }, 500);
    
    container.setAttribute('style', `
        position: fixed;
        height: 100vh;
        padding-top: 20px; 
        top: 0px;
        left: 20px;
        width: 60vw;
        pointer-events: none;
    `);
    container.appendChild(output);

    //
    // Public Variables
    //
    export let
        fontSize        : number = 14,
        color           : string = 'orangered',
        defaultOptions  : {[option: string] : boolean} = {
            dt: true, 
            input : true
        }

    //
    // Public Methods
    //
    export function toggle(state?): void {
        if (state !== show) {
            show = state === undefined ? !show : state;
            show ? document.body.appendChild(container) : document.body.removeChild(container);
        }
    }

    export function log(data: any, persist = true): void {
        let entry = JSON.stringify(data, null, '\t');
        persist ? permLog.push(entry) : logs.push(entry);
    }

    export function clear(): void {
        permLog = [];
    }

    export function draw(ctx: CanvasRenderingContext2D): void {
        output.setAttribute('style', `
            font-size: ${fontSize};
            color: ${color};
            max-height: 100%;
            overflow: hidden;
            white-space: pre-wrap;
        `);

        output.innerHTML = '';
        if (defaultOptions['dt']) {
            output.innerHTML += `dT    : ${dT}<br/>`;
        }
        if (defaultOptions['input']) {
            output.innerHTML += `Input : ${getInputData()}<br/>`;
        }
        output.innerHTML += permLog.concat(logs).join('<br/>');

        output.scrollTop = output.scrollHeight;
        logs = [];
    }

    //
    // Private Methods
    //
    function getInputData(): string {
        return `keyPressed = [${Input.key.pressed.join(', ')}]
        mouseState =
            x: ${Input.mouse.x}
            y: ${Input.mouse.y}
            ${Input.mouse.left.pressed ? `left.pressed
            ` : ''}${Input.mouse.left.dragging ? `left.dragging` : ''} ${Input.mouse.left.drag ? `left.drag
            ` : `
            `}${Input.mouse.left.dragPts.length ? `left.dragPts: [${
                       Input.mouse.left.dragPts.reduce(
                           (str, p) => str =
                            (str.length > 200 ? '...' + str.substr(-200) : str) + '(' + p.x + ', ' + p.y + ')'
                        , '')}]
            ` : ''}${Input.mouse.right.pressed ? `right.pressed
            ` : ''}${Input.mouse.right.dragging ? `right.dragging` : ''} ${Input.mouse.right.drag ? `right.drag
            ` : `
            `}${Input.mouse.right.dragPts.length ? `right.dragPts: [${
                       Input.mouse.right.   dragPts.reduce(
                           (str, p) => str =
                            (str.length > 200 ? '...' + str.substr(-200) : str) + '(' + p.x + ', ' + p.y + ')'
                        , '')}]` : ''}
        `;
    }
    
}