import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TestCaseSelector() {
  const [testCases, setTestCases] = useState([]);
  const [directories, setDirectories] = useState([]);
  const [expandedDirIds, setExpandedDirIds] = useState(new Set());
  const [selectedDirectoryId, setSelectedDirectoryId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchDirectories();
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    fetchTestCases();
  }, [selectedDirectoryId, currentPage, pageSize]);

  const handleMessage = (event) => {
    if (event.data && event.data.type === 'INIT_SELECTED') {
      setSelectedIds(new Set(event.data.selectedIds || []));
    }
  };

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

  const toggleDirExpand = (id, e) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedDirIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDirIds(newExpanded);
  };

  const handleSelectDirectory = (id) => {
    setSelectedDirectoryId(id);
    setCurrentPage(1);
  };

  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleConfirm = () => {
    const params = {
      page_size: 1000
    };
    if (selectedIds.size > 0) {
      axios.get('/api/testcases', { params }).then(response => {
        const allTestCases = response.data.testcases;
        const selectedTestCases = allTestCases.filter(tc => selectedIds.has(tc.id));
        if (window.parent) {
          window.parent.postMessage({
            type: 'SELECT_CASES',
            testCases: selectedTestCases
          }, '*');
        }
      });
    } else {
      if (window.parent) {
        window.parent.postMessage({
          type: 'SELECT_CASES',
          testCases: []
        }, '*');
      }
    }
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

  const renderDirectoryItem = (directory, level = 0) => {
    const hasChildren = directory.children && directory.children.length > 0;
    const isExpanded = expandedDirIds.has(directory.id);
    const isSelected = selectedDirectoryId === directory.id;

    return (
      <div key={directory.id}>
        <div 
          className={`selector-directory-item ${isSelected ? 'active' : ''}`}
          onClick={() => handleSelectDirectory(directory.id)}
          style={{ paddingLeft: `${15 + level * 15}px` }}
        >
          {hasChildren ? (
            <span 
              className="toggle-icon" 
              onClick={(e) => toggleDirExpand(directory.id, e)}
            >
              {isExpanded ? '▼' : '▶'}
            </span>
          ) : (
            <span className="toggle-icon" style={{ visibility: 'hidden' }}>▶</span>
          )}
          <span className="dir-icon">📁</span>
          <span className="dir-name">{directory.name}</span>
        </div>
        {hasChildren && isExpanded && (
          <div className="selector-directory-children">
            {directory.children.map(child => renderDirectoryItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="selector-container">
      <h2 className="selector-title">选择测试用例</h2>
      
      <div className="selector-info">
        已选择 <span className="selected-count">{selectedIds.size}</span> 个用例
        {selectedDirectoryId !== null && (
          <span style={{ marginLeft: '15px', color: '#7f8c8d' }}>
            目录筛选中
          </span>
        )}
      </div>

      <div className="selector-with-directory">
        <div className="selector-directory-panel">
          <div className="selector-directory-header">
            目录筛选
          </div>
          <div className="selector-directory-list">
            <div 
              className={`selector-directory-item ${selectedDirectoryId === null ? 'active' : ''}`}
              onClick={() => handleSelectDirectory(null)}
            >
              <span className="dir-icon">📋</span>
              <span className="dir-name">全部用例</span>
            </div>
            {directories.map(directory => renderDirectoryItem(directory))}
          </div>
        </div>

        <div className="selector-cases-panel">
          {loading ? (
            <div className="loading">加载中...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : testCases.length === 0 ? (
            <div className="empty-state">
              <h3>暂无测试用例</h3>
              <p>请先创建测试用例</p>
            </div>
          ) : (
            <>
              <div className="selector-table">
                <div className="selector-header">
                  <div className="selector-row">
                    <div style={{ width: '50px' }}>选择</div>
                    <div>用例名称</div>
                    <div style={{ width: '100px' }}>等级</div>
                    <div style={{ width: '180px' }}>创建时间</div>
                  </div>
                </div>
                <div className="selector-body">
                  {testCases.map((testCase) => (
                    <div 
                      key={testCase.id} 
                      className={`selector-row ${selectedIds.has(testCase.id) ? 'selected' : ''}`}
                      onClick={() => handleSelect(testCase.id)}
                    >
                      <div style={{ width: '50px' }}>
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(testCase.id)}
                          onChange={() => {}}
                        />
                      </div>
                      <div>{testCase.name}</div>
                      <div style={{ width: '100px' }}>
                        <span className={`priority-badge priority-${testCase.priority || 'P0'}`}>
                          {testCase.priority || 'P0'}
                        </span>
                      </div>
                      <div style={{ width: '180px' }}>{testCase.created_at}</div>
                    </div>
                  ))}
                </div>
              </div>

              {totalPages > 0 && (
                <div className="pagination-container" style={{ marginTop: '10px' }}>
                  <div className="pagination-info">
                    共 {total} 条记录
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
                        第 {currentPage}/{totalPages || 1} 页
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
            </>
          )}
        </div>
      </div>

      <div className="selector-actions">
        <button className="cancel-btn" onClick={() => {
          if (window.parent) {
            window.parent.postMessage({ type: 'CANCEL_SELECT' }, '*');
          }
        }}>
          取消
        </button>
        <button className="confirm-btn" onClick={handleConfirm}>
          确认选择 ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}

export default TestCaseSelector;
