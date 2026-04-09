export interface ContractFormData {
  chuCuaHang: string;
  cccd: string;
  sdt: string;
  maKhachHang: string;
  diaChi: string;
  mucKe: string;
  viTriTrungBay: string;
  soLuongMauHang: string;
  tieuChuan: string;
  soKe: string;
  thoiGianThoaThuan: string;
  mucDoanhSo: string;
  mucThuong: string;
  ngay: string;
  thang: string;
  nam: string;
}

export const initialContractFormData: ContractFormData = {
  chuCuaHang: '',
  cccd: '',
  sdt: '',
  maKhachHang: '',
  diaChi: '',
  mucKe: '1',
  viTriTrungBay: '',
  soLuongMauHang: '',
  tieuChuan: 'Đầy đủ, không hư hỏng, đúng hạn',
  soKe: '1',
  thoiGianThoaThuan: '12',
  mucDoanhSo: '',
  mucThuong: '',
  ngay: '08',
  thang: '04',
  nam: '2026',
};
