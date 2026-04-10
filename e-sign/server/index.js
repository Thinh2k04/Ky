import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = Number(process.env.PORT || 4000);
const DATA_FILE = join(__dirname, 'data', 'contracts.json');
const SIGNATURE_FILE = join(__dirname, 'data', 'signatures.json');
const MAX_BODY_SIZE = 15 * 1024 * 1024;
const SIGN_TITLES = ['CỬA HÀNG', 'NHÂN VIÊN', 'GIÁM SÁT', 'CÔNG TY TNHH THƯƠNG MẠI ĐẠI VIỆT FOOD'];
const EMPTY_CONTRACTS = '[]\n';
const EMPTY_SIGNATURES = '[]\n';

const sendJson = (res, statusCode, payload) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
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

const toSafeSignatureHistory = (value, contractId, fallbackSavedAtClient, fallbackSignatures = []) => {
  const source = Array.isArray(value) ? value : [];

  return SIGN_TITLES.map((title, index) => {
    const previousEntry = source[index];
    const fallbackSignature = typeof fallbackSignatures[index] === 'string' ? fallbackSignatures[index] : '';
    const signatureDataUrl = typeof previousEntry?.signatureDataUrl === 'string' ? previousEntry.signatureDataUrl : fallbackSignature;

    return {
      id: typeof previousEntry?.id === 'string' ? previousEntry.id : `ls-${contractId}-${index + 1}`,
      hopDongId: typeof previousEntry?.hopDongId === 'string' ? previousEntry.hopDongId : contractId,
      hopDongChiTietId: typeof previousEntry?.hopDongChiTietId === 'string' ? previousEntry.hopDongChiTietId : contractId,
      vaiTro: typeof previousEntry?.vaiTro === 'string' ? previousEntry.vaiTro : title,
      nguoiKy: typeof previousEntry?.nguoiKy === 'string' ? previousEntry.nguoiKy : title,
      signatureDataUrl,
      trangThai: previousEntry?.trangThai === 'huy' ? 'huy' : signatureDataUrl ? 'da_ky' : 'trong',
      kyLucAt: typeof previousEntry?.kyLucAt === 'string' ? previousEntry.kyLucAt : fallbackSavedAtClient,
    };
  });
};

const createSignatureRecord = (contractId, signatures, history, savedAtClient) => ({
  contractId,
  hopDongChiTietId: contractId,
  signatures: toSafeSignatures(signatures),
  lichSuKyDuyet: toSafeSignatureHistory(history, contractId, savedAtClient, signatures),
  savedAtClient,
  updatedAt: savedAtClient,
});

const normalizeSignatureRecord = (record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }

  const contractId = typeof record.contractId === 'string' ? record.contractId : typeof record.hopDongChiTietId === 'string' ? record.hopDongChiTietId : typeof record.hopDongId === 'string' ? record.hopDongId : '';

  if (!contractId) {
    return null;
  }

  const savedAtClient = typeof record.savedAtClient === 'string' ? record.savedAtClient : typeof record.updatedAt === 'string' ? record.updatedAt : new Date().toISOString();

  return createSignatureRecord(contractId, record.signatures, record.lichSuKyDuyet, savedAtClient);
};

const extractSignatureRecordFromContract = (record) => {
  const contractId = typeof record?.id === 'string' ? record.id : '';

  if (!contractId) {
    return null;
  }

  const signatures = Array.isArray(record?.signatures) ? record.signatures : [];
  const history = Array.isArray(record?.lichSuKyDuyet) ? record.lichSuKyDuyet : [];

  if (!signatures.some(Boolean) && !history.some((entry) => Boolean(entry?.signatureDataUrl))) {
    return null;
  }

  const savedAtClient = typeof record?.savedAtClient === 'string' ? record.savedAtClient : typeof record?.createdAt === 'string' ? record.createdAt : new Date().toISOString();
  return createSignatureRecord(contractId, signatures, history, savedAtClient);
};

