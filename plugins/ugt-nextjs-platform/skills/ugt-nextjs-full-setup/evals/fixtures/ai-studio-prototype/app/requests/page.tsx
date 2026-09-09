import { listRequests, type RequestStatus } from '@/services/requests';

const STATUS_COLOR: Record<RequestStatus, string> = {
  pending: '#d97706',
  approved: '#059669',
  rejected: '#dc2626',
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'รออนุมัติ',
  approved: 'อนุมัติ',
  rejected: 'ไม่อนุมัติ',
};

export default async function RequestsPage() {
  const requests = await listRequests();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">คำขอ</h1>
        <a href="/requests/new" className="btn">สร้างคำขอ</a>
      </div>
      <div className="card">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b text-slate-500">
              <th className="py-3">เลขที่</th>
              <th className="py-3">เรื่อง</th>
              <th className="py-3">ผู้ขอ</th>
              <th className="py-3">วันที่</th>
              <th className="py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-4">REQ-{String(r.id).padStart(4, '0')}</td>
                <td className="py-4">{r.title}</td>
                <td className="py-4">{r.requester}</td>
                <td className="py-4">{new Date(r.createdAt).toLocaleDateString('th-TH')}</td>
                <td className="py-4">
                  <span
                    className="rounded-full px-3 py-1 text-xs text-white"
                    style={{ background: STATUS_COLOR[r.status] }}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
