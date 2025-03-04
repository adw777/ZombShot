from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio
from dataclasses import dataclass, asdict
import random
from datetime import datetime

# Create Socket.IO server with proper CORS configuration
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['http://localhost:3000'],  # Allow frontend origin
    logger=True,
    engineio_logger=True
)

# Create FastAPI app
app = FastAPI()

# Create ASGIApp for Socket.IO
socket_app = socketio.ASGIApp(
    socketio_server=sio,
    other_asgi_app=app,
    socketio_path='socket.io'
)

# Enable CORS for HTTP endpoints
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Match Socket.IO CORS setting
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@dataclass
class PlayerState:
    id: str
    position: dict
    rotation: dict
    health: int
    weapon: str
    score: int
    last_update: float

@dataclass
class GameRoom:
    id: str
    players: dict
    max_players: int
    game_state: dict

# Store active game rooms
rooms = {}

def create_room() -> GameRoom:
    """Create a new game room with a unique ID."""
    room_id = str(random.randint(1000, 9999))
    while room_id in rooms:
        room_id = str(random.randint(1000, 9999))
    
    return GameRoom(
        id=room_id,
        players={},
        max_players=5,
        game_state={"status": "waiting", "start_time": None}
    )

@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")
    await sio.emit('connection_established', {'sid': sid})

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    # Find and remove player from their room
    for room in rooms.values():
        if sid in room.players:
            del room.players[sid]
            # Notify other players
            await sio.emit('player_leave', {'player_id': sid}, room=room.id)
            break

@sio.event
async def join_room(sid, data):
    room_id = data.get('room_id', '1234')  # Default room if none specified
    
    if room_id not in rooms:
        rooms[room_id] = create_room()
    
    room = rooms[room_id]
    
    if len(room.players) >= room.max_players:
        await sio.emit('room_full', room=sid)
        return
    
    # Add player to room
    room.players[sid] = PlayerState(
        id=sid,
        position={"x": 0, "y": 2, "z": 0},
        rotation={"x": 0, "y": 0, "z": 0},
        health=100,
        weapon="rifle",
        score=0,
        last_update=datetime.now().timestamp()
    )
    
    await sio.enter_room(sid, room_id)
    
    # Send initial game state
    await sio.emit('game_state', {
        'room_id': room_id,
        'player_id': sid,
        'players': {pid: asdict(p) for pid, p in room.players.items()},
        'game_state': room.game_state
    }, room=sid)
    
    # Notify other players
    await sio.emit('player_join', {
        'player': asdict(room.players[sid])
    }, room=room_id, skip_sid=sid)

@sio.event
async def player_update(sid, data):
    # Find player's room
    for room in rooms.values():
        if sid in room.players:
            player = room.players[sid]
            player.position = data['position']
            player.rotation = data['rotation']
            player.health = data['health']
            player.last_update = datetime.now().timestamp()
            
            # Broadcast update to other players
            await sio.emit('player_state', {
                'player': asdict(player)
            }, room=room.id, skip_sid=sid)
            break

@sio.event
async def player_shot(sid, data):
    target_id = data['target_id']
    damage = data['damage']
    
    # Find player's room
    for room in rooms.values():
        if sid in room.players and target_id in room.players:
            target = room.players[target_id]
            target.health = max(0, target.health - damage)
            
            # Broadcast damage
            await sio.emit('player_damage', {
                'target_id': target_id,
                'source_id': sid,
                'damage': damage,
                'health': target.health
            }, room=room.id)
            
            # Handle player death
            if target.health <= 0:
                room.players[sid].score += 1
                await sio.emit('player_kill', {
                    'killer_id': sid,
                    'victim_id': target_id
                }, room=room.id)
                
                # Respawn player
                target.health = 100
                target.position = {
                    'x': random.uniform(-10, 10),
                    'y': 2,
                    'z': random.uniform(-10, 10)
                }
            break

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy", "rooms": len(rooms)} 