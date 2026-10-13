import { LEAVE_STATUS_LABEL_TH, listLeaveRequests } from '@/lib/leave-requests';

export default async function Home() {
  const requests = await listLeaveRequests();

  return (
    <main style={{ padding: 24 }}>
      <h1>คำขอลา</h1>
      {requests.length === 0 ? (
        <p>ยังไม่มีคำขอลา</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li key={request.id}>
              {request.employeeName} — {request.totalDays} วัน —{' '}
              {LEAVE_STATUS_LABEL_TH[request.status]}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
