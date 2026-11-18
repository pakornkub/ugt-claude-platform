-- RENDER RULES (delete every line from here through END RENDER RULES in the rendered file):
-- - Rendered together with docs/admin-handoff.md (SKILL.md §4.6), only when the project has [DB].
-- - Substitute every __...__ (SKILL.md §4.2). `grep -n "__[A-Z]" docs/admin-db-setup*.sql` must find nothing.
-- - Interview Q4b — prod and dev on ONE SQL Server → render once to docs/admin-db-setup.sql keeping [PROD] and [DEV].
--   Separate servers → render twice: docs/admin-db-setup-prod.sql keeps [PROD] only,
--   docs/admin-db-setup-dev.sql keeps [DEV] only (so dbcreator lands on the dev server only).
-- - Interview Q4c — keep [OWNER] (db_owner) or [RWX] (db_datareader + db_datawriter + db_ddladmin + GRANT EXECUTE), never both.
-- - A line ending in `-- [X]` belongs to X. A line that is only `-- [X]` heads a batch that runs through its GO.
--   Kept → strip the tag (and the trailing spaces before it). Not kept → delete the line / the whole batch.
-- - LoginName = the name from Q4a, or "" when unknown. LoginPassword stays "" ALWAYS — the DBA types it at run time;
--   a password in this file is a leaked secret in git (verify.mjs fails on it).
-- END RENDER RULES
/* =============================================================================
   __PROJECT_DISPLAY_NAME__ (__PROJECT_NAME__) — สร้าง Database + Login  (admin-handoff.md ตาราง A)

   รันที่: __TARGET_SERVER__ · ครั้งเดียว · รันซ้ำได้ (ของที่มีอยู่แล้วจะข้าม ไม่เปลี่ยนรหัสผ่าน login เดิม)

   วิธีรัน (SSMS):
     1. เปิดไฟล์นี้ → เมนู Query → SQLCMD Mode (ต้องเปิด ไม่งั้น :setvar error)
     2. กรอก 2 บรรทัด :setvar ด้านล่าง → F5
     3. ผลตรวจท้ายแต่ละ database ต้องเป็น 1 ทุกคอลัมน์
     4. ปิดไฟล์โดยไม่ save — รหัสผ่านห้ามอยู่ในไฟล์ / ห้าม commit
   sqlcmd: :setvar ในไฟล์ชนะค่า -v เสมอ → ใช้ copy นอก repo ที่กรอก :setvar แล้ว
           sqlcmd -S <host> -E -i <copy>.sql  แล้วลบ copy ทิ้ง

   ไม่ต้องสร้างตาราง — pipeline รัน migration ตอน deploy
   ============================================================================= */

:setvar LoginName "__LOGIN_NAME__"
:setvar LoginPassword ""
-- รหัสผ่านห้ามมีเครื่องหมาย ' (single quote)
:on error exit

IF N'$(LoginName)' = N'' OR N'$(LoginPassword)' = N''
    RAISERROR(N'กรอก :setvar LoginName และ LoginPassword ก่อนรัน', 16, 1);
GO

USE master;
GO

-- [PROD]
IF DB_ID(N'__DB_NAME_PROD__') IS NULL
    CREATE DATABASE [__DB_NAME_PROD__] COLLATE Thai_CI_AS;
GO

-- [DEV]
IF DB_ID(N'__DB_NAME_DEV__') IS NULL
    CREATE DATABASE [__DB_NAME_DEV__] COLLATE Thai_CI_AS;
GO

IF SUSER_ID(N'$(LoginName)') IS NULL
    CREATE LOGIN [$(LoginName)]
        WITH PASSWORD = N'$(LoginPassword)',
             CHECK_POLICY = ON,
             CHECK_EXPIRATION = OFF; -- login ของแอป: รหัสหมดอายุ = ระบบล่ม
GO

-- [DEV]
-- dbcreator: Prisma `migrate dev` สร้าง/ลบ shadow database ชั่วคราวเอง (ไม่ต้องสร้าง shadow database ไว้)
IF IS_SRVROLEMEMBER(N'dbcreator', N'$(LoginName)') = 0
    ALTER SERVER ROLE [dbcreator] ADD MEMBER [$(LoginName)];
SELECT N'$(LoginName)' AS [Login], IS_SRVROLEMEMBER(N'dbcreator', N'$(LoginName)') AS [dbcreator];
GO

-- [PROD]
USE [__DB_NAME_PROD__];
IF USER_ID(N'$(LoginName)') IS NULL
    CREATE USER [$(LoginName)] FOR LOGIN [$(LoginName)];
ALTER ROLE [db_owner] ADD MEMBER [$(LoginName)];  -- [OWNER]
ALTER ROLE [db_datareader] ADD MEMBER [$(LoginName)];  -- [RWX]
ALTER ROLE [db_datawriter] ADD MEMBER [$(LoginName)];  -- [RWX]
ALTER ROLE [db_ddladmin] ADD MEMBER [$(LoginName)];  -- [RWX]
GRANT EXECUTE TO [$(LoginName)];  -- [RWX]
SELECT DB_NAME() AS [Database]
     , IS_ROLEMEMBER(N'db_owner', N'$(LoginName)') AS [db_owner]  -- [OWNER]
     , IS_ROLEMEMBER(N'db_datareader', N'$(LoginName)') AS [db_datareader]  -- [RWX]
     , IS_ROLEMEMBER(N'db_datawriter', N'$(LoginName)') AS [db_datawriter]  -- [RWX]
     , IS_ROLEMEMBER(N'db_ddladmin', N'$(LoginName)') AS [db_ddladmin]  -- [RWX]
     , (SELECT COUNT(*) FROM sys.database_permissions WHERE grantee_principal_id = USER_ID(N'$(LoginName)') AND class = 0 AND permission_name = N'EXECUTE' AND state = N'G') AS [EXECUTE]  -- [RWX]
;
GO

-- [DEV]
USE [__DB_NAME_DEV__];
IF USER_ID(N'$(LoginName)') IS NULL
    CREATE USER [$(LoginName)] FOR LOGIN [$(LoginName)];
ALTER ROLE [db_owner] ADD MEMBER [$(LoginName)];  -- [OWNER]
ALTER ROLE [db_datareader] ADD MEMBER [$(LoginName)];  -- [RWX]
ALTER ROLE [db_datawriter] ADD MEMBER [$(LoginName)];  -- [RWX]
ALTER ROLE [db_ddladmin] ADD MEMBER [$(LoginName)];  -- [RWX]
GRANT EXECUTE TO [$(LoginName)];  -- [RWX]
SELECT DB_NAME() AS [Database]
     , IS_ROLEMEMBER(N'db_owner', N'$(LoginName)') AS [db_owner]  -- [OWNER]
     , IS_ROLEMEMBER(N'db_datareader', N'$(LoginName)') AS [db_datareader]  -- [RWX]
     , IS_ROLEMEMBER(N'db_datawriter', N'$(LoginName)') AS [db_datawriter]  -- [RWX]
     , IS_ROLEMEMBER(N'db_ddladmin', N'$(LoginName)') AS [db_ddladmin]  -- [RWX]
     , (SELECT COUNT(*) FROM sys.database_permissions WHERE grantee_principal_id = USER_ID(N'$(LoginName)') AND class = 0 AND permission_name = N'EXECUTE' AND state = N'G') AS [EXECUTE]  -- [RWX]
;
GO
