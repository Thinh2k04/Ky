import { useEffect, useMemo, useRef, useState } from 'react';
import type { AdminSession, StoredContractRecord } from '../types/admin';
import { REVIEW_ROLE_CONFIG } from '../features/contracts/constants';
import {
  getContractDetail,
  getCustomerName,
  getReviewStatusText,
  getSignatureByIndex,
  hasSignedByRole,
  sortPendingFirst,
} from '../features/review/contracts';

type ReviewFilter = 'all' | 'pending' | 'signed';

interface SignatureReviewDashboardProps {
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

export default function SignatureReviewDashboard({ session, onLogout }: SignatureReviewDashboardProps) {
  const accountRole = session.user.role === 'company' ? 'company' : 'supervisor';
  const roleConfig = REVIEW_ROLE_CONFIG[accountRole];

  const [contracts, setContracts] = useState<StoredContractRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const signCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawing = useRef(false);
  const blankSignature = useRef('');
  const initialSignature = useRef('');
  const hasNewStroke = useRef(false);
  const [isSignatureDirty, setIsSignatureDirty] = useState(false);

  const loadContracts = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/contracts');
      const payload = (await response.json()) as Partial<{ items: StoredContractRecord[]; message: string }>;

      if (!response.ok) {
        throw new Error(payload.message || 'Không thể tải danh sách hợp đồng.');
      }

      const items = Array.isArray(payload.items) ? payload.items : [];
      setContracts(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    } catch (loadError) {
      const loadMessage = loadError instanceof Error ? loadError.message : 'Không thể tải danh sách hợp đồng.';
      setError(loadMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadContracts();
  }, []);

  const filteredContracts = useMemo(() => {
    const query = search.trim().toLowerCase();

    const roleFiltered = contracts.filter((contract) => {
      const hasSigned = hasSignedByRole(contract, roleConfig.signIndex);
      if (filter === 'signed') return hasSigned;
      if (filter === 'pending') return !hasSigned;
      return true;
    });

    const queryFiltered = roleFiltered.filter((contract) => {
      const searchable = [
        getCustomerName(contract),
        contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || '',
        contract.khachHang?.sdt || contract.formData?.sdt || '',
        contract.khachHang?.cccd || contract.formData?.cccd || '',
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });

    return sortPendingFirst(query ? queryFiltered : roleFiltered, roleConfig.signIndex);
  }, [contracts, filter, roleConfig.signIndex, search]);

  const selectedContract = filteredContracts.find((contract) => contract.id === selectedId) ?? filteredContracts[0] ?? null;
  const selectedContractSigned = selectedContract ? hasSignedByRole(selectedContract, roleConfig.signIndex) : false;

  const pendingCount = useMemo(() => contracts.filter((contract) => !hasSignedByRole(contract, roleConfig.signIndex)).length, [contracts, roleConfig.signIndex]);
  const signedCount = useMemo(() => contracts.filter((contract) => hasSignedByRole(contract, roleConfig.signIndex)).length, [contracts, roleConfig.signIndex]);

  const setupCanvas = () => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.lineWidth = 4;
    context.lineCap = 'round';
    context.strokeStyle = '#111827';
    blankSignature.current = canvas.toDataURL('image/png');
  };

  useEffect(() => {
    setupCanvas();
  }, []);

  useEffect(() => {
    const canvas = signCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    hasNewStroke.current = false;
    setIsSignatureDirty(false);

    const existingSignature = selectedContract ? getSignatureByIndex(selectedContract, roleConfig.signIndex) : '';
    initialSignature.current = existingSignature;
    if (!existingSignature) {
      blankSignature.current = canvas.toDataURL('image/png');
      return;
    }

    const image = new Image();
    image.onload = () => {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };
    image.src = existingSignature;
  }, [roleConfig.signIndex, selectedContract]);

  const getPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = signCanvasRef.current;
    const context = canvas?.getContext('2d');
    const point = getPointer(event);

    if (!canvas || !context || !point) return;

    isDrawing.current = true;
    hasNewStroke.current = true;
    setIsSignatureDirty(true);
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;

    const context = signCanvasRef.current?.getContext('2d');
    const point = getPointer(event);
    if (!context || !point) return;

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearSignaturePad = () => {
    const canvas = signCanvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    blankSignature.current = canvas.toDataURL('image/png');
    hasNewStroke.current = true;
    setIsSignatureDirty(false);
  };

  const saveSignature = async () => {
    if (!selectedContract) {
      setMessage('Hãy chọn hợp đồng cần ký.');
      return;
    }

    const canvas = signCanvasRef.current;
    if (!canvas) {
      setMessage('Không tìm thấy vùng ký.');
      return;
    }

    const signatureDataUrl = canvas.toDataURL('image/png');
    if (!signatureDataUrl || signatureDataUrl === blankSignature.current) {
      setMessage(`Vui lòng ký vào phần ${roleConfig.label} trước khi lưu.`);
      return;
    }

    if (!hasNewStroke.current || signatureDataUrl === initialSignature.current) {
      setMessage(`Chưa có chữ ký mới cho phần ${roleConfig.label}. Vui lòng ký tay rồi lưu.`);
      return;
    }

    setIsSavingSignature(true);
    setMessage('');
    setError('');

    try {
      let response = await fetch(`/api/contracts/${selectedContract.id}/signatures`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureIndex: roleConfig.signIndex,
          signatureDataUrl,
          signer: session.user.displayName,
        }),
      });

