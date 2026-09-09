import { listRequests } from '@/services/requests';

export default async function DashboardPage() {
  const requests = await listRequests();
  const pending = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">แดชบอร์ด</h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="card">
          <div className="text-sm text-slate-500">คำขอทั้งหมด</div>
          <div className="text-4xl font-semibold text-brand">{requests.length}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">รออนุมัติ</div>
          <div className="text-4xl font-semibold" style={{ color: '#d97706' }}>{pending}</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">อนุมัติแล้ว</div>
          <div className="text-4xl font-semibold" style={{ color: '#059669' }}>{approved}</div>
        </div>
      </div>
    </div>
  );
}
