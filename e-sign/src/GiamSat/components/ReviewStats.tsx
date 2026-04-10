interface ReviewStatsProps {
  total: number;
  signedCount: number;
  pendingCount: number;
  roleLabel: string;
}

export default function ReviewStats({ total, signedCount, pendingCount, roleLabel }: ReviewStatsProps) {
  return (
    <section className="stats-grid">
      <article className="stat-card">
        <span>Tổng hợp đồng</span>
        <strong>{total}</strong>
      </article>
      <article className="stat-card">
        <span>{roleLabel} đã ký</span>
        <strong>{signedCount}</strong>
      </article>
      <article className="stat-card">
        <span>{roleLabel} chưa ký</span>
        <strong>{pendingCount}</strong>
      </article>
    </section>
  );
}
