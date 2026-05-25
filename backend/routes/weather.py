from fastapi import APIRouter

router = APIRouter(prefix="/cloud-history", tags=["weather"])


@router.get("")
def placeholder():
    return {"status": "not-implemented", "endpoint": "GET /cloud-history"}
