import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = join(__dirname, 'data', 'contracts.json');
const MAX_BODY_SIZE = 15 * 1024 * 1024;
const SIGN_TITLES = ['CỬA HÀNG', 'NHÂN VIÊN', 'GIÁM SÁT', 'CÔNG TY TNHH THƯƠNG MẠI ĐẠI VIỆT FOOD'];
const EMPTY_CONTRACTS = '[]\n';

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(payload));
};

const toSafeSignatures = (value) => {
  const source = Array.isArray(value) ? value : [];
  return SIGN_TITLES.map((_, index) => {
    const signature = source[index];
    return typeof signature === 'string' ? signature : '';
  });
};

const updateContractSignatureByRole = async ({ contractId, signatureIndex, signatureDataUrl, signer }) => {
  if (!Number.isInteger(signatureIndex) || signatureIndex < 0 || signatureIndex > 3) {
    throw new Error('Vị trí chữ ký không hợp lệ.');
  }

  if (!signatureDataUrl) {
    throw new Error('Thiếu dữ liệu chữ ký.');
  }

  if (!contractId) {
    throw new Error('Thiếu mã hợp đồng.');
  }

  const contracts = await readContracts();
  const contractIndex = contracts.findIndex((item) => item?.id === contractId);

  if (contractIndex < 0) {
    const notFoundError = new Error('Không tìm thấy hợp đồng.');
    notFoundError.statusCode = 404;
    throw notFoundError;
  }

  const targetContract = contracts[contractIndex];
  const nextSignatures = toSafeSignatures(targetContract?.signatures);
  nextSignatures[signatureIndex] = signatureDataUrl;

  const now = new Date().toISOString();
  const nextEntries = SIGN_TITLES.map((title, index) => {
    const previousEntry = Array.isArray(targetContract?.lichSuKyDuyet) ? targetContract.lichSuKyDuyet[index] : null;
    const entrySignature = nextSignatures[index] || '';

    return {
      id: previousEntry?.id || `ls-${targetContract.hopDong?.id || targetContract.id}-${index + 1}`,
      hopDongId: previousEntry?.hopDongId || targetContract.hopDong?.id || `hd-${targetContract.id}`,
      vaiTro: title,
      nguoiKy: index === signatureIndex ? signer || title : previousEntry?.nguoiKy || title,
      signatureDataUrl: entrySignature,
      trangThai: entrySignature ? 'da_ky' : 'trong',
      kyLucAt: index === signatureIndex ? now : previousEntry?.kyLucAt || now,
    };
  });

  const signedCount = nextSignatures.filter(Boolean).length;
  const nextTrangThai = signedCount === 0 ? 'cho_ky' : signedCount >= SIGN_TITLES.length ? 'da_ky' : 'da_luu';

  contracts[contractIndex] = {
    ...targetContract,
    savedAtClient: now,
    signatures: nextSignatures,
    lichSuKyDuyet: nextEntries,
    hopDong: {
      ...targetContract.hopDong,
      trangThai: nextTrangThai,
    },
  };

  await writeContracts(contracts);
  return targetContract.id;
};

const ensureDataFile = async () => {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  try {
    const content = await readFile(DATA_FILE, 'utf8');
    if (!content.trim()) {
      await writeFile(DATA_FILE, EMPTY_CONTRACTS, 'utf8');
    }
  } catch {
    await writeFile(DATA_FILE, EMPTY_CONTRACTS, 'utf8');
  }
};

const buildSignedDate = (formData) => {
  if (!formData || typeof formData !== 'object') return '';

  const day = typeof formData.ngay === 'string' ? formData.ngay.trim().padStart(2, '0') : '';
  const month = typeof formData.thang === 'string' ? formData.thang.trim().padStart(2, '0') : '';
  const year = typeof formData.nam === 'string' ? formData.nam.trim() : '';

  return [day, month, year].filter(Boolean).join('/');
};

const createTaiKhoan = (savedBy, fallbackId) => {
  const username = typeof savedBy?.username === 'string' ? savedBy.username : 'unknown';
  const displayName = typeof savedBy?.displayName === 'string' ? savedBy.displayName : 'Không rõ';
  const role =
    savedBy?.role === 'admin' || savedBy?.role === 'contract' || savedBy?.role === 'supervisor' || savedBy?.role === 'company'
      ? savedBy.role
      : 'contract';

  return {
    id: `tk-${fallbackId}`,
    username,
    displayName,
    role,
  };
};

