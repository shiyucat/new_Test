import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

function TestCaseList() {
  const [testCases, setTestCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTestCases();
  }, []);

  const fetchTestCases = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/api/testcases');
      setTestCases(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching test cases:', err);
      setError('获取用例列表失败，请稍后重试');
    } finally {
      setLoading(false);
    }
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
            <div className="table-row">
              <div>用例名称</div>
              <div>创建时间</div>
            </div>
          </div>
          <div className="table-body">
            {testCases.map((testCase) => (
              <div key={testCase.id} className="table-row">
                <div>{testCase.name}</div>
                <div>{testCase.created_at}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TestCaseList;
