from fastapi import APIRouter

router = APIRouter(prefix="/connection-check", tags=["grid"])


@router.get("")
def placeholder():
    return {"status": "not-implemented", "endpoint": "GET /connection-check"}
