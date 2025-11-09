# Architecture Document

## 1. Data Flow Diagram (Drawing)

This describes the flow for both the live "preview" drawing and the "stateful" operation.

**A) Live Drawing (Mouse Move):**
1.  **User A (Client):** `mousemove` event fires on `<canvas>`.
2.  **`canvas.js`:** Draws the single segment locally (`drawSegment`).
3.  **`canvas.js`:** Fires `onDraw` callback with stroke data (`{startX, startY, endX, ...}`).
4.  **`websocket.js`:** Emits `draw-stroke` to the server with the stroke data.
5.  **`server.js`:** Receives `draw-stroke`.
6.  **`server.js`:** Broadcasts `draw-stroke` to *all other clients*.
7.  **User B (Client):** Receives `draw-stroke`.
8.  **`websocket.js`:** Calls `canvas.drawRemoteStroke(data)`.
9.  **`canvas.js`:** Draws the single segment on User B's canvas.

**B) State-Saving (Mouse Up):**
1.  **User A (Client):** `mouseup` event fires.
2.  **`canvas.js`:** Fires `onStop` callback with the *entire* stroke (an array of all points: `Operation[]`).
3.  **`websocket.js`:** Emits `add-operation` to the server with the `Operation`.
4.  **`server.js`:** Receives `add-operation`.
5.  **`server.js`:** Pushes the `Operation` onto the `operationStack` and clears the `redoStack`.
6.  **(No broadcast is needed)**. The drawing is already visible on all clients from step A. This event only updates the server's state for undo/redo.

## 2. WebSocket Protocol

* **Client-to-Server:**
    * `draw-stroke (data)`: Sent on `mousemove`. `data` contains a single line segment.
    * `add-operation (operation)`: Sent on `mouseup`. `operation` is an array of all points in the completed stroke.
    * `request-undo`: No payload. Asks the server to undo.
    * `request-redo`: No payload. Asks the server to redo.
    * `request-clear`: No payload. Asks the server to clear the canvas.

* **Server-to-Client:**
    * `load-history (operations[])`: Sent on initial connection. Payload is the entire `operationStack`.
    * `draw-stroke (data)`: Broadcast to all *other* clients. Payload is a single line segment.
    * `global-redraw (operations[])`: Broadcast to *all* clients after an undo/redo. Payload is the new, correct `operationStack`.
    * `global-clear`: Broadcast to *all* clients.

## 3. Undo/Redo Strategy

The server is the **single source of truth** for the canvas state.
* The server maintains an `operationStack` (an array of all strokes) and a `redoStack`.
* **Undo:** When a client sends `request-undo`, the server pops the last operation from `operationStack`, pushes it to `redoStack`, and then emits `global-redraw` to *all clients* with the *new* `operationStack`.
* **Client Redraw:** All clients, upon receiving `global-redraw`, clear their canvases entirely (`clearCanvas()`) and then loop through the new `operationStack`, redrawing every operation from scratch (`redrawAll()`).
* **Redo:** Works in reverse (pops from `redoStack`, pushes to `operationStack`).
* **New Drawing:** A new `add-operation` event clears the `redoStack`.

This approach guarantees that all clients are always in perfect sync with the server's state, solving the global undo/redo problem.

## 4. Performance Decisions
* **Dual-Event System:** We use two separate events (`draw-stroke` and `add-operation`) to handle real-time drawing.
    * `draw-stroke` is "fire-and-forget" for low-latency live previews. It's sent on `mousemove` but not saved to state.
    * `add-operation` is for state. It's sent on `mouseup` and is the *only* thing added to the undo stack.
* **Client-Side Redraw:** The server only sends the *state* (the array of operations). It never sends image data. The client is responsible for all rendering, which is much more efficient.

## 5. Conflict Resolution
* The "Operation Stack" architecture naturally handles conflicts.
* There is no "simultaneous drawing" conflict because all operations are added to the stack sequentially as the server receives them.
* There is no "undo conflict" because the "Undo" button operates on the server's global stack, not a local one. If User A hits Undo, it undoes the last global action (which might have been User B's), and all clients are synced.