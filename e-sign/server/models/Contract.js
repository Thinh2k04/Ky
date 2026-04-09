import mongoose from 'mongoose';

const formDataSchema = new mongoose.Schema(
  {
    chuCuaHang:        { type: String, default: '' },
    cccd:              { type: String, default: '' },
    sdt:               { type: String, default: '' },
    maKhachHang:       { type: String, default: '' },
    diaChi:            { type: String, default: '' },
    mucKe:             { type: String, default: '1' },
    viTriTrungBay:     { type: String, default: '' },
    soLuongMauHang:    { type: String, default: '' },
    tieuChuan:         { type: String, default: '' },
    soKe:              { type: String, default: '1' },
    thoiGianThoaThuan: { type: String, default: '12' },
    mucDoanhSo:        { type: String, default: '' },
    mucThuong:         { type: String, default: '' },
    ngay:              { type: String, default: '' },
    thang:             { type: String, default: '' },
    nam:               { type: String, default: '' },
  },
  { _id: false }
);

const contractSchema = new mongoose.Schema(
  {
    formData:      { type: formDataSchema, required: true },
    signatures:    { type: [String], default: [] },
    savedAtClient: { type: String, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  }
);

export const Contract = mongoose.model('Contract', contractSchema);
