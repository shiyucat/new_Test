import React, { useState, useEffect } from 'react';
import axios from 'axios';

function TestCaseSelector() {
  const [testCases, setTestCases] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchTestCases();
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleMessage = (event) => {
    if (event.data && event.data.type === 'INIT_SELECTED') {
      setSelectedIds(new Set(event.data.selectedIds || []));
    }
  };

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/testcases');
      setTestCases(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching test cases:', err);
      setError('获取用例列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(testCases.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentTestCases = testCases.slice(startIndex, endIndex);

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
    const selectedTestCases = testCases.filter(tc => selectedIds.has(tc.id));
    if (window.parent) {
      window.parent.postMessage({
        type: 'SELECT_CASES',
        testCases: selectedTestCases
      }, '*');
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="selector-container">
      <h2 className="selector-title">选择测试用例</h2>
      
      <div className="selector-info">
        已选择 <span className="selected-count">{selectedIds.size}</span> 个用例
      </div>

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
                <div style={{ width: '180px' }}>创建时间</div>
              </div>
            </div>
            <div className="selector-body">
              {currentTestCases.map((testCase) => (
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
                  <div style={{ width: '180px' }}>{testCase.created_at}</div>
                </div>
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="page-btn" 
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              <span className="page-info">
                第 {currentPage} 页 / 共 {totalPages} 页
              </span>
              <button 
                className="page-btn" 
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}

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
