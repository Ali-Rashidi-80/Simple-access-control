
content = """# Security
SECRET_KEY=supersecretkeyChangeThisInProduction
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (Commented out to use SQLite in simple deployment)
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/door_control
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=door_control
POSTGRES_HOST=db
POSTGRES_PORT=5432

# Hardware
HARDWARE_TOKEN=hardware-secret-token

# Google OAuth Configuration
GOOGLE_CLIENT_ID=752620668550-39boqvdbh8m3jibpgosnc4vvopnelesv.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://rynix.ir/auth/google/callback
GOOGLE_AUTH_URL=https://accounts.google.com/o/oauth2/v2/auth
GOOGLE_TOKEN_URL=https://oauth2.googleapis.com/token
GOOGLE_USERINFO_URL=https://www.googleapis.com/oauth2/v2/userinfo

# SMS Configuration
SMS_USERNAME=9204963846
SMS_PASSWORD=3TZ95
SMS_SENDER_NUMBER=50002710063846

# Frontend Environment Variables
VITE_WS_URL=wss://rynix.ir/ws/frontend
VITE_API_URL=https://rynix.ir

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,https://rynix.ir
"""
import os
target = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
print(f"Writing fixed .env to: {target}")
with open(target, "w", encoding="utf-8") as f:
    f.write(content)
print("Done.")