const createCustomer = (payload, fallbackId) => {
  const source = payload?.khachHang ?? payload?.formData ?? payload?.hopDongChiTiet ?? {};

  return {
    id: `kh-${fallbackId}`,
    ten: typeof source.chuCuaHang === 'string' ? source.chuCuaHang : typeof source.ten === 'string' ? source.ten : '',
    cccd: typeof source.cccd === 'string' ? source.cccd : '',
    sdt: typeof source.sdt === 'string' ? source.sdt : '',
    maKhachHang: typeof source.maKhachHang === 'string' ? source.maKhachHang : '',
    diaChi: typeof source.diaChi === 'string' ? source.diaChi : '',
  };
};

const createHopDongChiTiet = (payload, signedDate) => {
  const source = payload?.hopDongChiTiet ?? payload?.formData ?? {};

  return {
    chuCuaHang: typeof source.chuCuaHang === 'string' ? source.chuCuaHang : '',
    cccd: typeof source.cccd === 'string' ? source.cccd : '',
    sdt: typeof source.sdt === 'string' ? source.sdt : '',
    maKhachHang: typeof source.maKhachHang === 'string' ? source.maKhachHang : '',
    diaChi: typeof source.diaChi === 'string' ? source.diaChi : '',
    mucKe: typeof source.mucKe === 'string' ? source.mucKe : '1',
    viTriTrungBay: typeof source.viTriTrungBay === 'string' ? source.viTriTrungBay : '',
    soLuongMauHang: typeof source.soLuongMauHang === 'string' ? source.soLuongMauHang : '',
    tieuChuan: typeof source.tieuChuan === 'string' ? source.tieuChuan : '',
    soKe: typeof source.soKe === 'string' ? source.soKe : '1',
    thoiGianThoaThuan: typeof source.thoiGianThoaThuan === 'string' ? source.thoiGianThoaThuan : '12',
    mucDoanhSo: typeof source.mucDoanhSo === 'string' ? source.mucDoanhSo : '',
    mucThuong: typeof source.mucThuong === 'string' ? source.mucThuong : '',
    signedDate,
  };
};

const createLichSuKyDuyet = (signatures, contractId, savedAtClient) => {
  return signatures.map((signature, index) => ({
    id: `ls-${contractId}-${index + 1}`,
    hopDongId: contractId,
    vaiTro: SIGN_TITLES[index] ?? `Vị trí ${index + 1}`,
    nguoiKy: SIGN_TITLES[index] ?? `Vị trí ${index + 1}`,
    signatureDataUrl: signature || '',
    trangThai: signature ? 'da_ky' : 'trong',
    kyLucAt: savedAtClient,
  }));
};

const asPlainObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value;
};

const sanitizeSavedBy = (savedBy, fallbackId) => {
  if (!savedBy || typeof savedBy !== 'object') {
    return {
      username: 'unknown',
      displayName: 'Khong ro',
      role: 'contract',
      refId: `tk-${fallbackId}`,
    };
  }

  const role =
    savedBy.role === 'admin' || savedBy.role === 'contract' || savedBy.role === 'supervisor' || savedBy.role === 'company'
      ? savedBy.role
      : 'contract';

  return {
    username: typeof savedBy.username === 'string' ? savedBy.username : 'unknown',
    displayName: typeof savedBy.displayName === 'string' ? savedBy.displayName : 'Khong ro',
    role,
    refId: typeof savedBy.id === 'string' ? savedBy.id : `tk-${fallbackId}`,
  };
};

const extractSignatures = (record) => {
  if (Array.isArray(record?.signatures)) {
    return record.signatures.map((signature) => (typeof signature === 'string' ? signature : ''));
  }

  if (Array.isArray(record?.lichSuKyDuyet)) {
    return record.lichSuKyDuyet.map((entry) => (typeof entry?.signatureDataUrl === 'string' ? entry.signatureDataUrl : ''));
  }

  return [];
};

const compactAttachment = (attachment) => {
  const source = asPlainObject(attachment);
  if (!source) {
    return null;
  }

  return {
    fileName: typeof source.fileName === 'string' ? source.fileName : '',
    fileType: typeof source.fileType === 'string' ? source.fileType : '',
    fileUrl: typeof source.fileUrl === 'string' ? source.fileUrl : '',
    uploadedAt: typeof source.uploadedAt === 'string' ? source.uploadedAt : '',
  };
};

