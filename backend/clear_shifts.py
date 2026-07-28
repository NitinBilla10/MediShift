import asyncio
from sqlalchemy import delete
from app.core.db import AsyncSessionLocal
from app.models.shift import Shift, ShiftRequirement, ShiftClaim
from app.models.import_report import ImportReport, ImportError

async def clear_data():
    async with AsyncSessionLocal() as db:
        print("Clearing all shift data...")
        await db.execute(delete(ImportError))
        await db.execute(delete(ImportReport))
        await db.execute(delete(ShiftClaim))
        await db.execute(delete(ShiftRequirement))
        await db.execute(delete(Shift))
        await db.commit()
        print("Done!")

if __name__ == "__main__":
    asyncio.run(clear_data())
