# คำขอตั้งค่าระบบ — leave-request

| ระบบ | สิ่งที่ขอ |
| --- | --- |
| SQL Server | DB `LeaveRequest_Dev` + login `leave_app` |
| Keycloak | client `leave-request` · redirect `https://apps.example.com/leave-request-dev/api/auth/callback/keycloak` |

## ส่งกลับ

| ค่า | ใส่ที่ |
| --- | --- |
| client secret | `.env.local` `KEYCLOAK_CLIENT_SECRET` |
