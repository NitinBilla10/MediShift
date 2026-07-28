import asyncio
import os
import csv
from io import StringIO
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.db import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.importer.csv_parser import process_csv_import, normalize_role

STAFF_CSV = """staff_id,full_name,role,email
121,Marcus Whitfield,Doctor,marcus.whitfield@clinicmail.test
131,Anya Haddad,NURSE,anya.haddad@clinicmail.test
104,Rosa Weber,RN,rosa.weber@clinicmail.test
999,Zainab Volkov,NURSE,zainab.volkov@clinicmail.test
120,Ben Marchand,receptionist,ben.marchand@clinicmail.test
129,Dev Bell,Doctor,dev.bell@clinicmail.test
113,Tara Rahman,Registered Nurse,tara.rahman@clinicmail.test
102,Hiro Petrova,recep.,hiro.petrova@clinicmail.test
108,Aisha Weber,Nurse,aisha.weber@clinicmail.test
127,Hiro Nolan,Physician,hiro.nolan@clinicmail.test
122,Priya Weber,Doctor,priya.weber(at)clinicmail.test
133,  Karan ALI,Reception,karan.ali@clinicmail.test
126,Priya Mehta,Reception,priya.mehta@clinicmail.test
118,Omar Patel,MD,omar.patel@clinicmail.test
114,Lucia Volkov,DOCTOR ,lucia.volkov@clinicmail.test
128,Priya Patel,Nurse,priya.patel@clinicmail.test
101,Ben Ali, Nurse ,ben.ali@clinicmail.test
107,Hiro Iyer,Receptionist,hiro.iyer@clinicmail.test
103,Marcus Kapoor,receptionist,marcus.kapoor@clinicmail.test
997,Casey Morgan,Janitor,casey.morgan@clinicmail.test
103,Marcus Kapoor,receptionist,marcus.kapoor@clinicmail.test
125,Zainab Okafor,Reception,zainab.okafor@clinicmail.test
115,Fatima Petrova,RN,fatima.petrova(at)clinicmail.test
110,Felix Volkov,nurse,felix.volkov@clinicmail.test
110,Felix Volkov,nurse,felix.volkov@clinicmail.test
100,Ivy Bell,NURSE,ivy.bell@clinicmail.test
995,Robin Vale,Nurse,
130,Fatima Marchand,recep.,fatima.marchand@clinicmail.test
117,Priya Lind,RN,priya.lind@clinicmail.test
105,Zainab Volkov,NURSE,zainab.volkov@clinicmail.test
124,Rosa Patel,MD,rosa.patel@clinicmail.test
123,Anya Nakamura,receptionist,anya.nakamura@clinicmail.test
109,Lucia Nakamura,Reception,lucia.nakamura@clinicmail.test
112,Yusuf Patel,RN,yusuf.patel@clinicmail.test
998,J. Placeholder,Nurse,hiro.iyer@clinicmail.test
119,Noah Ali,Registered Nurse,noah.ali@clinicmail.test
106,Aisha Sharma,nurse,aisha.sharma@clinicmail.test
996,,Doctor,noname@clinicmail.test
111,Chloe Hussain,Physician,chloe.hussain@clinicmail.test
132,Omar Haddad,RN,omar.haddad@clinicmail.test
116,Tara Rossi,NURSE,tara.rossi@clinicmail.test"""

