class WebSocketClient {
    constructor(canvas) {
        this.socket = io(); // Connects to the server
        this.canvas = canvas;

        this.bindCanvasEvents();
        this.bindSocketEvents();
        this.bindToolbarEvents();
    }

    // Bind canvas.js callbacks to socket emitters
    bindCanvasEvents() {
        // Send live drawing data
        this.canvas.onDraw = (strokeData) => {
            this.socket.emit('draw-stroke', strokeData);
        };

        // Send completed operation for state
        this.canvas.onStop = (operation) => {
            this.socket.emit('add-operation', operation);
        };
    }
    
    // Bind toolbar buttons to socket emitters
    bindToolbarEvents() {
        document.getElementById('undo').addEventListener('click', () => {
            this.socket.emit('request-undo');
        });
        document.getElementById('redo').addEventListener('click', () => {
            this.socket.emit('request-redo');
        });
        document.getElementById('clear').addEventListener('click', () => {
            this.socket.emit('request-clear');
        });
    }

    // Listen for events from the server
    bindSocketEvents() {
        // On connect, load the full history
        this.socket.on('load-history', (operations) => {
            console.log('Loading history...');
            this.canvas.redrawAll(operations);
        });

        // Listen for live strokes from other users
        this.socket.on('draw-stroke', (data) => {
            this.canvas.drawRemoteStroke(data);
        });

        // Listen for a full redraw (after undo/redo)
        this.socket.on('global-redraw', (operations) => {
            console.log('Global redraw requested...');
            this.canvas.redrawAll(operations);
        });
        
        // Listen for a global clear
        this.socket.on('global-clear', () => {
            this.canvas.clearCanvas();
        });
    }
}