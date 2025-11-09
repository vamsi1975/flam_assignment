const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// In-memory state
let operationStack = [];
let redoStack = [];

// Serve static files from the 'client' directory
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// Handle base URL to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
});

// WebSocket connection logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Send the entire drawing history to the new user
    socket.emit('load-history', operationStack);

    // Listen for live drawing strokes (for ephemeral preview)
    socket.on('draw-stroke', (data) => {
        // Broadcast this stroke to all *other* clients
        socket.broadcast.emit('draw-stroke', data);
    });

    // Listen for a completed operation (for state)
    socket.on('add-operation', (operation) => {
        operationStack.push(operation);
        redoStack = []; // Clear redo stack on new operation
        // Note: We don't re-broadcast here. The drawing already happened.
        // This event just confirms the operation for state.
    });

    // Listen for an undo request
    socket.on('request-undo', () => {
        if (operationStack.length > 0) {
            const undoneOperation = operationStack.pop();
            redoStack.push(undoneOperation);
            
            // Tell all clients to redraw from scratch
            io.emit('global-redraw', operationStack);
        }
    });

    // Listen for a redo request
    socket.on('request-redo', () => {
        if (redoStack.length > 0) {
            const redoneOperation = redoStack.pop();
            operationStack.push(redoneOperation);
            
            // Tell all clients to redraw from scratch
            io.emit('global-redraw', operationStack);
        }
    });
    
    // Listen for a clear request
    socket.on('request-clear', () => {
        operationStack = [];
        redoStack = [];
        io.emit('global-clear');
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});