SHIFT_CSV = """shift_id,date,start_time,end_time,requirements
5096,2026-08-28,09:00,17:00,nurses=3;doctors=0;receptionists=0
5053,2026-08-17,08:00,16:00,nurses=3;doctors=1;receptionists=1
5010,05/08/2026,09:00,17:00,nurses=1;doctors=0;receptionists=1
5103,2026-08-29,22:00,06:00,nurses=3;doctors=2;receptionists=1
5101,29/08/2026,09:00,17:00,nurses=3;doctors=1;receptionists=1
5065,20/08/2026,08:00,16:00,nurses=2;doctors=1;receptionists=0
5110,2026-02-30,08:00,16:00,nurses=1
5017,2026-08-07,09:00,17:00,nurses=3;doctors=2;receptionists=1
5109,2026-08-12,15:00,09:00,nurses=2;doctors=1
5078,23/08/2026,16:00,00:00,nurses=2;doctors=2;receptionists=0
5105,2026-08-30,14:00,22:00,nurses=2;doctors=2;receptionists=1
5115,2026-08-21,08:00,10:00+1,nurses=2
5050,2026-08-16,22:00,06:00,nurses=2;doctors=1;receptionists=1
5020,2026-08-08,22:00,06:00,nurses=1;doctors=0;receptionists=0
5097,2026-08-28,16:00,00:00,nurses=3;doctors=1;receptionists=0
5002,2026-08-03,22:00,06:00,nurses=2;doctors=0;receptionists=0
5008,2026-08-05,07:30,15:30,nurses=1;doctors=0;receptionists=1
5087,25/08/2026,16:00,00:00,nurses=2;doctors=1;receptionists=1
5063,19/08/2026,07:30,15:30,nurses=3;doctors=1;receptionists=0
5102,29/08/2026,08:00,16:00,nurses=2;doctors=1;receptionists=0
5073,2026-08-22,14:00,22:00,nurses=3;doctors=1;receptionists=0
5071,21/08/2026,09:00,17:00,nurses=3;doctors=1;receptionists=1
5072,22/08/2026,16:00,00:00,nurses=2;doctors=1;receptionists=0
5098,2026-08-28,14:00,22:00,nurses=1;doctors=1;receptionists=1
5111,09/08/2026,10:00,18:00,nurses=2
5013,2026-08-06,08:00,16:00,nurses=2;doctors=2;receptionists=0
5099,2026-08-28,14:00,22:00,nurses=3;doctors=1;receptionists=0
5085,2026-08-25,07:30,15:30,nurses=2;doctors=0;receptionists=0
5043,2026-08-14,14:00,22:00,nurses=2;doctors=2;receptionists=0
5033,2026-08-11,09:00,17:00,nurses=2;doctors=2;receptionists=1
5082,24/08/2026,09:00,17:00,nurses=2;doctors=2;receptionists=0
5020,2026-08-08,22:00,06:00,nurses=1;doctors=0;receptionists=0
5077,2026-08-23,14:00,22:00,nurses=3;doctors=1;receptionists=1
5014,2026-08-06,22:00,06:00,nurses=1;doctors=0;receptionists=0
5026,2026-08-09,08:00,16:00,nurses=1;doctors=1;receptionists=0
5049,2026-08-16,14:00,22:00,nurses=1;doctors=2;receptionists=1
5090,2026-08-26,07:30,15:30,nurses=1;doctors=0;receptionists=0
5081,2026-08-24,16:00,00:00,nurses=2;doctors=0;receptionists=1
5019,2026-08-08,08:00,16:00,nurses=3;doctors=1;receptionists=0
5106,30/08/2026,22:00,06:00,nurses=1;doctors=0;receptionists=0
5041,08-13-2026,16:00,00:00,nurses=3;doctors=2;receptionists=0
5009,2026-08-05,16:00,00:00,nurses=2;doctors=2;receptionists=0
5052,2026-08-17,16:00,00:00,nurses=1;doctors=2;receptionists=0
5091,2026-08-26,16:00,00:00,nurses=3;doctors=0;receptionists=0
5059,2026-08-18,22:00,06:00,nurses=3;doctors=2;receptionists=1
5048,2026-08-16,09:00,17:00,nurses=3;doctors=1;receptionists=0
5113,2026-08-18,08:00,16:00,two nurses and a doctor
5025,2026-08-09,16:00,00:00,nurses=1;doctors=2;receptionists=1
5004,2026-08-04,08:00,16:00,nurses=1;doctors=2;receptionists=0
5007,05/08/2026,22:00,06:00,nurses=2;doctors=0;receptionists=1
5056,2026-08-17,07:30,15:30,nurses=2;doctors=2;receptionists=1
5064,2026-08-20,08:00,16:00,nurses=1;doctors=0;receptionists=1
5003,2026-08-04,08:00,16:00,nurses=3;doctors=2;receptionists=0
5011,2026-08-05,08:00,16:00,nurses=1;doctors=0;receptionists=0
5021,08-08-2026,09:00,17:00,nurses=1;doctors=1;receptionists=0
5028,2026-08-10,07:30,15:30,nurses=2;doctors=1;receptionists=0
5057,2026-08-18,22:00,06:00,nurses=3;doctors=1;receptionists=1
5030,2026-08-11,14:00,22:00,nurses=3;doctors=0;receptionists=0
5018,07/08/2026,14:00,22:00,nurses=1;doctors=0;receptionists=0
5079,08-23-2026,22:00,06:00,nurses=2;doctors=1;receptionists=0
5000,03/08/2026,22:00,06:00,nurses=3;doctors=2;receptionists=0
5055,2026-08-17,14:00,22:00,nurses=2;doctors=2;receptionists=1
5066,2026-08-20,16:00,00:00,nurses=2;doctors=1;receptionists=0
5062,2026-08-19,09:00,17:00,nurses=3;doctors=2;receptionists=1
5069,2026-08-21,08:00,16:00,nurses=2;doctors=0;receptionists=1
5080,2026-08-23,14:00,22:00,nurses=2;doctors=1;receptionists=0
5006,04/08/2026,16:00,00:00,nurses=1;doctors=2;receptionists=0
5005,2026-08-04,08:00,16:00,nurses=2;doctors=0;receptionists=0
5083,08-24-2026,07:30,15:30,nurses=3;doctors=2;receptionists=0
5016,2026-08-07,08:00,16:00,nurses=2;doctors=1;receptionists=1
5100,2026-08-29,22:00,06:00,nurses=3;doctors=1;receptionists=1
5001,2026-08-03,16:00,00:00,nurses=3;doctors=2;receptionists=1
5038,2026-08-13,22:00,06:00,nurses=3;doctors=0;receptionists=1
5022,2026-08-09,07:30,15:30,nurses=3;doctors=2;receptionists=0
5046,2026-08-15,07:30,15:30,nurses=1;doctors=0;receptionists=0
5104,2026-08-29,16:00,00:00,nurses=2;doctors=0;receptionists=1
5037,2026-08-12,08:00,16:00,nurses=1;doctors=2;receptionists=0
5086,2026-08-25,14:00,22:00,nurses=1;doctors=1;receptionists=1
5012,2026-08-06,16:00,00:00,nurses=1;doctors=1;receptionists=1
5036,2026-08-12,16:00,00:00,nurses=3;doctors=2;receptionists=1
5076,2026-08-22,16:00,00:00,nurses=3;doctors=0;receptionists=0
5107,2026-08-30,16:00,00:00,nurses=3;doctors=0;receptionists=1
5075,2026-08-22,14:00,22:00,nurses=3;doctors=0;receptionists=0
5035,2026-08-12,08:00,16:00,nurses=2;doctors=0;receptionists=1
5061,2026-08-19,09:00,17:00,nurses=1;doctors=2;receptionists=0
5027,10/08/2026,22:00,06:00,nurses=2;doctors=0;receptionists=1
5093,08-27-2026,14:00,22:00,nurses=1;doctors=2;receptionists=0
5023,08-09-2026,16:00,00:00,nurses=3;doctors=2;receptionists=1
5114,2026-08-20,,16:00,nurses=1;doctors=1
5068,2026-08-21,09:00,17:00,nurses=3;doctors=1;receptionists=0
5094,08-27-2026,22:00,06:00,nurses=3;doctors=1;receptionists=1
5040,13/08/2026,07:30,15:30,nurses=3;doctors=0;receptionists=1
5024,2026-08-09,07:30,15:30,nurses=3;doctors=2;receptionists=1
5092,26/08/2026,14:00,22:00,nurses=2;doctors=0;receptionists=0
5015,2026-08-07,16:00,00:00,nurses=1;doctors=1;receptionists=0
5029,2026-08-10,22:00,06:00,nurses=3;doctors=1;receptionists=0
5032,2026-08-11,22:00,06:00,nurses=1;doctors=2;receptionists=1
5112,2026-08-15,12:00,12:00,doctors=1
5034,11/08/2026,08:00,16:00,nurses=1;doctors=2;receptionists=1
5058,2026-08-18,08:00,16:00,nurses=2;doctors=1;receptionists=0
5089,26/08/2026,07:30,15:30,nurses=3;doctors=0;receptionists=0
5045,15/08/2026,07:30,15:30,nurses=2;doctors=1;receptionists=1
5042,2026-08-14,07:30,15:30,nurses=1;doctors=1;receptionists=0
5108,2026-08-30,16:00,00:00,nurses=2;doctors=0;receptionists=0
5095,2026-08-27,07:30,15:30,nurses=1;doctors=2;receptionists=0
5054,2026-08-17,08:00,16:00,nurses=3;doctors=1;receptionists=1
5044,14/08/2026,09:00,17:00,nurses=1;doctors=1;receptionists=0
5067,2026-08-21,08:00,16:00,nurses=1;doctors=1;receptionists=0
5070,2026-08-21,22:00,06:00,nurses=3;doctors=1;receptionists=1
5060,19/08/2026,09:00,17:00,nurses=1;doctors=2;receptionists=1
5047,2026-08-15,14:00,22:00,nurses=1;doctors=1;receptionists=1
5074,2026-08-22,08:00,16:00,nurses=3;doctors=1;receptionists=0
5084,2026-08-24,22:00,06:00,nurses=3;doctors=2;receptionists=0
5039,2026-08-13,14:00,22:00,nurses=2;doctors=0;receptionists=1
5031,2026-08-11,08:00,16:00,nurses=3;doctors=2;receptionists=0
5088,08-25-2026,16:00,00:00,nurses=1;doctors=2;receptionists=0
5051,2026-08-16,22:00,06:00,nurses=1;doctors=1;receptionists=0"""

