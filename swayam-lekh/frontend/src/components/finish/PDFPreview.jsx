import React, { useState } from 'react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import { Download, UploadCloud, FileText } from 'lucide-react';

export default function PDFPreview({ studentData, answers, onDownload, onUpload }) {
  const [generating, setGenerating] = useState(false);

  const handleGen = async () => {
    setGenerating(true);
    if (onDownload) await onDownload();
    setGenerating(false);
  };

  return (
    <div style={{ padding: '32px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', backgroundColor: 'var(--surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
         <FileText size={40} />
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '24px', marginBottom: '8px' }}>Final Output Generation</h3>
        <p style={{ color: 'var(--ink2)' }}>Answer sheet is ready to be exported to PDF and uploaded securely.</p>
      </div>

      <div style={{ display: 'flex', gap: '16px', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button onClick={handleGen} variant="outline" disabled={generating} size="lg" icon={generating ? <Spinner size={20} /> : <Download size={20} />}>
          {generating ? 'Generating PDF...' : 'Download PDF'}
        </Button>
        <Button onClick={onUpload} variant="primary" size="lg" icon={<UploadCloud size={20} />}>
          Upload to Database
        </Button>
      </div>
    </div>
  );
}