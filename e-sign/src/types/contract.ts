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

const toTwoDigits = (value: number) => String(value).padStart(2, '0');

export const createInitialContractFormData = (): ContractFormData => {
  const now = new Date();

  return {
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
    ngay: toTwoDigits(now.getDate()),
    thang: toTwoDigits(now.getMonth() + 1),
    nam: String(now.getFullYear()),
  };
};
