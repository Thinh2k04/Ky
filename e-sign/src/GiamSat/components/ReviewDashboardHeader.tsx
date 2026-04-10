interface ReviewDashboardHeaderProps {
  roleLabel: string;
  displayName: string;
  isLoading: boolean;
  isSavingSignature: boolean;
  onReload: () => void;
  onLogout: () => Promise<void> | void;
}

export default function ReviewDashboardHeader({
  roleLabel,
  displayName,
  isLoading,
  isSavingSignature,
  onReload,
  onLogout,
}: ReviewDashboardHeaderProps) {
  return (
    <header className="admin-header">
      <div>
        <p className="eyebrow">Duyệt chữ ký</p>
        <h1>{roleLabel} - {displayName}</h1>
        <p className="admin-lead">Xem toàn bộ hợp đồng và ký đúng phần theo chức vụ của bạn.</p>
      </div>

      <div className="admin-actions">
        <button type="button" className="ghost-btn" onClick={onReload} disabled={isLoading || isSavingSignature}>
          Tải lại
        </button>
        <button type="button" className="danger-btn" onClick={() => void onLogout()}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
