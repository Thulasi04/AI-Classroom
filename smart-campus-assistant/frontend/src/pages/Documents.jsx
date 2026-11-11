import { useEffect, useState } from 'react';
import { Upload, FileText, Trash2, CheckCircle2, Database } from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import StatusBadge from '../components/common/StatusBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import { campusService } from '../services/campusService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { formatDateTime, formatFileSize, getErrorMessage } from '../utils/formatters';

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv', '.png', '.jpg', '.jpeg', '.webp'];

export default function Documents() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('personal_upload');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const list = await campusService.getDocuments();
      setDocuments(list);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to load documents'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
      e.target.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File exceeds maximum allowed size of 10 MB.');
      e.target.value = '';
      return;
    }

    setSelectedFile(file);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.warning('Please select a file first.');
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', title.trim() || selectedFile.name);
      formData.append('category', category);

      const uploaded = await campusService.uploadDocument(formData, setProgress);
      toast.success(`Processed & indexed "${uploaded.title}" (${uploaded.chunk_count} chunks)`);
      setSelectedFile(null);
      setTitle('');
      setProgress(0);
      await loadDocs();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Document upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    try {
      await campusService.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      toast.info('Document removed from storage and vector index');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to delete document'));
    }
  };

  return (
    <DashboardLayout title="Documents & RAG Knowledge Base">
      <div className="space-y-6">
        {/* Upload Form */}
        <form onSubmit={handleUpload} className="campus-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">
              Upload Document for AI RAG & Multimodal Processing
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Document Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Semester 6 OS Notes"
                className="campus-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="campus-input"
              >
                <option value="personal_upload">Personal Study Material</option>
                <option value="academic">Academic / Notes</option>
                <option value="syllabus">Syllabus</option>
                <option value="circular">Circular</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Select File (Max 10 MB)
              </label>
              <input
                type="file"
                accept={ALLOWED_EXTENSIONS.join(',')}
                onChange={handleFilePick}
                className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600/20 file:text-emerald-300 hover:file:bg-emerald-600/30 cursor-pointer"
              />
            </div>
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading and indexing into ChromaDB...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#0d1117] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-400">
              Supported: PDF, TXT, MD, CSV, PNG, JPG, JPEG, WEBP
            </p>
            <button type="submit" disabled={uploading || !selectedFile} className="campus-btn-primary">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Processing...' : 'Upload & Index'}</span>
            </button>
          </div>
        </form>

        {/* Documents List */}
        {loading ? (
          <LoadingSpinner label="Loading campus and personal documents..." />
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents available"
            description="Upload a PDF, image, or text document to index it into ChromaDB."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc) => {
              const canDelete = isAdmin || doc.uploaded_by_user_id === user?.id;
              return (
                <div key={doc.id} className="campus-card p-5 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-white truncate">{doc.title}</h3>
                          <p className="text-xs text-slate-400 truncate">{doc.filename}</p>
                        </div>
                      </div>
                      <StatusBadge
                        status={doc.is_indexed ? 'indexed' : 'open'}
                        label={doc.is_indexed ? 'Indexed' : 'Stored'}
                      />
                    </div>

                    {doc.extracted_summary && (
                      <p className="text-xs text-slate-400 mt-3 line-clamp-2">
                        {doc.extracted_summary}
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-[#222c3a] flex items-center justify-between text-xs text-slate-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="uppercase">{doc.file_type}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-400">
                        <Database className="w-3 h-3" /> {doc.chunk_count} chunks
                      </span>
                      <span>•</span>
                      <span className="capitalize">{doc.visibility}</span>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