const mergeSignatureRecord = (contract, signatureRecord) => {
  const contractId = typeof contract?.id === 'string' ? contract.id : '';
  const fallbackSignatures = Array.isArray(contract?.signatures) ? contract.signatures : [];
  const fallbackHistory = Array.isArray(contract?.lichSuKyDuyet) ? contract.lichSuKyDuyet : [];
  const mergedSignatures = signatureRecord ? toSafeSignatures(signatureRecord.signatures) : toSafeSignatures(fallbackSignatures);
  const mergedHistory = signatureRecord
    ? toSafeSignatureHistory(signatureRecord.lichSuKyDuyet, contractId, signatureRecord.savedAtClient || contract?.savedAtClient || contract?.createdAt || new Date().toISOString(), mergedSignatures)
    : toSafeSignatureHistory(fallbackHistory, contractId, contract?.savedAtClient || contract?.createdAt || new Date().toISOString(), mergedSignatures);
  const signedCount = mergedSignatures.filter(Boolean).length;
  const nextTrangThai = signedCount === 0 ? 'cho_ky' : signedCount >= SIGN_TITLES.length ? 'da_ky' : 'da_luu';

  return {
    ...contract,
    savedAtClient: signatureRecord?.savedAtClient || contract.savedAtClient || null,
    signatures: mergedSignatures,
    lichSuKyDuyet: mergedHistory,
    hopDong: {
      ...contract.hopDong,
      trangThai: nextTrangThai,
    },
  };
};

const readJsonArray = async (filePath, emptyContent) => {
  try {
    const raw = await readFile(filePath, 'utf8');
    const parsed = raw.trim() ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await writeFile(filePath, emptyContent, 'utf8');
    return [];
  }
};

