import type { ContractFormData } from './contract';

export interface AdminUser {
  username: string;
  displayName: string;
  role: 'admin' | 'contract';
}

export interface AdminSession {
  token: string;
  user: AdminUser;
}

export interface TaiKhoanRecord {
  id: string;
  username: string;
  displayName: string;
  role: 'admin' | 'contract';
}

export interface NhanVienRecord {
  id: string;
  taiKhoanId: string;
  taiKhoan: TaiKhoanRecord;
  hoTen: string;
}

export interface KhachHangRecord {
  id: string;
  ten: string;
  cccd: string;
  sdt: string;
  maKhachHang: string;
  diaChi: string;
}

export interface HopDongChiTietRecord extends Omit<ContractFormData, 'ngay' | 'thang' | 'nam'> {
  signedDate: string;
}

export interface HopDongRecord {
  id: string;
  khachHangId: string;
  nhanVienId: string;
  signedDate: string;
  trangThai: 'cho_ky' | 'da_ky' | 'da_luu' | 'huy';
}

export interface LichSuKyDuyetRecord {
  id: string;
  hopDongId: string;
  vaiTro: string;
  nguoiKy: string;
  signatureDataUrl: string;
  trangThai: 'da_ky' | 'trong' | 'huy';
  kyLucAt: string;
}

export interface TepDinhKemRecord {
  id: string;
  hopDongId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface StoredContractRecord {
  id: string;
  createdAt: string;
  savedAtClient: string | null;
  taiKhoan: TaiKhoanRecord;
  khachHang: KhachHangRecord;
  nhanVien: NhanVienRecord;
  hopDong: HopDongRecord;
  hopDongChiTiet: HopDongChiTietRecord;
  lichSuKyDuyet: LichSuKyDuyetRecord[];
  tepDinhKem: TepDinhKemRecord[];
  formData?: ContractFormData;
  signatures?: string[];
}
