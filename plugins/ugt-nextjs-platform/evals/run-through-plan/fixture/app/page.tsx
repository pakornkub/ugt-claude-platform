const REQUESTS = [
  { id: 1, employee: "สมชาย", days: 2, status: "pending" },
  { id: 2, employee: "สมหญิง", days: 1, status: "approved" },
];

export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1>คำขอลา</h1>
      <ul>
        {REQUESTS.map((r) => (
          <li key={r.id}>
            {r.employee} — {r.days} วัน — {r.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
