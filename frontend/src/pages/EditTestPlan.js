import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditTestPlan() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [name, setName] = useState('');
  const [selectedTestCases, setSelectedTestCases] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [expandedCase, setExpandedCase] = useState(null);
  const iframeRef = useRef(null);

  useEffect(() => {
    fetchTestPlan();
  }, [id]);

  const fetchTestPlan = async () => {
    try {
      setFetching(true);
      const response = await axios.get(`/api/testplans/${id}`);
      const data = response.data;
      setName(data.name);
      setSelectedTestCases(data.test_cases || []);
      setMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error fetching test plan:', err);
      setMessage({ type: 'error', text: '获取测试计划详情失败，请稍后重试' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SELECT_CASES') {
        const newCases = event.data.testCases;
        const existingIds = new Set(selectedTestCases.map(tc => tc.id));
        const mergedCases = [...selectedTestCases];
        
        newCases.forEach(newCase => {
          if (!existingIds.has(newCase.id)) {
            mergedCases.push(newCase);
            existingIds.add(newCase.id);
          }
        });
        
        setSelectedTestCases(mergedCases);
        setShowSelector(false);
      } else if (event.data && event.data.type === 'CANCEL_SELECT') {
        setShowSelector(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedTestCases]);

  useEffect(() => {
    if (showSelector && iframeRef.current) {
      const timer = setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({
            type: 'INIT_SELECTED',
            selectedIds: selectedTestCases.map(tc => tc.id)
          }, '*');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showSelector, selectedTestCases]);

  useEffect(() => {
    const newTotalPages = Math.ceil(selectedTestCases.length / pageSize);
    if (currentPage > newTotalPages && newTotalPages > 0) {
      setCurrentPage(newTotalPages);
    } else if (newTotalPages === 0) {
      setCurrentPage(1);
    }
  }, [selectedTestCases, currentPage, pageSize]);

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const openSelector = () => {
    setShowSelector(true);
  };

  const removeTestCase = (id) => {
    setSelectedTestCases(selectedTestCases.filter(tc => tc.id !== id));
    if (expandedCase === id) {
      setExpandedCase(null);
    }
  };

  const toggleExpand = (id) => {
    setExpandedCase(expandedCase === id ? null : id);
  };

  const totalPages = Math.ceil(selectedTestCases.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentCases = selectedTestCases.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || name.trim() === '') {
      setMessage({ type: 'error', text: '测试计划名称不能为空' });
      return;
    }
    
    if (name.length > 200) {
      setMessage({ type: 'error', text: '测试计划名称不能超过200字' });
      return;
    }
    
    if (selectedTestCases.length === 0) {
      setMessage({ type: 'error', text: '请至少选择一个测试用例' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await axios.put(`/api/testplans/${id}`, {
        name: name.trim(),
        test_case_ids: selectedTestCases.map(tc => tc.id)
      });
      
      if (response.status === 200) {
        setMessage({ type: 'success', text: '测试计划更新成功！' });
        setTimeout(() => {
          navigate('/testplan');
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating test plan:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setMessage({ type: 'error', text: error.response.data.error });
      } else {
        setMessage({ type: 'error', text: '更新失败，请稍后重试' });
      }
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div>
        <h1 className="page-title">编辑测试计划</h1>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">编辑测试计划</h1>
      
      {message.text && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}
      
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">测试计划名称 <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={handleNameChange}
              placeholder="请输入测试计划名称（200字以内）"
              maxLength={200}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">用例选择</label>
            <button
              type="button"
              className="select-cases-btn"
              onClick={openSelector}
            >
              添加测试用例
            </button>
          </div>
          
          <div className="form-group">
            <label className="form-label">
              已选择的用例 ({selectedTestCases.length} 个)
            </label>
            
            {selectedTestCases.length === 0 ? (
              <div className="empty-selected">
                <p>请点击上方按钮添加测试用例</p>
              </div>
            ) : (
              <div className="selected-cases-container">
                <div className="selected-cases-header">
                  <div className="selected-case-row">
                    <div style={{ width: '50px' }}>序号</div>
                    <div>用例名称</div>
                    <div style={{ width: '120px' }}>操作</div>
                  </div>
                </div>
                <div className="selected-cases-body">
                  {currentCases.map((testCase, index) => (
                    <div key={testCase.id}>
                      <div className="selected-case-row">
                        <div style={{ width: '50px' }}>{startIndex + index + 1}</div>
                        <div 
                          className="case-name-clickable"
                          onClick={() => toggleExpand(testCase.id)}
                        >
                          {testCase.name}
                          <span className="expand-icon">
                            {expandedCase === testCase.id ? '▲' : '▼'}
                          </span>
                        </div>
                        <div style={{ width: '120px' }}>
                          <button
                            type="button"
                            className="remove-btn"
                            onClick={() => removeTestCase(testCase.id)}
                          >
                            移除
                          </button>
                        </div>
                      </div>
                      
                      {expandedCase === testCase.id && (
                        <div className="case-detail-panel">
                          {testCase.preconditions && (
                            <div className="case-detail-section">
                              <h4>前提条件</h4>
                              <p>{testCase.preconditions}</p>
                            </div>
                          )}
                          <div className="case-detail-section">
                            <h4>测试步骤</h4>
                            {testCase.steps && testCase.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="step-item">
                                <div className="step-label">步骤 {stepIndex + 1}</div>
                                <div className="step-content">{step}</div>
                                {testCase.expected_results && testCase.expected_results[stepIndex] && (
                                  <div className="expected-result">
                                    <span>预期结果：</span>{testCase.expected_results[stepIndex]}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="pagination">
                    <button 
                      type="button"
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
                      type="button"
                      className="page-btn" 
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      下一页
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '保存中...' : '保存修改'}
          </button>
        </form>
      </div>

      {showSelector && (
        <div className="selector-modal">
          <div className="selector-modal-content">
            <iframe
              ref={iframeRef}
              src="/selector"
              className="selector-iframe"
              title="TestCaseSelector"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EditTestPlan;