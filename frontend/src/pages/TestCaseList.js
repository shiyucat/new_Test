import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function TestCaseList() {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTestCases();
  }, []);

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

  const handleRowClick = (id) => {
  };

  const handleEditClick = (id, e) => {
    e.stopPropagation();
    navigate(`/edit/${id}`);
  };

  return (
    <div>
      <h1 className="page-title">用例管理</h1>
      
      <Link to="/create" className="create-btn">
        + 新增测试用例
      </Link>
      
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
        <div className="table-container">
          <div className="table-header">
            <div className="table-row test-case-row-header">
              <div>用例名称</div>
              <div>用例等级</div>
              <div>创建时间</div>
              <div>编辑时间</div>
              <div style={{ width: '80px', textAlign: 'center' }}>操作</div>
            </div>
          </div>
          <div className="table-body">
            {testCases.map((testCase) => (
              <div 
                key={testCase.id} 
                className="table-row test-case-row"
              >
                <div className="ellipsis-text" title={testCase.name}>{testCase.name}</div>
                <div>
                  <span className={`priority-badge priority-${testCase.priority || 'P0'}`}>
                    {testCase.priority || 'P0'}
                  </span>
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
      )}
    </div>
  );
}

export default TestCaseList;