const toCompactRecord = (record) => {
  const normalizedId = typeof record?.id === 'string' ? record.id : randomUUID();
  const createdAt = typeof record?.createdAt === 'string' ? record.createdAt : new Date().toISOString();
  const savedAtClient = typeof record?.savedAtClient === 'string' ? record.savedAtClient : null;
  const sourceSavedBy = record?.savedBy ?? record?.taiKhoan ?? record?.nhanVien?.taiKhoan;
  const signatures = extractSignatures(record);

  const attachments = Array.isArray(record?.tepDinhKem)
    ? record.tepDinhKem.map((item) => compactAttachment(item)).filter(Boolean)
    : [];

  return {
    id: normalizedId,
    createdAt,
    savedAtClient,
    savedBy: sanitizeSavedBy(sourceSavedBy, normalizedId),
    formData: asPlainObject(record?.formData),
    hopDongChiTiet: asPlainObject(record?.hopDongChiTiet),
    signatures,
    tepDinhKem: attachments,
  };
};

const normalizeStoredRecord = (record) => {
  if (!record || typeof record !== 'object') {
    return record;
  }

  const normalizedId = typeof record.id === 'string' ? record.id : randomUUID();
  const createdAt = typeof record.createdAt === 'string' ? record.createdAt : new Date().toISOString();
  const savedAtClient = typeof record.savedAtClient === 'string' ? record.savedAtClient : null;

  if (record.taiKhoan && record.khachHang && record.nhanVien && record.hopDong && record.hopDongChiTiet) {
    return {
      ...record,
      id: normalizedId,
      createdAt,
      savedAtClient,
      lichSuKyDuyet: Array.isArray(record.lichSuKyDuyet) ? record.lichSuKyDuyet : [],
      tepDinhKem: Array.isArray(record.tepDinhKem) ? record.tepDinhKem : [],
      signatures: Array.isArray(record.signatures)
        ? record.signatures
        : Array.isArray(record.lichSuKyDuyet)
          ? record.lichSuKyDuyet.map((entry) => entry.signatureDataUrl || '')
          : [],
    };
  }

  const legacyFormData = record.formData ?? {};
  const signedDate = typeof legacyFormData.signedDate === 'string' ? legacyFormData.signedDate : buildSignedDate(legacyFormData);
  const signatures = Array.isArray(record.signatures) ? record.signatures : [];
  const taiKhoan = createTaiKhoan(record.savedBy, normalizedId);
  const khachHang = createCustomer(record, normalizedId);
  const hopDongChiTiet = createHopDongChiTiet(record, signedDate);
  const hopDongId = `hd-${normalizedId}`;
  const nhanVienId = `nv-${normalizedId}`;
  const khachHangId = `kh-${normalizedId}`;

  return {
    id: normalizedId,
    createdAt,
    savedAtClient,
    taiKhoan,
    khachHang,
    nhanVien: {
      id: nhanVienId,
      taiKhoanId: taiKhoan.id,
      taiKhoan,
      hoTen: taiKhoan.displayName,
    },
    hopDong: {
      id: hopDongId,
      khachHangId,
      nhanVienId,
      signedDate,
      trangThai: signatures.some(Boolean) ? 'da_luu' : 'cho_ky',
    },
    hopDongChiTiet,
    lichSuKyDuyet: createLichSuKyDuyet(signatures, hopDongId, savedAtClient ?? createdAt),
    tepDinhKem: Array.isArray(record.tepDinhKem) ? record.tepDinhKem : [],
    formData: record.formData,
    signatures,
  };
};

const readContracts = async () => {
  await ensureDataFile();

  try {
    const raw = await readFile(DATA_FILE, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map((record) => normalizeStoredRecord(record)) : [];
  } catch {
    await writeFile(DATA_FILE, EMPTY_CONTRACTS, 'utf8');
    return [];
  }
};

const writeContracts = async (contracts) => {
  const compacted = contracts.map((record) => toCompactRecord(record));
  await writeFile(DATA_FILE, `${JSON.stringify(compacted, null, 2)}\n`, 'utf8');
};

const readBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_BODY_SIZE) {
        reject(new Error('Payload quá lớn.'));
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('JSON không hợp lệ.'));
      }
    });

    req.on('error', () => reject(new Error('Không đọc được request body.')));
  });
};