const writeJsonArray = async (filePath, value) => {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readSignatureRecords = async () => {
  await ensureDataFile();
  const rawRecords = await readJsonArray(SIGNATURE_FILE, EMPTY_SIGNATURES);
  return rawRecords.map((record) => normalizeSignatureRecord(record)).filter(Boolean);
};

const findSignatureRecordByContractId = async (contractId) => {
  const signatureRecords = await readSignatureRecords();
  return signatureRecords.find((record) => record.contractId === contractId) || null;
};

const writeSignatureRecords = async (records) => {
  const compacted = records.map((record) =>
    createSignatureRecord(
      typeof record.contractId === 'string' ? record.contractId : typeof record.hopDongChiTietId === 'string' ? record.hopDongChiTietId : '',
      record.signatures,
      record.lichSuKyDuyet,
      record.savedAtClient || record.updatedAt || new Date().toISOString()
    )
  );
  await writeJsonArray(SIGNATURE_FILE, compacted);
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
  const currentSignatureRecord = await findSignatureRecordByContractId(contractId);
  const nextSignatures = toSafeSignatures(currentSignatureRecord?.signatures || targetContract?.signatures);
  nextSignatures[signatureIndex] = signatureDataUrl;

  const now = new Date().toISOString();
  const nextEntries = SIGN_TITLES.map((title, index) => {
    const previousEntry = Array.isArray(currentSignatureRecord?.lichSuKyDuyet)
      ? currentSignatureRecord.lichSuKyDuyet[index]
      : Array.isArray(targetContract?.lichSuKyDuyet)
        ? targetContract.lichSuKyDuyet[index]
        : null;
    const entrySignature = nextSignatures[index] || '';

    return {
      id: previousEntry?.id || `ls-${targetContract.hopDong?.id || targetContract.id}-${index + 1}`,
      hopDongId: previousEntry?.hopDongId || targetContract.hopDong?.id || `hd-${targetContract.id}`,
      hopDongChiTietId: previousEntry?.hopDongChiTietId || targetContract.id,
      vaiTro: title,
      nguoiKy: index === signatureIndex ? signer || title : previousEntry?.nguoiKy || title,
      signatureDataUrl: entrySignature,
      trangThai: entrySignature ? 'da_ky' : 'trong',
      kyLucAt: index === signatureIndex ? now : previousEntry?.kyLucAt || now,
    };
  });

  const signedCount = nextSignatures.filter(Boolean).length;
  const nextTrangThai = signedCount === 0 ? 'cho_ky' : signedCount >= SIGN_TITLES.length ? 'da_ky' : 'da_luu';

  const nextSignatureRecords = await readSignatureRecords();
  const signatureRecordIndex = nextSignatureRecords.findIndex((item) => item.contractId === contractId);
  const nextSignatureRecord = createSignatureRecord(contractId, nextSignatures, nextEntries, now);

  if (signatureRecordIndex >= 0) {
    nextSignatureRecords[signatureRecordIndex] = nextSignatureRecord;
  } else {
    nextSignatureRecords.push(nextSignatureRecord);
  }

  contracts[contractIndex] = {
    ...targetContract,
    savedAtClient: now,
    hopDong: {
      ...targetContract.hopDong,
      trangThai: nextTrangThai,
    },
  };

  await writeSignatureRecords(nextSignatureRecords);
  await writeContracts(contracts);
  return targetContract.id;
};

const clearContractSignatureByRole = async ({ contractId, signatureIndex, signer }) => {
  if (!Number.isInteger(signatureIndex) || signatureIndex < 0 || signatureIndex > 3) {
    throw new Error('Vị trí chữ ký không hợp lệ.');
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
  const currentSignatureRecord = await findSignatureRecordByContractId(contractId);
  const nextSignatures = toSafeSignatures(currentSignatureRecord?.signatures || targetContract?.signatures);
  nextSignatures[signatureIndex] = '';

  const now = new Date().toISOString();
  const nextEntries = SIGN_TITLES.map((title, index) => {
    const previousEntry = Array.isArray(currentSignatureRecord?.lichSuKyDuyet)
      ? currentSignatureRecord.lichSuKyDuyet[index]
      : Array.isArray(targetContract?.lichSuKyDuyet)
        ? targetContract.lichSuKyDuyet[index]
        : null;
    const entrySignature = nextSignatures[index] || '';

    return {
      id: previousEntry?.id || `ls-${targetContract.hopDong?.id || targetContract.id}-${index + 1}`,
      hopDongId: previousEntry?.hopDongId || targetContract.hopDong?.id || `hd-${targetContract.id}`,
      hopDongChiTietId: previousEntry?.hopDongChiTietId || targetContract.id,
      vaiTro: title,
      nguoiKy: index === signatureIndex ? signer || previousEntry?.nguoiKy || title : previousEntry?.nguoiKy || title,
      signatureDataUrl: entrySignature,
      trangThai: entrySignature ? 'da_ky' : 'trong',
      kyLucAt: now,
    };
  });

  const signedCount = nextSignatures.filter(Boolean).length;
  const nextTrangThai = signedCount === 0 ? 'cho_ky' : signedCount >= SIGN_TITLES.length ? 'da_ky' : 'da_luu';

  const nextSignatureRecords = await readSignatureRecords();
  const signatureRecordIndex = nextSignatureRecords.findIndex((item) => item.contractId === contractId);
  const nextSignatureRecord = createSignatureRecord(contractId, nextSignatures, nextEntries, now);

  if (signatureRecordIndex >= 0) {
    nextSignatureRecords[signatureRecordIndex] = nextSignatureRecord;
  } else {
    nextSignatureRecords.push(nextSignatureRecord);
  }

  contracts[contractIndex] = {
    ...targetContract,
    savedAtClient: now,
    hopDong: {
      ...targetContract.hopDong,
      trangThai: nextTrangThai,
    },
  };

  await writeSignatureRecords(nextSignatureRecords);
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

  try {
    const content = await readFile(SIGNATURE_FILE, 'utf8');
    if (!content.trim()) {
      await writeFile(SIGNATURE_FILE, EMPTY_SIGNATURES, 'utf8');
    }
  } catch {
    await writeFile(SIGNATURE_FILE, EMPTY_SIGNATURES, 'utf8');
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
    hopDongChiTietId: contractId,
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

const mergeLegacySignatureData = async (contracts) => {
  const signatureRecords = await readSignatureRecords();
  const signatureRecordMap = new Map(signatureRecords.map((record) => [record.contractId, record]));
  let needsSignatureWrite = false;

  const mergedContracts = contracts.map((contract) => {
    const legacySignatureRecord = extractSignatureRecordFromContract(contract);
    const existingSignatureRecord = signatureRecordMap.get(contract.id);

    if (!existingSignatureRecord && legacySignatureRecord) {
      signatureRecordMap.set(contract.id, legacySignatureRecord);
      signatureRecords.push(legacySignatureRecord);
      needsSignatureWrite = true;
    }

    return mergeSignatureRecord(contract, existingSignatureRecord || legacySignatureRecord);
  });

  if (needsSignatureWrite) {
    await writeSignatureRecords(signatureRecords);
    await writeContracts(mergedContracts);
  }

  return mergedContracts;
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
    const contracts = Array.isArray(parsed) ? parsed.map((record) => normalizeStoredRecord(record)) : [];
    return mergeLegacySignatureData(contracts);
  } catch {
    await writeFile(DATA_FILE, EMPTY_CONTRACTS, 'utf8');
    return [];
  }
};

const writeContracts = async (contracts) => {
  const compacted = contracts.map((record) => toCompactRecord(record));
  await writeJsonArray(DATA_FILE, compacted);
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
      const now = new Date().toISOString();
      const recordId = randomUUID();
      const signatures = toSafeSignatures(payload?.signatures);
      const signatureHistory = Array.isArray(payload?.lichSuKyDuyet) ? payload.lichSuKyDuyet : [];
      const signatureRecord = createSignatureRecord(recordId, signatures, signatureHistory, payload?.savedAtClient ?? now);
      const record = normalizeStoredRecord({
        id: recordId,
        createdAt: now,
        savedAtClient: payload?.savedAtClient ?? null,
        savedBy: payload?.savedBy ?? null,
        khachHang: payload?.khachHang ?? null,
        hopDongChiTiet: payload?.hopDongChiTiet ?? null,
        formData: payload?.formData ?? null,
        tepDinhKem: Array.isArray(payload?.tepDinhKem) ? payload.tepDinhKem : [],
      });

      contracts.push(record);
      await writeContracts(contracts);

      const signatureRecords = await readSignatureRecords();
      const signatureRecordIndex = signatureRecords.findIndex((item) => item.contractId === recordId || item.hopDongChiTietId === recordId);
      if (signatureRecordIndex >= 0) {
        signatureRecords[signatureRecordIndex] = signatureRecord;
      } else {
        signatureRecords.push(signatureRecord);
      }
      await writeSignatureRecords(signatureRecords);

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

  if (req.method === 'DELETE' && /^\/api\/contracts\/[^/]+\/signatures\/\d+\/?$/.test(path)) {
    try {
      const [, , , encodedContractId, , encodedSignatureIndex] = path.split('/');
      const contractId = decodeURIComponent(encodedContractId || '');
      const signatureIndex = Number(decodeURIComponent(encodedSignatureIndex || ''));
      const updatedId = await clearContractSignatureByRole({
        contractId,
        signatureIndex,
        signer: '',
      });

      sendJson(res, 200, { message: 'Đã xóa chữ ký.', id: updatedId });
    } catch (error) {
      const statusCode = error instanceof Error && Number.isInteger(error.statusCode) ? error.statusCode : 400;
      sendJson(res, statusCode, { message: error instanceof Error ? error.message : 'Không thể xóa chữ ký.' });
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

  if (req.method === 'POST' && path === '/api/contracts/signatures/delete') {
    try {
      const payload = await readBody(req);
      const signatureIndex = Number(payload?.signatureIndex);
      const contractId = typeof payload?.contractId === 'string' ? payload.contractId : '';

      const updatedId = await clearContractSignatureByRole({
        contractId,
        signatureIndex,
        signer: '',
      });

      sendJson(res, 200, { message: 'Đã xóa chữ ký.', id: updatedId });
    } catch (error) {
      const statusCode = error instanceof Error && Number.isInteger(error.statusCode) ? error.statusCode : 400;
      sendJson(res, statusCode, { message: error instanceof Error ? error.message : 'Không thể xóa chữ ký.' });
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