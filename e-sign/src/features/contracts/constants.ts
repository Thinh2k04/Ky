import type { ContractFormData } from '../../types/contract';

export const CONTRACT_FIELD_LABELS: Record<keyof ContractFormData, string> = {
  chuCuaHang: 'Chủ cửa hàng',
  cccd: 'CCCD',
  sdt: 'Số điện thoại',
  maKhachHang: 'Mã khách hàng',
  diaChi: 'Địa chỉ',
  mucKe: 'Mức kệ đăng ký',
  viTriTrungBay: 'Vị trí trưng bày',
  soLuongMauHang: 'Số lượng mẫu hàng',
  tieuChuan: 'Tiêu chuẩn',
  soKe: 'Số kệ',
  thoiGianThoaThuan: 'Thời gian thỏa thuận',
  mucDoanhSo: 'Mức doanh số mua vào/tháng',
  mucThuong: 'Mức thưởng',
  ngay: 'Ngày',
  thang: 'Tháng',
  nam: 'Năm',
};

export const REQUIRED_CONTRACT_FIELDS: Array<keyof ContractFormData> = [
  'chuCuaHang',
  'cccd',
  'sdt',
  'maKhachHang',
  'diaChi',
  'mucKe',
  'viTriTrungBay',
  'soLuongMauHang',
  'tieuChuan',
  'soKe',
  'thoiGianThoaThuan',
  'mucDoanhSo',
  'mucThuong',
  'ngay',
  'thang',
  'nam',
];

export const NUMERIC_CONTRACT_FIELDS: Array<keyof ContractFormData> = ['cccd', 'sdt', 'mucKe', 'soLuongMauHang', 'soKe', 'thoiGianThoaThuan', 'mucDoanhSo', 'mucThuong', 'ngay', 'thang', 'nam'];

export const SIGN_TITLES = ['CỬA HÀNG', 'NHÂN VIÊN', 'GIÁM SÁT', 'CÔNG TY TNHH THƯƠNG MẠI ĐẠI VIỆT FOOD'] as const;

export const ROLE_SIGNATURE_INDEXES: Record<'contract' | 'supervisor' | 'company', number[]> = {
  contract: [0, 1],
  supervisor: [2],
  company: [3],
};

export const REVIEW_ROLE_CONFIG: Record<'supervisor' | 'company', { signIndex: number; label: string }> = {
  supervisor: {
    signIndex: 2,
    label: 'Giám sát',
  },
  company: {
    signIndex: 3,
    label: 'Công ty',
  },
};