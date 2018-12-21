# Frame rendering lifecycle

When a **Bunas** project is running, there are several events which occur during the rendering of each frame. The order of these events is highlighted below, along with their suedocode for clarity.

## Step Events
The *Engine* events of `preStep`, `postStep`, `preDraw` and `postDraw` are optional lifecycle hooks used to trigger custom functions to be run at speciic times during the frame rendering process.
```ts
Engine.preStep()
```

*Active objects* are all game objects in a currently active *Area*
```ts
for all activeObjects { object.startStep() }
for all activeObjects { object.step()      }
for all activeObjects { object.endStep()   }
```

```ts
Engine.postStep()
```

## Draw Events

```ts
Engine.preDraw()
clearCanvas()
```

*Visible objects* are all game objects whose clipping distance is within a currently active *View*
```ts
for all activeViews {
    for all visibleObjects { object.startDraw() }
    for all visibleObjects { object.draw()      }
    for all visibleObjects { object.endDraw()   }
}
```

```ts
Debug.draw();
Input.drawCursor();
```
```
Engine.postDraw();
```

All input events listeners, such as *key.up*, are reset for the next step events.
```ts
Input.reset();
```