async def seed_data():
    async with AsyncSessionLocal() as db:
        # Check if users already exist
        from sqlalchemy import select, delete
        
        # Clear out existing data for fresh seed
        from app.models.import_report import ImportError, ImportReport
        from app.models.shift import ShiftClaim, ShiftRequirement, Shift
        
        # In a real app we might not want to truncate, but here it's safe for seeding.
        # Actually, let's just delete everything to be safe
        await db.execute(delete(ImportError))
        await db.execute(delete(ImportReport))
        await db.execute(delete(ShiftClaim))
        await db.execute(delete(ShiftRequirement))
        await db.execute(delete(Shift))
        await db.execute(delete(User))
        await db.commit()

        print("Seeding Users from CSV...")
        manager = User(
            email="manager@clinic.com",
            name="Alice Manager",
            password_hash=get_password_hash("password123"),
            role=UserRole.manager
        )
        db.add(manager)
        await db.flush()

        staff1 = User(
            email="staff1@clinic.com",
            name="Bob Staff",
            profession="nurse",
            password_hash=get_password_hash("password123"),
            role=UserRole.staff
        )
        db.add(staff1)
        
        from app.importer.csv_parser import process_staff_csv_import
        print("Seeding Staff via CSV Import...")
        staff_report = await process_staff_csv_import(db, STAFF_CSV, manager.id)
        print(f"Staff Import Report: Accepted {staff_report.accepted_count}, Merged {staff_report.merged_count}, Rejected {staff_report.rejected_count}")
            
        await db.commit()
        await db.refresh(manager)

        print("Seeding Shifts via CSV Import...")
        report = await process_csv_import(db, SHIFT_CSV, manager.id)
        
        print(f"Import Report: Accepted {report.accepted_count}, Merged {report.merged_count}, Rejected {report.rejected_count}")
        for err in report.errors:
            print(f"  - Row {err.row_number}: {err.problem} -> {err.action_taken}")
            
        print("Seed completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
