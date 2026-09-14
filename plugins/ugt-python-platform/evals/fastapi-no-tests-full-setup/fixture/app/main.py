from pathlib import Path

from fastapi import FastAPI, UploadFile

UPLOAD_DIR = Path("uploads")

app = FastAPI(title="leave-request")


@app.get("/")
def root():
    return {"service": "leave-request"}


@app.get("/requests")
def list_requests():
    return [{"id": 1, "employee": "somchai", "status": "pending"}]


@app.post("/requests/{request_id}/attachment")
async def upload_attachment(request_id: int, file: UploadFile):
    UPLOAD_DIR.mkdir(exist_ok=True)
    target = UPLOAD_DIR / f"{request_id}-{file.filename}"
    target.write_bytes(await file.read())
    return {"stored": str(target)}
