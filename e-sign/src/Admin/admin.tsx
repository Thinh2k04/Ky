import { useEffect, useMemo, useState } from 'react';
import type { AdminSession, StoredContractRecord } from '../types/admin';

interface AdminDashboardProps {
  session: AdminSession;
  onLogout: () => Promise<void> | void;
}

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

export default function AdminDashboard({ session, onLogout }: AdminDashboardProps) {
  const [contracts, setContracts] = useState<StoredContractRecord[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadContracts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts');
      const payload = (await response.json()) as Partial<{ items: StoredContractRecord[]; message: string }>;
      const items = Array.isArray(payload.items) ? payload.items : [];

      if (!response.ok) {
        throw new Error(payload.message || 'Không thể tải danh sách hợp đồng.');
      }

      setContracts(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách hợp đồng.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
  }, []);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contracts;

    return contracts.filter((contract) => {
      const text = [
        contract.formData.chuCuaHang,
        contract.formData.cccd,
        contract.formData.sdt,
        contract.formData.maKhachHang,
        contract.formData.diaChi,
      ]
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [contracts, search]);

  const selectedContract = filteredContracts.find((contract) => contract.id === selectedId) ?? filteredContracts[0] ?? null;
  const totalSignatures = contracts.reduce((total, contract) => total + contract.signatures.filter(Boolean).length, 0);
  const latestContract = contracts[0];

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Admin Dashboard</p>
            <h1>Xin chào, {session.user.displayName || 'Quản trị viên'}</h1>
            <p className="admin-lead">Theo dõi hợp đồng, chữ ký và dữ liệu đã lưu ở một nơi.</p>
          </div>

          <div className="admin-actions">
            <button type="button" className="ghost-btn" onClick={() => void loadContracts()} disabled={isLoading}>
              Tải lại
            </button>
            <button type="button" className="danger-btn" onClick={() => void onLogout()}>
              Đăng xuất
            </button>
          </div>
        </header>

        <section className="stats-grid">
          <article className="stat-card">
            <span>Tổng hợp đồng</span>
            <strong>{contracts.length}</strong>
          </article>
          <article className="stat-card">
            <span>Chữ ký đã lưu</span>
            <strong>{totalSignatures}</strong>
          </article>
          <article className="stat-card">
            <span>Bản ghi mới nhất</span>
            <strong>{latestContract ? formatDateTime(latestContract.createdAt) : 'Chưa có'}</strong>
          </article>
        </section>

        <section className="admin-toolbar">
          <label className="search-box">
            <span>Tìm kiếm</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo cửa hàng, CCCD, SĐT, mã khách hàng..."
            />
          </label>

          <button type="button" className="ghost-btn" onClick={() => setSearch('')}>
            Xóa lọc
          </button>
        </section>

        {error ? <p className="panel-message panel-message--error">{error}</p> : null}
        {!error && isLoading ? <p className="panel-message">Đang tải dữ liệu...</p> : null}

        {!isLoading && !error && filteredContracts.length === 0 ? (
          <p className="panel-message">Chưa có hợp đồng nào phù hợp với bộ lọc hiện tại.</p>
        ) : null}

        {!isLoading && filteredContracts.length > 0 ? (
          <div className="admin-grid">
            <section className="panel table-panel">
              <div className="panel-head">
                <h2>Danh sách hợp đồng</h2>
                <span>{filteredContracts.length} bản ghi</span>
              </div>

              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Cửa hàng</th>
                      <th>CCCD</th>
                      <th>SĐT</th>
                      <th>Chữ ký</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => (
                      <tr
                        key={contract.id}
                        className={contract.id === selectedContract?.id ? 'is-selected' : ''}
                        onClick={() => setSelectedId(contract.id)}
                      >
                        <td>{formatDateTime(contract.createdAt)}</td>
                        <td>{contract.formData.chuCuaHang || 'Chưa nhập'}</td>
                        <td>{contract.formData.cccd || 'Chưa nhập'}</td>
                        <td>{contract.formData.sdt || 'Chưa nhập'}</td>
                        <td>{contract.signatures.filter(Boolean).length}/4</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="panel detail-panel">
              <div className="panel-head">
                <h2>Chi tiết bản ghi</h2>
                <span>{selectedContract ? selectedContract.id.slice(0, 8) : 'Chưa chọn'}</span>
              </div>

              {selectedContract ? (
                <div className="detail-stack">
                  <div className="detail-block">
                    <span>Thông tin chính</span>
                    <strong>{selectedContract.formData.chuCuaHang || 'Chưa nhập tên cửa hàng'}</strong>
                    <p>
                      {selectedContract.formData.cccd || 'Chưa nhập CCCD'} • {selectedContract.formData.sdt || 'Chưa nhập SĐT'}
                    </p>
                    <p>{selectedContract.formData.diaChi || 'Chưa nhập địa chỉ'}</p>
                  </div>

                  <div className="detail-block">
                    <span>Trạng thái lưu</span>
                    <strong>{selectedContract.savedAtClient ? formatDateTime(selectedContract.savedAtClient) : 'Không có thời gian client'}</strong>
                    <p>Tạo lúc: {formatDateTime(selectedContract.createdAt)}</p>
                  </div>

                  <div className="detail-block">
                    <span>Chữ ký</span>
                    <div className="signature-preview-grid">
                      {selectedContract.signatures.map((signature, index) => (
                        <figure key={`${selectedContract.id}-${index}`} className="signature-preview">
                          {signature ? <img src={signature} alt={`Chữ ký ${index + 1}`} /> : <div className="signature-empty">Trống</div>}
                          <figcaption>Vị trí {index + 1}</figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="panel-message">Chọn một bản ghi để xem chi tiết.</p>
              )}
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
