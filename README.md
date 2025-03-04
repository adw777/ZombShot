# Voxel FPS Game

A spooky multiplayer first-person shooter game with voxel-based graphics, built using Three.js and FastAPI.

## Features

- Voxel-based world with destructible environments
- Fast-paced FPS gameplay with zombie enemies
- Atmospheric night-time environment with fluorescent lighting
- Spooky elements including ghost lights, twisted trees, and gravestones
- Collectible bounty gold for bonus points
- Multiplayer support for up to 20 players per room
- Real-time networking with WebSocket communication
- Modern UI with health bars, ammo counters, and kill feed
- Bot players to fill empty slots

## Game Objectives

- Survive the zombie apocalypse
- Collect bounty gold for bonus points (20 points each)
- Defeat zombies (10 points each)
- Reach 100 points to win
- Don't let your health reach zero!

## Controls

- WASD: Movement
- Mouse: Look around
- Left Click: Shoot
- Space: Jump
- Shift: Sprint
- Tab: View scoreboard
- R: Reload weapon

## Prerequisites

- Node.js 16+ and npm
- Python 3.8+
- A modern web browser with WebGL support

## Installation

### Frontend Setup

1. Install Node.js dependencies:
```bash
npm install
```

2. Create a development build:
```bash
npm run dev
```

### Backend Setup

1. Create a Python virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install Python dependencies:
```bash
cd server
pip install -r requirements.txt
```

## Running the Game

1. Start the backend server:
```bash
cd server
uvicorn main:app --reload --port 8000
```

2. Start the frontend development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Development

### Project Structure

```
voxel-fps/
├── src/
│   ├── client/
│   │   ├── core/
│   │   ├── entities/
│   │   ├── network/
│   │   ├── ui/
│   │   └── world/
│   └── server/
│       └── main.py
├── public/
├── index.html
└── package.json
```

### Building for Production

1. Build the frontend:
```bash
npm run build
```

2. Start the production server:
```bash
npm run start
```

## Contributing

1. Fork the repository
2. Create a new branch for your feature
3. Commit your changes
4. Push to your branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Three.js for 3D rendering
- FastAPI for the backend server
- Socket.IO for real-time communication 