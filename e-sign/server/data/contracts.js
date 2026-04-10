import mongoose from 'mongoose';

const TaiKhoanSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    displayName: { type: String, required: true },
    role: { type: String, enum: ['admin', 'contract', 'supervisor', 'company'], required: true },
  },
  { _id: true }
);

const NhanVienSchema = new mongoose.Schema(
  {
    taiKhoan: { type: TaiKhoanSchema, required: true },
    hoTen: { type: String, required: true },
  },
  { _id: true }
);

const KhachHangSchema = new mongoose.Schema(
  {
    ten: { type: String, required: true },
    cccd: { type: String, default: '' },
    sdt: { type: String, default: '' },
    maKhachHang: { type: String, default: '' },
    diaChi: { type: String, default: '' },
  },
  { _id: true }
);

const HopDongChiTietSchema = new mongoose.Schema(
  {
    chuCuaHang: { type: String, default: '' },
    cccd: { type: String, default: '' },
    sdt: { type: String, default: '' },
    maKhachHang: { type: String, default: '' },
    diaChi: { type: String, default: '' },
    mucKe: { type: String, default: '1' },
    viTriTrungBay: { type: String, default: '' },
    soLuongMauHang: { type: String, default: '' },
    tieuChuan: { type: String, default: '' },
    soKe: { type: String, default: '1' },
    thoiGianThoaThuan: { type: String, default: '12' },
    mucDoanhSo: { type: String, default: '' },
    mucThuong: { type: String, default: '' },
    signedDate: { type: String, default: '' },
  },
  { _id: false }
);

const LichSuKyDuyetSchema = new mongoose.Schema(
  {
    hopDongChiTietId: { type: String, default: '' },
    vaiTro: { type: String, required: true },
    nguoiKy: { type: String, required: true },
    signatureDataUrl: { type: String, default: '' },
    trangThai: { type: String, enum: ['da_ky', 'trong', 'huy'], default: 'trong' },
    kyLucAt: { type: String, default: '' },
  },
  { _id: true }
);

const SignatureSchema = new mongoose.Schema(
  {
    contractId: { type: String, required: true, unique: true },
    hopDongChiTietId: { type: String, required: true, unique: true },
    signatures: { type: [String], default: [] },
    lichSuKyDuyet: { type: [LichSuKyDuyetSchema], default: [] },
    savedAtClient: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

const TepDinhKemSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    fileType: { type: String, default: '' },
    fileUrl: { type: String, default: '' },
    uploadedAt: { type: String, default: '' },
  },
  { _id: true }
);

const HopDongSchema = new mongoose.Schema(
  {
    khachHang: { type: KhachHangSchema, required: true },
    nhanVien: { type: NhanVienSchema, required: true },
    hopDongChiTiet: { type: HopDongChiTietSchema, required: true },
    lichSuKyDuyet: { type: [LichSuKyDuyetSchema], default: [] },
    tepDinhKem: { type: [TepDinhKemSchema], default: [] },
    savedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    formData: { type: mongoose.Schema.Types.Mixed, default: null },
    signatures: { type: [String], default: [] },
    signedDate: { type: String, default: '' },
    trangThai: { type: String, enum: ['cho_ky', 'da_ky', 'da_luu', 'huy'], default: 'cho_ky' },
    savedAtClient: { type: String, default: null },
  },
  {
    timestamps: true,
  }
);

export const TaiKhoan = mongoose.model('TaiKhoan', TaiKhoanSchema);
export const NhanVien = mongoose.model('NhanVien', NhanVienSchema);
export const KhachHang = mongoose.model('KhachHang', KhachHangSchema);
export const HopDong = mongoose.model('HopDong', HopDongSchema);
export const HopDongChiTiet = mongoose.model('HopDongChiTiet', HopDongChiTietSchema);
export const LichSuKyDuyet = mongoose.model('LichSuKyDuyet', LichSuKyDuyetSchema);
export const Signature = mongoose.model('Signature', SignatureSchema);
export const TepDinhKem = mongoose.model('TepDinhKem', TepDinhKemSchema);