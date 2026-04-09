import { useState } from 'react';
import ContractDocument from './components/ContractDocument';
import { useSignatureCanvas } from './hooks/useSignatureCanvas';
import { initialContractFormData } from './types/contract';

export default function ThoaThuanTrungBay() {
  const [formData, setFormData] = useState(initialContractFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const signatures = useSignatureCanvas(4);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveContract = async () => {
    setIsSaving(true);
    setSaveMessage('');

    const payload = {
      formData,
      signatures: signatures.getSignatureDataUrls(),
      savedAtClient: new Date().toISOString(),
    };

    try {
      const response = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Không thể lưu dữ liệu.');
      }

      const result = await response.json();
      setSaveMessage(`Đã lưu dữ liệu thành công (Mã: ${result.id}).`);
    } catch (error) {
      setSaveMessage('Lưu dữ liệu thất bại. Kiểm tra backend rồi thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const printDocument = () => window.print();

  return (
    <ContractDocument
      formData={formData}
      onInputChange={handleChange}
      onPrint={printDocument}
      onSave={saveContract}
      isSaving={isSaving}
      saveMessage={saveMessage}
      signatures={signatures}
    />
  );
}