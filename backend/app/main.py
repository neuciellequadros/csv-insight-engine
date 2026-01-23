from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.routes.analyze import router as analyze_router

app = FastAPI()

class VersionHeaderMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Build"] = "cors-test-001"
        return response

app.add_middleware(VersionHeaderMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://csvtool.netlify.app",
        "http://localhost:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"ok": True, "build": "cors-test-001"}
