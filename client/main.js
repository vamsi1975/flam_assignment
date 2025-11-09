document.addEventListener('DOMContentLoaded', () => {
    // Initialize the canvas
    const canvas = new DrawingCanvas('drawing-canvas');

    // Initialize the WebSocket client
    const ws = new WebSocketClient(canvas);

    // Get tool elements
    const colorPicker = document.getElementById('color');
    const strokeWidthSlider = document.getElementById('strokeWidth');
    const lineStyleSelector = document.getElementById('lineStyle');
    const toolButtons = document.querySelectorAll('.tool-btn');

    // Get control groups
    const colorControl = document.getElementById('color-control');
    const widthControl = document.getElementById('width-control');
    const styleControl = document.getElementById('style-control');

    // Add event listeners for tools
    colorPicker.addEventListener('change', (e) => {
        canvas.setStrokeColor(e.target.value);
    });

    strokeWidthSlider.addEventListener('input', (e) => {
        canvas.setStrokeWidth(e.target.value);
    });

    lineStyleSelector.addEventListener('change', (e) => {
        canvas.setLineStyle(e.target.value);
    });

    // Tool selection logic
    toolButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Set active button
            toolButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tool = btn.id.split('-')[1]; // e.g., 'brush', 'rect', 'eraser'
            canvas.setTool(tool);

            // NEW: Update toolbar visibility
            updateToolbar(tool);
        });
    });

    // NEW: Function to update toolbar based on active tool
    function updateToolbar(tool) {
        if (tool === 'brush') {
            colorControl.classList.remove('hidden');
            widthControl.classList.remove('hidden');
            styleControl.classList.add('hidden');
        } else if (tool === 'rect' || tool === 'circle' || tool === 'line') {
            colorControl.classList.remove('hidden');
            widthControl.classList.remove('hidden');
            styleControl.classList.remove('hidden');
        } else if (tool === 'eraser') {
            colorControl.classList.add('hidden'); // Eraser has fixed color
            widthControl.classList.remove('hidden'); // Eraser uses width
            styleControl.classList.add('hidden');
        } else if (tool === 'fill') {
            colorControl.classList.remove('hidden'); // Fill uses color
            widthControl.classList.add('hidden');
            styleControl.classList.add('hidden');
        }
    }

    // Set initial toolbar state
    updateToolbar('brush');
});