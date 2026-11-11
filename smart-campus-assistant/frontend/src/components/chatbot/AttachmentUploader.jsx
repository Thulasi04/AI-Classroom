import { useRef, useState } from 'react';
import { Paperclip, X, Loader2 } from 'lucide-react';
import { campusService } from '../../services/campusService';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/formatters';

const ALLOWED_ACCEPT = '.pdf,.txt,.md,.csv,.png,.jpg,.jpeg,.webp';

export default function AttachmentUploader({ attachedDoc, onAttached, onClear }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds 10 MB limit.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', file.name);
      formData.append('category', 'personal_upload');
      const doc = await campusService.uploadDocument(formData);
      onAttached(doc);
      toast.success(`Attached "${doc.filename}" for multimodal analysis`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload attachment'));
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_ACCEPT}
        onChange={handleFileChange}
        className="hidden"
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="campus-btn-secondary py-2 px-3"
        title="Attach PDF, image, or text document"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
        <span className="hidden sm:inline text-xs">Attach</span>
      </button>

      {attachedDoc && (
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 max-w-[200px]">
          <span className="truncate">{attachedDoc.filename}</span>
          <button
            type="button"
            onClick={onClear}
            className="text-emerald-200 hover:text-white"
            aria-label="Remove attachment"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

