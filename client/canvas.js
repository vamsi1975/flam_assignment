class DrawingCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        // Added { willReadFrequently: true } for the flood fill tool
        this.context = this.canvas.getContext('2d', { willReadFrequently: true }); 

        // Sync canvas resolution to its CSS size
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        this.drawing = false;
        this.startX = 0;
        this.startY = 0;
        this.snapshot = null;

        // Tool State
        this.currentTool = 'brush';
        this.originalStrokeColor = '#000000';
        this.lineStyle = 'solid';

        // Tool settings
        this.strokeColor = '#000000';
        this.strokeWidth = 5;

        // Buffer
        this.currentStroke = [];
        
        // Callbacks
        this.onDraw = null;
        this.onStop = null;

        // Bind event listeners
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', (e) => this.stopDrawing(e));
        this.canvas.addEventListener('mouseout', (e) => this.stopDrawing(e));
    }

    // --- HELPER FUNCTIONS FOR FLOOD FILL ---

    hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex[1] + hex[2], 16);
            g = parseInt(hex[3] + hex[4], 16);
            b = parseInt(hex[5] + hex[6], 16);
        }
        return { r, g, b };
    }

    getPixel(imageData, x, y) {
        const index = (y * imageData.width + x) * 4;
        return [
            imageData.data[index],
            imageData.data[index + 1],
            imageData.data[index + 2],
            imageData.data[index + 3]
        ];
    }

    setPixel(imageData, x, y, color) { // color is {r, g, b}
        const index = (y * imageData.width + x) * 4;
        imageData.data[index] = color.r;
        imageData.data[index + 1] = color.g;
        imageData.data[index + 2] = color.b;
        imageData.data[index + 3] = 255;
    }

    colorsMatch(c1, c2) {
        return c1[0] === c2[0] && c1[1] === c2[1] && c1[2] === c2[2] && c1[3] === c2[3];
    }

    floodFill(startX, startY, fillColorHex) {
        const fillColor = this.hexToRgb(fillColorHex);
        const imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        const startXInt = Math.floor(startX);
        const startYInt = Math.floor(startY);
        
        const targetColor = this.getPixel(imageData, startXInt, startYInt);
        const fillColorRgb = [fillColor.r, fillColor.g, fillColor.b, 255];

        if (this.colorsMatch(targetColor, fillColorRgb)) {
            return; 
        }

        const queue = [[startXInt, startYInt]];
        const visited = new Set();
        visited.add(`${startXInt},${startYInt}`);

        while (queue.length > 0) {
            const [x, y] = queue.shift();

            if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) {
                continue;
            }

            const pixelColor = this.getPixel(imageData, x, y);

            if (this.colorsMatch(pixelColor, targetColor)) {
                this.setPixel(imageData, x, y, fillColor);

                const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
                for (const [nx, ny] of neighbors) {
                    const key = `${nx},${ny}`;
                    if (!visited.has(key) && nx >= 0 && nx < imageData.width && ny >= 0 && ny < imageData.height) {
                        queue.push([nx, ny]);
                        visited.add(key);
                    }
                }
            }
        }
        this.context.putImageData(imageData, 0, 0);
    }

    getDashArray(style) {
        if (style === 'dashed') return [10, 5];
        if (style === 'dotted') return [2, 4];
        return [];
    }

    startDrawing(e) {
        if (this.currentTool === 'fill') {
            const operation = {
                type: 'fill',
                x: e.offsetX,
                y: e.offsetY,
                color: this.strokeColor
            };
            this.drawOperation(operation);
            if (this.onStop) {
                this.onStop(operation);
            }
            return;
        }
        
        this.drawing = true;
        this.startX = e.offsetX;
        this.startY = e.offsetY;
        
        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.lastX = e.offsetX;
            this.lastY = e.offsetY;
            
            this.currentStroke = [{
                x: e.offsetX,
                y: e.offsetY,
                color: this.strokeColor,
                width: this.strokeWidth
            }];
        } else {
            this.snapshot = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    draw(e) {
        if (!this.drawing) return;

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            this.drawSegment(this.lastX, this.lastY, e.offsetX, e.offsetY, this.strokeColor, this.strokeWidth, 'solid');
            const point = {
                x: e.offsetX,
                y: e.offsetY,
                color: this.strokeColor,
                width: this.strokeWidth
            };
            this.currentStroke.push(point);
            const strokeData = {
                startX: this.lastX,
                startY: this.lastY,
                endX: e.offsetX,
                endY: e.offsetY,
                color: this.strokeColor,
                width: this.strokeWidth
            };
            if (this.onDraw) {
                this.onDraw(strokeData);
            }
            [this.lastX, this.lastY] = [e.offsetX, e.offsetY];
            
        } else if (this.snapshot) {
            this.context.putImageData(this.snapshot, 0, 0);
            
            const previewOp = {
                color: this.strokeColor,
                strokeWidth: this.strokeWidth,
                lineStyle: this.lineStyle
            };
            
            if (this.currentTool === 'rect') {
                previewOp.x = this.startX;
                previewOp.y = this.startY;
                previewOp.width = e.offsetX - this.startX;
                previewOp.height = e.offsetY - this.startY;
                this.drawRectangle(previewOp);
            } else if (this.currentTool === 'circle') {
                previewOp.x = this.startX;
                previewOp.y = this.startY;
                previewOp.radius = Math.sqrt(Math.pow(e.offsetX - this.startX, 2) + Math.pow(e.offsetY - this.startY, 2));
                this.drawCircle(previewOp);
            } else if (this.currentTool === 'line') {
                this.drawSegment(this.startX, this.startY, e.offsetX, e.offsetY, this.strokeColor, this.strokeWidth, this.lineStyle);
            }
        }
    }

    stopDrawing(e) {
        if (!this.drawing) return;
        this.drawing = false;

        if (this.snapshot) {
            this.context.putImageData(this.snapshot, 0, 0);
            this.snapshot = null;
        }

        let operation = null;
        const endX = e.offsetX;
        const endY = e.offsetY;

        if (this.currentTool === 'brush' || this.currentTool === 'eraser') {
            if (this.currentStroke.length > 1) {
                operation = { type: this.currentTool, points: this.currentStroke };
            }
            this.currentStroke = [];
        } else if (this.currentTool === 'rect') {
            operation = {
                type: 'rect', x: this.startX, y: this.startY,
                width: endX - this.startX, height: endY - this.startY,
                color: this.strokeColor, strokeWidth: this.strokeWidth,
                lineStyle: this.lineStyle
            };
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(Math.pow(endX - this.startX, 2) + Math.pow(endY - this.startY, 2));
            operation = {
                type: 'circle', x: this.startX, y: this.startY, radius: radius,
                color: this.strokeColor, strokeWidth: this.strokeWidth,
                lineStyle: this.lineStyle
            };
        } else if (this.currentTool === 'line') {
            operation = {
                type: 'line', startX: this.startX, startY: this.startY,
                endX: endX, endY: endY,
                color: this.strokeColor, strokeWidth: this.strokeWidth,
                lineStyle: this.lineStyle
            };
        }

        if (operation) {
            this.drawOperation(operation);
            // THIS IS WHERE THE ERROR WAS. IT IS NOW FIXED.
            if (this.onStop) {
                this.onStop(operation);
            }
        }
    }
    
    // --- Methods for WebSocket events ---

    drawRemoteStroke(data) {
        this.drawSegment(data.startX, data.startY, data.endX, data.endY, data.color, data.width, 'solid');
    }
    
    drawOperation(operation) {
        if (Array.isArray(operation)) {
            this.drawBrushStroke(operation);
            return;
        }

        if (operation.type === 'brush' || operation.type === 'eraser') {
            this.drawBrushStroke(operation.points);
        } else if (operation.type === 'rect') {
            this.drawRectangle(operation);
        } else if (operation.type === 'circle') {
            this.drawCircle(operation);
        } else if (operation.type === 'line') {
            this.drawSegment(operation.startX, operation.startY, operation.endX, operation.endY, operation.color, operation.strokeWidth, operation.lineStyle);
        } else if (operation.type === 'fill') {
            this.floodFill(operation.x, operation.y, operation.color);
        }
    }
    
    // --- Helper Drawing Functions ---

    drawBrushStroke(points) {
        if (!points || points.length < 2) return;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            this.drawSegment(p1.x, p1.y, p2.x, p2.y, p2.color, p2.width, 'solid');
        }
    }

    drawRectangle(op) {
        this.context.strokeStyle = op.color;
        this.context.lineWidth = op.strokeWidth;
        this.context.setLineDash(this.getDashArray(op.lineStyle)); 
        
        this.context.beginPath();
        this.context.rect(op.x, op.y, op.width, op.height);
        this.context.stroke();
        
        this.context.setLineDash([]); 
    }

    drawCircle(op) {
        this.context.strokeStyle = op.color;
        this.context.lineWidth = op.strokeWidth;
        this.context.setLineDash(this.getDashArray(op.lineStyle));
        
        this.context.beginPath();
        this.context.arc(op.x, op.y, op.radius, 0, 2 * Math.PI);
        this.context.stroke();
        
        this.context.setLineDash([]);
    }

Initial
    redrawAll(operations) {
        this.clearCanvas();
        operations.forEach(op => this.drawOperation(op));
    }

    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    drawSegment(startX, startY, endX, endY, color, width, lineStyle = 'solid') {
        this.context.strokeStyle = color;
        this.context.lineWidth = width;
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.setLineDash(this.getDashArray(lineStyle));

        this.context.beginPath();
        this.context.moveTo(startX, startY);
        this.context.lineTo(endX, endY);
        this.context.stroke();
        
        this.context.setLineDash([]);
    }
    
    // --- Tool Setters ---
    
    setTool(tool) {
        this.currentTool = tool;
        if (tool === 'eraser') {
            this.strokeColor = '#FFFFFF'; // White background
        } else {
            this.strokeColor = this.originalStrokeColor;
        }
    }

    setStrokeColor(color) {
        this.originalStrokeColor = color;
        if (this.currentTool !== 'eraser') {
            this.strokeColor = color;
        }
    }

    setStrokeWidth(width) {
        this.strokeWidth = width;
    }
    
    setLineStyle(style) {
        this.lineStyle = style;
    }
}