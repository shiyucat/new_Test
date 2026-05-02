import React, { useState, useEffect } from 'react';
import axios from 'axios';

function DirectorySelector() {
  const [directories, setDirectories] = useState([]);
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDirectories();
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleMessage = (event) => {
    if (event.data && event.data.type === 'INIT_DIRECTORY') {
      setSelectedDirectory(event.data.selectedDirectory || null);
    }
  };

  const fetchDirectories = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/directories');
      setDirectories(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching directories:', err);
      setError('获取目录列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleSelect = (directory) => {
    setSelectedDirectory(directory);
  };

  const handleConfirm = () => {
    if (window.parent) {
      window.parent.postMessage({
        type: 'SELECT_DIRECTORY',
        directory: selectedDirectory
      }, '*');
    }
  };

  const renderDirectoryItem = (directory, level = 0) => {
    const hasChildren = directory.children && directory.children.length > 0;
    const isExpanded = expandedIds.has(directory.id);
    const isSelected = selectedDirectory && selectedDirectory.id === directory.id;

    return (
      <div key={directory.id}>
        <div 
          className={`directory-item ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${20 + level * 20}px` }}
          onClick={() => handleSelect(directory)}
        >
          {hasChildren ? (
            <span 
              className="expand-icon" 
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(directory.id);
              }}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="expand-icon" style={{ visibility: 'hidden' }}>▶</span>
          )}
          <span className="directory-name">{directory.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="directory-children">
            {directory.children.map(child => renderDirectoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="directory-selector-container">
      <h2 className="selector-title">选择目录</h2>
      
      <div className="selector-info">
        已选择: <span className="selected-count">{selectedDirectory ? selectedDirectory.name : '未选择'}</span>
      </div>

      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : directories.length === 0 ? (
        <div className="empty-state">
          <h3>暂无目录</h3>
          <p>请先在测试用例列表中创建目录</p>
        </div>
      ) : (
        <div className="directory-tree">
          {directories.map(directory => renderDirectoryItem(directory))}
        </div>
      )}

      <div className="selector-actions">
        <button className="cancel-btn" onClick={() => {
          if (window.parent) {
            window.parent.postMessage({ type: 'CANCEL_DIRECTORY' }, '*');
          }
        }}>
          取消
        </button>
        <button 
          className="confirm-btn" 
          onClick={handleConfirm}
          disabled={!selectedDirectory}
        >
          确认选择
        </button>
      </div>
    </div>
  );
}

export default DirectorySelector;
