- [Debug](#debug)
    - [static variables](#static-variables)
    - [static functions](#static-functions)

# Debug
```ts
import { Debug } from './Bunas';
```

This module provides helper functions to display debugging information while your game is running.
When active, the debugger shows the folloing data by default:
* dT
    * The current frame rate as a multiple of the target frame rate
* Inputs
    * The current keyboard and mouse inputs

## static variables
```ts
fontSize    : number  = 14;
color       : string  = 'orangered';
defaults    : {[name: string] : boolean} = {
    dt     : true, [static variables]
    inputs : true
};
```
*fontSize* and *color* set the css font style for the debugger.
*defaults* is an object containing game properties that an be logged to the screen. Setting each parameters' value will toggle it on and off.

## static functions
```ts
toggle( state: boolean ): void
```
Displays the debugger on when *state === true* or hides it if is *state === false*. If state is not provided, debugger is toggled from whatever its current state is.

```ts
log( data: any, persist = true): void
```
This will log whatever data is inputted to the screen.
The *data* input will be converted to a tab seperated JSON string before displaying, allowing any variables or nested objects to be logged.
If *persist* is set to false, the data entry will be cleared after one frame. This allowes changing variables to be logged continuously on a single line in the debugger.

```ts
clear(): void
```
Clears all data from the log.