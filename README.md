# Real-Time Collaborative Canvas

This is a multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization.

## Features
* Real-time drawing visible to all users.
* Shared "Global" Undo/Redo stack.
* Color and stroke width selection.
* Clear canvas functionality.

## Setup & Running

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/vamsi1975/flam_assignment.git
    cd collaborative-canvas
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the server:**
    ```bash
    npm start
    ```

4.  **Test the application:**
    * Open `http://localhost:3000` in your browser.
    * To test with multiple users, open `http://localhost:3000` in a second browser window (or an incognito window).
    * Drawing in one window should appear in the other.
    * Clicking "Undo" in one window will undo the *last action* (even if it was from another user) and sync all clients.

## Known Limitations
* User cursors are not implemented.
* There is no room system; all users are in one global canvas.
* No user authentication or user name indicators.

## Time Spent
* [Estimate your time here, e.g., "Approximately 8-10 hours"]
