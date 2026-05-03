import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function TestCaseList() {
  const [testCases, setTestCases] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [selectedDirectoryId, setSelectedDirectoryId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDirectoryName, setNewDirectoryName] = useState('');
  const [parentDirectoryId, setParentDirectoryId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [directorySearchTerm, setDirectorySearchTerm] = useState('');
  
  const [selectedTestCases, setSelectedTestCases] = useState(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showMoveDirectoryModal, setShowMoveDirectoryModal] = useState(false);
  const [directoryToMove, setDirectoryToMove] = useState(null);
  const [targetDirectoryId, setTargetDirectoryId] = useState(null);
  const [moveLoading, setMoveLoading] = useState(false);
  
  const navigate = useNavigate();
  const iframeRef = useRef(null);

  useEffect(() => {
    fetchDirectories();
  }, []);

  useEffect(() => {
    fetchTestCases();
  }, [selectedDirectoryId, currentPage, pageSize]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SELECT_DIRECTORY') {
        const directory = event.data.directory;
        if (directory) {
          setTargetDirectoryId(directory.id);
        }
        setShowCreateModal(false);
        setShowMoveDirectoryModal(false);
      } else if (event.data && event.data.type === 'CANCEL_DIRECTORY') {
        setShowCreateModal(false);
        setShowMoveDirectoryModal(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchDirectories = async () => {
    try {
      const response = await axios.get('/api/directories');
      setDirectories(response.data);
    } catch (err) {
      console.error('Error fetching directories:', err);
    }
  };

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize
      };
      if (selectedDirectoryId !== null) {
        params.directory_id = selectedDirectoryId;
      }
      const response = await axios.get('/api/testcases', { params });
      setTestCases(response.data.testcases);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
      setError('');
    } catch (err) {
      console.error('Error fetching test cases:', err);
      setError('获取用例列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleSelectDirectory = (id) => {
    setSelectedDirectoryId(id);
    setCurrentPage(1);
    setSelectedTestCases(new Set());
  };

  const handleAddRootDirectory = () => {
    setParentDirectoryId(null);
    setNewDirectoryName('');
    setShowCreateModal(true);
  };

  const handleAddSubDirectory = (parentId, e) => {
    e.stopPropagation();
    setParentDirectoryId(parentId);
    setNewDirectoryName('');
    setShowCreateModal(true);
  };

  const handleCreateDirectory = async () => {
    if (!newDirectoryName || newDirectoryName.trim() === '') {
      return;
    }

    try {
      const data = { name: newDirectoryName.trim() };
      if (parentDirectoryId !== null) {
        data.parent_id = parentDirectoryId;
      }
      await axios.post('/api/directories', data);
      fetchDirectories();
      setShowCreateModal(false);
      setNewDirectoryName('');
    } catch (err) {
      console.error('Error creating directory:', err);
      setError('创建目录失败，请稍后重试');
    }
  };

  const handleDeleteDirectory = async (id, e) => {
    e.stopPropagation();
    if (!confirm('确定要删除此目录吗？')) {
      return;
    }

    try {
      await axios.delete(`/api/directories/${id}`);
      if (selectedDirectoryId === id) {
        setSelectedDirectoryId(null);
      }
      fetchDirectories();
    } catch (err) {
      console.error('Error deleting directory:', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('删除目录失败，请稍后重试');
      }
    }
  };

  const handleEditClick = (id, e) => {
    e.stopPropagation();
    navigate(`/edit/${id}`);
  };

  const matchesSearch = (directory, term) => {
    if (!term || term.trim() === '') return true;
    const lowerTerm = term.toLowerCase();
    if (directory.name.toLowerCase().includes(lowerTerm)) return true;
    if (directory.children) {
      for (const child of directory.children) {
        if (matchesSearch(child, term)) return true;
      }
    }
    return false;
  };

  const handleSelectTestCase = (testCaseId, e) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTestCases);
    if (newSelected.has(testCaseId)) {
      newSelected.delete(testCaseId);
    } else {
      newSelected.add(testCaseId);
    }
    setSelectedTestCases(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTestCases.size === testCases.length && testCases.length > 0) {
      setSelectedTestCases(new Set());
    } else {
      const allIds = new Set(testCases.map(tc => tc.id));
      setSelectedTestCases(allIds);
    }
  };

  const handleExport = async () => {
    if (selectedTestCases.size === 0) {
      alert('请至少选择一个测试用例');
      return;
    }

    try {
      const testCaseIds = Array.from(selectedTestCases);
      const response = await axios.post('/api/testcases/export', 
        { test_case_ids: testCaseIds },
        { responseType: 'blob' }
      );

      const contentDisposition = response.headers['content-disposition'];
      let fileName = '测试用例.xlsx';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename=(.+)/);
        if (matches && matches[1]) {
          fileName = matches[1];
        }
      }

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Error exporting test cases:', err);
      if (err.response && err.response.data) {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result);
            alert(data.error || '导出失败，请稍后重试');
          } catch {
            alert('导出失败，请稍后重试');
          }
        };
        reader.readAsText(err.response.data);
      } else {
        alert('导出失败，请稍后重试');
      }
    }
  };

  const handleMoveDirectory = (directory, e) => {
    e.stopPropagation();
    setDirectoryToMove(directory);
    setTargetDirectoryId(null);
    setShowMoveDirectoryModal(true);
  };

  const confirmMoveDirectory = async () => {
    if (!directoryToMove) return;

    try {
      setMoveLoading(true);
      const data = {};
      if (targetDirectoryId !== null) {
        data.new_parent_id = targetDirectoryId;
      }
      await axios.post(`/api/directories/${directoryToMove.id}/move`, data);
      fetchDirectories();
      setShowMoveDirectoryModal(false);
      setDirectoryToMove(null);
      setTargetDirectoryId(null);
    } catch (err) {
      console.error('Error moving directory:', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('移动目录失败，请稍后重试');
      }
    } finally {
      setMoveLoading(false);
    }
  };

  const handleMoveTestCases = () => {
    if (selectedTestCases.size === 0) {
      alert('请至少选择一个测试用例');
      return;
    }
    setTargetDirectoryId(null);
    setShowMoveModal(true);
  };

  const confirmMoveTestCases = async () => {
    if (selectedTestCases.size === 0) return;

    try {
      setMoveLoading(true);
      const testCaseIds = Array.from(selectedTestCases);
      const data = { test_case_ids: testCaseIds };
      if (targetDirectoryId !== null) {
        data.target_directory_id = targetDirectoryId;
      }
      await axios.post('/api/testcases/batch/move', data);
      fetchTestCases();
      setSelectedTestCases(new Set());
      setShowMoveModal(false);
      setTargetDirectoryId(null);
    } catch (err) {
      console.error('Error moving test cases:', err);
      if (err.response && err.response.data && err.response.data.error) {
        alert(err.response.data.error);
      } else {
        alert('移动测试用例失败，请稍后重试');
      }
    } finally {
      setMoveLoading(false);
    }
  };

  const renderDirectoryItem = (directory, level = 0) => {
    if (!matchesSearch(directory, directorySearchTerm)) {
      return null;
    }
    
    const hasChildren = directory.children && directory.children.length > 0;
    const hasVisibleChildren = hasChildren && directory.children.some(child => matchesSearch(child, directorySearchTerm));
    const isExpanded = expandedIds.has(directory.id);
    const isSelected = selectedDirectoryId === directory.id;

    return (
      <div key={directory.id} className="directory-tree-item">
        <div 
          className={`directory-tree-node ${isSelected ? 'active' : ''}`}
          onClick={() => handleSelectDirectory(directory.id)}
          style={{ paddingLeft: `${15 + level * 15}px` }}
        >
          {hasVisibleChildren ? (
            <span 
              className="node-toggle" 
              onClick={(e) => toggleExpand(directory.id, e)}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="node-toggle" style={{ visibility: 'hidden' }}>▶</span>
          )}
          <span className="node-icon">📁</span>
          <span className="node-name">{directory.name}</span>
          <div className="node-actions">
            <button
              type="button"
              className="node-action-btn"
              onClick={(e) => handleAddSubDirectory(directory.id, e)}
              title="新建子目录"
            >
              +
            </button>
            <button
              type="button"
              className="node-action-btn"
              onClick={(e) => handleMoveDirectory(directory, e)}
              title="移动目录"
              style={{ fontSize: '11px' }}
            >
              ➡
            </button>
            <button
              type="button"
              className="node-action-btn delete"
              onClick={(e) => handleDeleteDirectory(directory.id, e)}
              title="删除目录"
            >
              ×
            </button>
          </div>
        </div>
        {hasVisibleChildren && isExpanded && (
          <div className="directory-tree-children">
            {directory.children.map(child => renderDirectoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const renderDirectorySelector = (directories, level = 0, excludeId = null) => {
    return directories.map(directory => {
      if (excludeId !== null && directory.id === excludeId) {
        return null;
      }
      
      return (
        <div key={directory.id}>
          <div 
            className={`directory-selector-item ${targetDirectoryId === directory.id ? 'selected' : ''}`}
            style={{ paddingLeft: `${20 + level * 20}px` }}
            onClick={() => setTargetDirectoryId(directory.id)}
          >
            <span className="directory-selector-icon">📁</span>
            <span className="directory-selector-name">{directory.name}</span>
          </div>
          {directory.children && directory.children.length > 0 && (
            <div className="directory-selector-children">
              {renderDirectorySelector(directory.children, level + 1, excludeId)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="testcase-page-container">
      <div className="directory-sidebar">
        <div className="directory-search-container">
          <input
            type="text"
            className="directory-search-input"
            placeholder="搜索目录..."
            value={directorySearchTerm}
            onChange={(e) => setDirectorySearchTerm(e.target.value)}
          />
        </div>
        <div className="directory-list-container">
          <div 
            className={`directory-tree-node all-cases-node ${selectedDirectoryId === null ? 'active' : ''}`}
            onClick={() => handleSelectDirectory(null)}
          >
            <span className="node-icon">📋</span>
            <span className="node-name">全部用例</span>
            <button
              type="button"
              className="node-action-btn add-root-inline"
              onClick={(e) => {
                e.stopPropagation();
                handleAddRootDirectory();
              }}
              title="新建根目录"
            >
              +
            </button>
          </div>
          {directories.map(directory => renderDirectoryItem(directory))}
        </div>
      </div>

      <div className="testcase-main-content">
        <div className="action-bar">
          <Link to="/create" className="create-btn">
            + 新增测试用例
          </Link>
          
          {selectedTestCases.size > 0 && (
            <div className="selected-actions">
              <span className="selected-count">已选择 {selectedTestCases.size} 条</span>
              <button 
                className="action-btn export-btn"
                onClick={handleExport}
                title="导出选中的测试用例"
              >
                📥 导出
              </button>
              <button 
                className="action-btn move-btn"
                onClick={handleMoveTestCases}
                title="移动选中的测试用例"
              >
                ➡ 移动
              </button>
              <button 
                className="action-btn clear-btn"
                onClick={() => setSelectedTestCases(new Set())}
                title="取消选择"
              >
                ✕ 取消
              </button>
            </div>
          )}
        </div>
        
        {loading ? (
          <div className="loading">加载中...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : testCases.length === 0 ? (
          <div className="table-container">
            <div className="empty-state">
              <h3>暂无测试用例</h3>
              <p>点击上方"新增测试用例"按钮创建第一个用例</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="table-container">
              <div className="table-header">
                <div className="table-row test-case-row-header">
                  <div style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedTestCases.size === testCases.length && testCases.length > 0}
                      onChange={handleSelectAll}
                      className="checkbox-input"
                    />
                  </div>
                  <div>用例名称</div>
                  <div>用例等级</div>
                  <div>目录</div>
                  <div>创建时间</div>
                  <div>编辑时间</div>
                  <div style={{ width: '80px', textAlign: 'center' }}>操作</div>
                </div>
              </div>
              <div className="table-body">
                {testCases.map((testCase) => (
                  <div 
                    key={testCase.id} 
                    className={`table-row test-case-row ${selectedTestCases.has(testCase.id) ? 'selected-row' : ''}`}
                  >
                    <div style={{ width: '40px', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedTestCases.has(testCase.id)}
                        onChange={(e) => handleSelectTestCase(testCase.id, e)}
                        className="checkbox-input"
                      />
                    </div>
                    <div className="ellipsis-text" title={testCase.name}>{testCase.name}</div>
                    <div>
                      <span className={`priority-badge priority-${testCase.priority || 'P0'}`}>
                        {testCase.priority || 'P0'}
                      </span>
                    </div>
                    <div className="ellipsis-text" title={testCase.directory_name || '未分配'}>
                      {testCase.directory_name || '-'}
                    </div>
                    <div>{testCase.created_at}</div>
                    <div>{testCase.updated_at}</div>
                    <div style={{ width: '80px', textAlign: 'center' }}>
                      <button
                        type="button"
                        className="edit-btn"
                        onClick={(e) => handleEditClick(testCase.id, e)}
                        title="编辑测试用例"
                      >
                        ⚙️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {totalPages > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  共 {total} 条记录，第 {currentPage}/{totalPages || 1} 页
                </div>
                <div className="pagination-controls">
                  <select 
                    className="page-size-select" 
                    value={pageSize} 
                    onChange={handlePageSizeChange}
                  >
                    <option value={10}>10条/页</option>
                    <option value={20}>20条/页</option>
                    <option value={50}>50条/页</option>
                    <option value={100}>100条/页</option>
                  </select>
                  <div className="pagination">
                    <button 
                      className="page-btn" 
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      上一页
                    </button>
                    <span className="page-info">
                      第 {currentPage} 页
                    </span>
                    <button 
                      className="page-btn" 
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {parentDirectoryId === null ? '新建根目录' : '新建子目录'}
            </h3>
            <input
              type="text"
              className="modal-input"
              placeholder="请输入目录名称（100字以内）"
              value={newDirectoryName}
              onChange={(e) => setNewDirectoryName(e.target.value)}
              maxLength={100}
              autoFocus
            />
            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setShowCreateModal(false)}
              >
                取消
              </button>
              <button
                type="button"
                className="modal-confirm-btn"
                onClick={handleCreateDirectory}
                disabled={!newDirectoryName || newDirectoryName.trim() === ''}
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div className="modal-overlay" onClick={() => { setShowMoveModal(false); setTargetDirectoryId(null); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">移动测试用例</h3>
            <p className="modal-description">
              已选择 <strong>{selectedTestCases.size}</strong> 个测试用例，请选择目标目录：
            </p>
            <div className="directory-selector-list">
              <div 
                className={`directory-selector-item ${targetDirectoryId === null ? 'selected' : ''}`}
                style={{ paddingLeft: '20px' }}
                onClick={() => setTargetDirectoryId(null)}
              >
                <span className="directory-selector-icon">📋</span>
                <span className="directory-selector-name">无目录（移出目录）</span>
              </div>
              {renderDirectorySelector(directories, 0, null)}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => { setShowMoveModal(false); setTargetDirectoryId(null); }}
              >
                取消
              </button>
              <button
                type="button"
                className="modal-confirm-btn"
                onClick={confirmMoveTestCases}
                disabled={moveLoading}
              >
                {moveLoading ? '移动中...' : '确定移动'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveDirectoryModal && directoryToMove && (
        <div className="modal-overlay" onClick={() => { setShowMoveDirectoryModal(false); setDirectoryToMove(null); setTargetDirectoryId(null); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">移动目录</h3>
            <p className="modal-description">
              移动目录 <strong>{directoryToMove.name}</strong> 及其下所有用例，请选择目标目录：
            </p>
            <p className="modal-note">
              注意：只能从深层级目录移动到浅层级目录，不能移动到自己的子目录下
            </p>
            <div className="directory-selector-list">
              <div 
                className={`directory-selector-item ${targetDirectoryId === null ? 'selected' : ''}`}
                style={{ paddingLeft: '20px' }}
                onClick={() => setTargetDirectoryId(null)}
              >
                <span className="directory-selector-icon">📋</span>
                <span className="directory-selector-name">根目录</span>
              </div>
              {renderDirectorySelector(directories, 0, directoryToMove.id)}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => { setShowMoveDirectoryModal(false); setDirectoryToMove(null); setTargetDirectoryId(null); }}
              >
                取消
              </button>
              <button
                type="button"
                className="modal-confirm-btn"
                onClick={confirmMoveDirectory}
                disabled={moveLoading}
              >
                {moveLoading ? '移动中...' : '确定移动'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TestCaseList;
