import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

function TestPlanList() {
  const navigate = useNavigate();
  const [testPlans, setTestPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  useEffect(() => {
    fetchTestPlans();
  }, [currentPage, pageSize]);

  const fetchTestPlans = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        page_size: pageSize
      };
      const response = await axios.get('/api/testplans', { params });
      setTestPlans(response.data.testplans);
      setTotal(response.data.total);
      setTotalPages(response.data.total_pages);
      setError('');
    } catch (err) {
      console.error('Error fetching test plans:', err);
      setError('获取测试计划列表失败，请稍后重试');
    } finally {
      setLoading(false);
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

  return (
    <div>
      <h1 className="page-title">测试计划列表</h1>
      
      <Link to="/testplan/create" className="create-btn">
        + 创建测试计划
      </Link>
      
      {loading ? (
        <div className="loading">加载中...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : testPlans.length === 0 ? (
        <div className="table-container">
          <div className="empty-state">
            <h3>暂无测试计划</h3>
            <p>点击上方"创建测试计划"按钮创建第一个测试计划</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="table-container">
            <div className="table-header">
              <div className="table-row test-plan-row-header">
                <div>测试计划名称</div>
                <div>用例数量</div>
                <div>创建时间</div>
                <div>更新时间</div>
                <div style={{ width: '80px', textAlign: 'center' }}>操作</div>
              </div>
            </div>
            <div className="table-body">
              {testPlans.map((testPlan) => (
                <div key={testPlan.id} className="table-row test-plan-row">
                  <div className="ellipsis-text" title={testPlan.name}>{testPlan.name}</div>
                  <div>{testPlan.test_cases ? testPlan.test_cases.length : 0} 个用例</div>
                  <div>{testPlan.created_at}</div>
                  <div>{testPlan.updated_at}</div>
                  <div style={{ width: '80px', textAlign: 'center' }}>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => navigate(`/testplan/edit/${testPlan.id}`)}
                      title="编辑测试计划"
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
  );
}

export default TestPlanList;
