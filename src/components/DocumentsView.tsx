import React, { useState, useEffect } from 'react';
import { FileBox, Plus, FileText, Image, Download, ExternalLink, Shield } from 'lucide-react';
import { VillageDocument, User as UserType, Village } from '../types.ts';
import { api } from '../services/api.ts';
import { Language, t } from '../translations.ts';

interface DocumentsViewProps {
  currentUser: UserType;
  villages: Village[];
  lang: Language;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ currentUser, villages, lang }) => {
  const [documents, setDocuments] = useState<VillageDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Upload Form
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('Document');
  const [fileUrl, setFileUrl] = useState('');
  const [villageId, setVillageId] = useState(currentUser.village_id || 'V_GOR01');
  const [isUploading, setIsUploading] = useState(false);

  const isVillageHead = currentUser.role === 'VILLAGE_HEAD';

  useEffect(() => {
    loadDocuments();
  }, [currentUser]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (err: any) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;
    setIsUploading(true);
    try {
      const targetVillage = isVillageHead ? (currentUser.village_id || 'V_GOR01') : villageId;
      await api.createDocument({
        file_name: fileName,
        category: category as any,
        file_url: fileUrl || 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800&auto=format&fit=crop&q=60',
        village_id: targetVillage,
        file_size: 1024 * 340
      });
      setShowUploadModal(false);
      setFileName('');
      setFileUrl('');
      loadDocuments();
    } catch (err: any) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const categories = [
    'Photo',
    'Document',
    'Report',
    'Meeting Minutes',
    'Estimate / Sanction Order',
    'Other'
  ];

  const filteredDocs = selectedCategory
    ? documents.filter(d => d.category === selectedCategory)
    : documents;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{t('documents', lang)}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isVillageHead
              ? `Repository of sanctioned works, photos, and records for ${getVillageName(currentUser.village_id)}`
              : 'Constituency-wide documents, orders, and photographic proof repository'}
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Upload Record / Photo
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            !selectedCategory ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All Records ({documents.length})
        </button>
        {categories.map(c => (
          <button
            key={c}
            onClick={() => setSelectedCategory(c)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === c ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-xs text-slate-400 py-6 text-center col-span-3">Loading documents...</p>
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-3 bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-xs">
            No records or documents found.
          </div>
        ) : (
          filteredDocs.map(doc => {
            const isImage = doc.category === 'Photo';
            return (
              <div
                key={doc.file_id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition-all"
              >
                {isImage && (
                  <div className="h-32 bg-slate-100 overflow-hidden">
                    <img
                      src={doc.file_url}
                      alt={doc.file_name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}

                <div className="p-4 space-y-2 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {doc.category}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold">
                      {getVillageName(doc.village_id)}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug">{doc.file_name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {(doc.file_size / 1024).toFixed(0)} KB • {doc.uploaded_by}
                  </p>
                </div>

                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-1">Upload Document or Photo</h3>
            <p className="text-xs text-slate-500 mb-4">Attach sanction orders, project photos, or committee minutes</p>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title / File Name</label>
                <input
                  type="text"
                  required
                  value={fileName}
                  onChange={e => setFileName(e.target.value)}
                  placeholder="e.g. CC Road Inspection Photo Stage 2"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {!isVillageHead && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Village</label>
                  <select
                    value={villageId}
                    onChange={e => setVillageId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
                  >
                    {villages.map(v => (
                      <option key={v.village_id} value={v.village_id}>
                        {v.village_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">File URL / Image Link</label>
                <input
                  type="url"
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Save Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
