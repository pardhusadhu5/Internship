import Modal from './Modal';
import { BACKEND_URL } from '../api/client';

export default function ReceiptPreview({ open, onClose, receipt }) {
  if (!receipt) return null;
  const fullUrl = receipt.startsWith('http') ? receipt : `${BACKEND_URL}${receipt.startsWith('/') ? '' : '/'}${receipt}`;
  const isPdf = receipt.endsWith('.pdf');

  return (
    <Modal open={open} onClose={onClose} title="Receipt Preview" large>
      {isPdf ? (
        <iframe src={fullUrl} title="Receipt" style={{ width: '100%', height: '500px', border: 'none', borderRadius: '8px' }} />
      ) : (
        <img src={fullUrl} alt="Receipt" className="receipt-preview" />
      )}
    </Modal>
  );
}
