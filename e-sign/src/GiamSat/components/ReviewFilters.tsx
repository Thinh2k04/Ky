import type { ReviewFilter } from '../types';

interface ReviewFiltersProps {
  filter: ReviewFilter;
  search: string;
  onFilterChange: (filter: ReviewFilter) => void;
  onSearchChange: (value: string) => void;
}

export default function ReviewFilters({ filter, search, onFilterChange, onSearchChange }: ReviewFiltersProps) {
  return (
    <section className="admin-toolbar review-toolbar">
      <div className="review-filters" role="tablist" aria-label="Bộ lọc ký duyệt">
        <button type="button" className={`ghost-btn ${filter === 'all' ? 'is-active' : ''}`} onClick={() => onFilterChange('all')}>
          Tất cả
        </button>
        <button type="button" className={`ghost-btn ${filter === 'pending' ? 'is-active' : ''}`} onClick={() => onFilterChange('pending')}>
          Chưa ký
        </button>
        <button type="button" className={`ghost-btn ${filter === 'signed' ? 'is-active' : ''}`} onClick={() => onFilterChange('signed')}>
          Đã ký
        </button>
      </div>

      <label className="search-box review-search-box">
        <span>Tìm hợp đồng</span>
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên, mã KH, SĐT, CCCD..."
        />
      </label>
    </section>
  );
}