      // Fallback for environments/proxies that do not pass PATCH correctly.
      if (response.status === 404 || response.status === 405) {
        response = await fetch('/api/contracts/signatures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contractId: selectedContract.id,
            signatureIndex: roleConfig.signIndex,
            signatureDataUrl,
            signer: session.user.displayName,
          }),
        });
      }

      const payload = (await response.json()) as Partial<{ message: string }>;
      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu chữ ký.');
      }

      setMessage('Đã lưu chữ ký thành công.');
      await loadContracts();
      setSelectedId(selectedContract.id);
      hasNewStroke.current = false;
      setIsSignatureDirty(false);
    } catch (saveError) {
      const saveMessage = saveError instanceof Error ? saveError.message : 'Không thể lưu chữ ký.';
      setError(saveMessage);
    } finally {
      setIsSavingSignature(false);
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="eyebrow">Duyệt chữ ký</p>
            <h1>{roleConfig.label} - {session.user.displayName}</h1>
            <p className="admin-lead">Xem toàn bộ hợp đồng và ký đúng phần theo chức vụ của bạn.</p>
          </div>

          <div className="admin-actions">
            <button type="button" className="ghost-btn" onClick={() => void loadContracts()} disabled={isLoading || isSavingSignature}>
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
            <span>{roleConfig.label} đã ký</span>
            <strong>{signedCount}</strong>
          </article>
          <article className="stat-card">
            <span>{roleConfig.label} chưa ký</span>
            <strong>{pendingCount}</strong>
          </article>
        </section>

        <section className="admin-toolbar review-toolbar">
          <div className="review-filters" role="tablist" aria-label="Bộ lọc ký duyệt">
            <button type="button" className={`ghost-btn ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
              Tất cả
            </button>
            <button type="button" className={`ghost-btn ${filter === 'pending' ? 'is-active' : ''}`} onClick={() => setFilter('pending')}>
              Chưa ký
            </button>
            <button type="button" className={`ghost-btn ${filter === 'signed' ? 'is-active' : ''}`} onClick={() => setFilter('signed')}>
              Đã ký
            </button>
          </div>

          <label className="search-box review-search-box">
            <span>Tìm hợp đồng</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên, mã KH, SĐT, CCCD..."
            />
          </label>
        </section>

        {error ? <p className="panel-message panel-message--error">{error}</p> : null}
        {message ? <p className="panel-message">{message}</p> : null}
        {!error && isLoading ? <p className="panel-message">Đang tải danh sách hợp đồng...</p> : null}

        {!isLoading && filteredContracts.length === 0 ? <p className="panel-message">Không có hợp đồng phù hợp với bộ lọc hiện tại.</p> : null}

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
                      <th>Mã KH</th>
                      <th>Trạng thái {roleConfig.label}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContracts.map((contract) => {
                      const isSigned = hasSignedByRole(contract, roleConfig.signIndex);

                      return (
                        <tr
                          key={contract.id}
                          className={contract.id === selectedContract?.id ? 'is-selected' : ''}
                          onClick={() => setSelectedId(contract.id)}
                        >
                          <td>{formatDateTime(contract.createdAt)}</td>
                          <td>{getCustomerName(contract)}</td>
                          <td>{contract.khachHang?.maKhachHang || contract.formData?.maKhachHang || 'Chưa có'}</td>
                          <td>
                            <span className={isSigned ? 'review-status review-status--done' : 'review-status review-status--pending'}>
                              {isSigned ? 'Đã ký' : 'Chưa ký'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className="panel detail-panel">
              <div className="panel-head">
                <h2>Chi tiết ký duyệt</h2>
                <span>{selectedContract ? selectedContract.id.slice(0, 8) : 'Chưa chọn'}</span>
              </div>

              {selectedContract ? (
                <div className="detail-stack">
                  <div className="detail-block">
                    <span>Thông tin hợp đồng</span>
                    <strong>{getCustomerName(selectedContract)}</strong>
                    <p>CCCD: {selectedContract.khachHang?.cccd || selectedContract.formData?.cccd || 'Chưa có'}</p>
                    <p>SĐT: {selectedContract.khachHang?.sdt || selectedContract.formData?.sdt || 'Chưa có'}</p>
                    <p>Địa chỉ: {selectedContract.khachHang?.diaChi || selectedContract.formData?.diaChi || 'Chưa có'}</p>
                    <p>Mã KH: {selectedContract.khachHang?.maKhachHang || selectedContract.formData?.maKhachHang || 'Chưa có'}</p>
                    <p>Ngày ký hợp đồng: {getContractDetail(selectedContract)?.signedDate || selectedContract.hopDong?.signedDate || 'Chưa có'}</p>
                    <p>
                      Trạng thái ký {roleConfig.label}:{' '}
                      <span className={selectedContractSigned ? 'review-status review-status--done' : 'review-status review-status--pending'}>
                        {getReviewStatusText(selectedContract, roleConfig.signIndex)}
                      </span>
                    </p>
                  </div>

                  <div className="detail-block">
                    <span>Nội dung chính cần xác nhận</span>
                    <p>Mức kệ: {getContractDetail(selectedContract)?.mucKe || 'Chưa có'} kệ</p>
                    <p>Vị trí trưng bày: {getContractDetail(selectedContract)?.viTriTrungBay || 'Chưa có'}</p>
                    <p>Số lượng mẫu hàng: {getContractDetail(selectedContract)?.soLuongMauHang || 'Chưa có'}</p>
                    <p>Tiêu chuẩn: {getContractDetail(selectedContract)?.tieuChuan || 'Chưa có'}</p>
                    <p>Số kệ chương trình: {getContractDetail(selectedContract)?.soKe || 'Chưa có'}</p>
                    <p>Thời gian thỏa thuận: {getContractDetail(selectedContract)?.thoiGianThoaThuan || 'Chưa có'} tháng</p>
                    <p>Mức doanh số: {getContractDetail(selectedContract)?.mucDoanhSo || 'Chưa có'}</p>
                    <p>Mức thưởng: {getContractDetail(selectedContract)?.mucThuong || 'Chưa có'}</p>
                  </div>

                  <div className="detail-block">
                    <span>Ký tay xác nhận phần {roleConfig.label}</span>
                    <p>Xem lại thông tin hợp đồng ở trên, sau đó ký tay để xác nhận hợp đồng đúng.</p>
                    <canvas
                      ref={signCanvasRef}
                      width={520}
                      height={220}
                      className="sign-pad review-sign-pad"
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={stopDrawing}
                      onPointerLeave={stopDrawing}
                      onPointerCancel={stopDrawing}
                    />
                    <div className="toolbar-actions review-sign-actions">
                      <button type="button" className="ghost-btn" onClick={clearSignaturePad} disabled={isSavingSignature}>
                        Xóa chữ ký
                      </button>
                      <button type="button" className="save-btn" onClick={() => void saveSignature()} disabled={isSavingSignature || !isSignatureDirty}>
                        {isSavingSignature ? 'Đang lưu ký...' : `Ký xác nhận ${roleConfig.label}`}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="panel-message">Chọn hợp đồng ở danh sách bên trái để ký duyệt.</p>
              )}
            </aside>
          </div>
        ) : null}
      </div>
    </div>
  );
}