const server = createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { message: 'Request không hợp lệ.' });
    return;
  }

  const requestUrl = new URL(req.url, 'http://localhost');
  const path = requestUrl.pathname;

  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === 'GET' && path === '/api/health') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === 'GET' && path === '/api/contracts') {
    try {
      const contracts = await readContracts();
      sendJson(res, 200, { total: contracts.length, items: contracts });
    } catch {
      sendJson(res, 500, { message: 'Không thể đọc dữ liệu.' });
    }
    return;
  }

  if (req.method === 'POST' && path === '/api/contracts') {
    try {
      const payload = await readBody(req);
      const contracts = await readContracts();
      const record = normalizeStoredRecord({
        id: randomUUID(),
        createdAt: new Date().toISOString(),
        savedAtClient: payload?.savedAtClient ?? null,
        savedBy: payload?.savedBy ?? null,
        khachHang: payload?.khachHang ?? null,
        hopDongChiTiet: payload?.hopDongChiTiet ?? null,
        formData: payload?.formData ?? null,
        signatures: Array.isArray(payload?.signatures) ? payload.signatures : [],
        tepDinhKem: Array.isArray(payload?.tepDinhKem) ? payload.tepDinhKem : [],
      });

      contracts.push(record);
      await writeContracts(contracts);

      sendJson(res, 201, { id: record.id, message: 'Lưu dữ liệu thành công.' });
    } catch (error) {
      sendJson(res, 400, { message: error instanceof Error ? error.message : 'Không thể lưu dữ liệu.' });
    }
    return;
  }

  if (req.method === 'PATCH' && /^\/api\/contracts\/[^/]+\/signatures\/?$/.test(path)) {
    try {
      const payload = await readBody(req);
      const signatureIndex = Number(payload?.signatureIndex);
      const signatureDataUrl = typeof payload?.signatureDataUrl === 'string' ? payload.signatureDataUrl : '';
      const signer = typeof payload?.signer === 'string' ? payload.signer : '';

      const contractId = decodeURIComponent(path.split('/')[3] || '');
      const updatedId = await updateContractSignatureByRole({
        contractId,
        signatureIndex,
        signatureDataUrl,
        signer,
      });

      sendJson(res, 200, { message: 'Đã lưu chữ ký.', id: updatedId });
    } catch (error) {
      const statusCode = error instanceof Error && Number.isInteger(error.statusCode) ? error.statusCode : 400;
      sendJson(res, statusCode, { message: error instanceof Error ? error.message : 'Không thể cập nhật chữ ký.' });
    }
    return;
  }

  if (req.method === 'POST' && path === '/api/contracts/signatures') {
    try {
      const payload = await readBody(req);
      const signatureIndex = Number(payload?.signatureIndex);
      const signatureDataUrl = typeof payload?.signatureDataUrl === 'string' ? payload.signatureDataUrl : '';
      const signer = typeof payload?.signer === 'string' ? payload.signer : '';
      const contractId = typeof payload?.contractId === 'string' ? payload.contractId : '';

      const updatedId = await updateContractSignatureByRole({
        contractId,
        signatureIndex,
        signatureDataUrl,
        signer,
      });

      sendJson(res, 200, { message: 'Đã lưu chữ ký.', id: updatedId });
    } catch (error) {
      const statusCode = error instanceof Error && Number.isInteger(error.statusCode) ? error.statusCode : 400;
      sendJson(res, statusCode, { message: error instanceof Error ? error.message : 'Không thể cập nhật chữ ký.' });
    }
    return;
  }

  sendJson(res, 404, { message: 'Không tìm thấy endpoint.' });
});

let keepAliveTimer = null;

server.on('error', (error) => {
  if (error?.code === 'EADDRINUSE') {
    console.log(`Cổng ${PORT} đang được backend khác sử dụng, tiếp tục dùng tiến trình đang chạy.`);
    if (!keepAliveTimer) {
      keepAliveTimer = setInterval(() => {}, 1000);
    }
    return;
  }

  throw error;
});

process.on('SIGINT', () => {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
  process.exit(0);
});

server.listen(PORT, () => {
  console.log(`Backend đang chạy tại http://localhost:${PORT}`);
});