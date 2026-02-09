'use client';

import { useState, useEffect } from 'react';
import {
  FolderIcon,
  DocumentIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  EllipsisVerticalIcon,
} from '@heroicons/react/24/outline';

interface DealFolder {
  id: string;
  name: string;
  parentFolderId?: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  creator?: {
    firstName: string;
    lastName: string;
  };
  _count?: {
    files: number;
    subFolders: number;
  };
}

interface DealFile {
  id: string;
  folderId?: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  uploadedBy: string;
  createdAt: string;
  folder?: {
    id: string;
    name: string;
  };
  uploader?: {
    firstName: string;
    lastName: string;
  };
}

interface DealFileManagerProps {
  propertyId: string;
  authToken: string;
  readOnly?: boolean;
}

export default function DealFileManager({
  propertyId,
  authToken,
  readOnly = false,
}: DealFileManagerProps) {
  const [folders, setFolders] = useState<DealFolder[]>([]);
  const [files, setFiles] = useState<DealFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DealFile | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDescription, setUploadDescription] = useState('');
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');

  useEffect(() => {
    fetchFilesAndFolders();
  }, [propertyId, currentFolderId]);

  const fetchFilesAndFolders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/investors/properties/${propertyId}/files`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched folders:', data.folders);
        console.log('Fetched files:', data.files);
        setFolders(data.folders || []);
        // Filter files by current folder
        if (currentFolderId) {
          setFiles((data.files || []).filter((f: DealFile) => f.folderId === currentFolderId));
        } else {
          setFiles((data.files || []).filter((f: DealFile) => !f.folderId));
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch files:', response.status, errorText);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (currentFolderId) formData.append('folderId', currentFolderId);
      if (uploadDescription) formData.append('description', uploadDescription);

      const response = await fetch(`/api/investors/properties/${propertyId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        await fetchFilesAndFolders();
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadDescription('');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName) return;

    try {
      const response = await fetch(`/api/investors/properties/${propertyId}/files/folders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: folderName,
          parentFolderId: currentFolderId || null,
          description: folderDescription || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Created folder:', data.folder);
        await fetchFilesAndFolders();
        setShowFolderModal(false);
        setFolderName('');
        setFolderDescription('');
      } else {
        const error = await response.json();
        console.error('Failed to create folder:', error);
        alert(error.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(
        `/api/investors/properties/${propertyId}/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        await fetchFilesAndFolders();
      }
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? It must be empty.')) return;

    try {
      const response = await fetch(
        `/api/investors/properties/${propertyId}/files/folders/${folderId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (response.ok) {
        await fetchFilesAndFolders();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
    }
  };

  const handleDownload = async (file: DealFile) => {
    try {
      const response = await fetch(
        `/api/investors/properties/${propertyId}/files/${file.id}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) return;
      const data = await response.json();

      if (data.local) {
        const downloadRes = await fetch(data.url, {
          headers: { 'Authorization': `Bearer ${authToken}` },
        });
        if (!downloadRes.ok) return;
        const blob = await downloadRes.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = data.fileName || file.originalName;
        a.click();
        URL.revokeObjectURL(blobUrl);
      } else {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const currentFolders = folders.filter(
    (f) => (f.parentFolderId || null) === currentFolderId
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-100 rounded w-48 mb-5"></div>
          <div className="space-y-2">
            <div className="h-16 bg-gray-100 rounded"></div>
            <div className="h-16 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border p-5">
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <DocumentIcon className="h-5 w-5 mr-2 text-blue-600" />
            Documents
          </h3>
          {!readOnly && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowFolderModal(true)}
                className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="New Folder"
              >
                <FolderIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                title="Upload File"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Manage documents and files for this deal
        </p>
      </div>

      {/* Breadcrumb */}
      {currentFolderId && (
        <div className="mb-3 flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
          <button
            onClick={() => setCurrentFolderId(null)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Root
          </button>
          <span>/</span>
          <span className="text-gray-700">
            {folders.find((f) => f.id === currentFolderId)?.name}
          </span>
        </div>
      )}

      {/* Content Area - Scrollable */}
      <div className="max-h-[400px] overflow-y-auto pr-1 -mr-1">
        {/* Folders */}
        {currentFolders.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Folders</h4>
            <div className="space-y-1.5">
              {currentFolders.map((folder) => (
                <div
                  key={folder.id}
                  className="group border border-gray-200 rounded-lg p-2.5 hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FolderIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{folder.name}</p>
                        {folder._count && (
                          <p className="text-xs text-gray-500">
                            {folder._count.files} file{folder._count.files !== 1 ? 's' : ''}, {folder._count.subFolders} folder{folder._count.subFolders !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    {!readOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition-opacity"
                        title="Delete folder"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Files</h4>
          {files.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
              <DocumentIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">No files yet</p>
              {!readOnly && (
                <p className="text-xs text-gray-400 mt-1">Click the upload button to get started</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group border border-gray-200 rounded-lg p-2.5 hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <DocumentIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.originalName}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                          <span>{formatFileSize(file.fileSize)}</span>
                          <span>•</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownload(file)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Download"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                      </button>
                      {!readOnly && (
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Upload File</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Create Folder</h3>
              <button
                onClick={() => setShowFolderModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Folder Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

