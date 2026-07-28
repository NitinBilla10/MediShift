from fastapi import APIRouter

from app.api.api_v1.endpoints import auth, shifts, claims, imports, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(shifts.router, prefix="/shifts", tags=["shifts"])
api_router.include_router(claims.router, prefix="/claims", tags=["claims"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
