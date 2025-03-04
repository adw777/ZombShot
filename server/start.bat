@echo off

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Install dependencies if needed
pip install -r requirements.txt

:: Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause 