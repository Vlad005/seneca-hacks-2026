from fastapi import APIRouter

router = APIRouter(prefix="/pv-analysis", tags=["solar"])


@router.get("")
def placeholder():
    return {"status": "not-implemented", "endpoint": "POST /pv-analysis"}
