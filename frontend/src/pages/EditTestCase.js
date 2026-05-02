import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

function EditTestCase() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [name, setName] = useState('');
  const [preconditions, setPreconditions] = useState('');
  const [steps, setSteps] = useState(['']);
  const [expectedResults, setExpectedResults] = useState(['']);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P0');
  const [directoryId, setDirectoryId] = useState(null);
  const [directoryName, setDirectoryName] = useState('');
  const [showDirectorySelector, setShowDirectorySelector] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const iframeRef = useRef(null);

  useEffect(() => {
    fetchTestCase();
  }, [id]);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'SELECT_DIRECTORY') {
        const directory = event.data.directory;
        if (directory) {
          setDirectoryId(directory.id);
          setDirectoryName(directory.name);
        }
        setShowDirectorySelector(false);
      } else if (event.data && event.data.type === 'CANCEL_DIRECTORY') {
        setShowDirectorySelector(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const openDirectorySelector = () => {
    setShowDirectorySelector(true);
  };

  useEffect(() => {
    if (showDirectorySelector && iframeRef.current) {
      const timer = setTimeout(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
          const initData = {
            type: 'INIT_DIRECTORY',
            selectedDirectory: directoryId ? { id: directoryId, name: directoryName } : null
          };
          iframeRef.current.contentWindow.postMessage(initData, '*');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showDirectorySelector, directoryId, directoryName]);

  const fetchTestCase = async () => {
    try {
      setFetching(true);
      const response = await axios.get(`/api/testcases/${id}`);
      const data = response.data;
      setName(data.name);
      setPreconditions(data.preconditions || '');
      setSteps(data.steps.length > 0 ? data.steps : ['']);
      setExpectedResults(data.expected_results.length > 0 ? data.expected_results : ['']);
      setDescription(data.description || '');
      setPriority(data.priority || 'P0');
      setDirectoryId(data.directory_id);
      setDirectoryName(data.directory_name || '');
      setMessage({ type: '', text: '' });
    } catch (err) {
      console.error('Error fetching test case:', err);
      setMessage({ type: 'error', text: '获取用例详情失败，请稍后重试' });
    } finally {
      setFetching(false);
    }
  };

  const handleNameChange = (e) => {
    setName(e.target.value);
  };

  const handlePreconditionsChange = (e) => {
    setPreconditions(e.target.value);
  };

  const handleDescriptionChange = (e) => {
    setDescription(e.target.value);
  };

  const handlePriorityChange = (e) => {
    setPriority(e.target.value);
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleExpectedResultChange = (index, value) => {
    const newExpectedResults = [...expectedResults];
    newExpectedResults[index] = value;
    setExpectedResults(newExpectedResults);
  };

  const isEmptyValue = (value) => {
    if (!value) return true;
    const trimmed = value.replace(/[\s\t\n\r]+/g, '');
    if (trimmed === '') return true;
    return /^[^\p{L}\p{N}]*$/u.test(trimmed);
  };

  const isStepEmpty = (index) => {
    return isEmptyValue(steps[index]) && isEmptyValue(expectedResults[index]);
  };

  const canAddStep = () => {
    const emptyStepCount = steps.reduce((count, _, index) => {
      return count + (isStepEmpty(index) ? 1 : 0);
    }, 0);
    return emptyStepCount < 1;
  };

  const addStep = () => {
    if (!canAddStep()) {
      return;
    }
    setSteps([...steps, '']);
    setExpectedResults([...expectedResults, '']);
  };

  const removeStep = (index) => {
    if (steps.length <= 1) {
      return;
    }
    const newSteps = steps.filter((_, i) => i !== index);
    const newExpectedResults = expectedResults.filter((_, i) => i !== index);
    setSteps(newSteps);
    setExpectedResults(newExpectedResults);
  };

  const validateSteps = () => {
    for (let i = 0; i < steps.length; i++) {
      const stepEmpty = isEmptyValue(steps[i]);
      const resultEmpty = isEmptyValue(expectedResults[i]);
      
      if (!stepEmpty && resultEmpty) {
        return { valid: false, message: `第${i + 1}步：测试步骤不为空时，预期结果为必填` };
      }
      if (!resultEmpty && stepEmpty) {
        return { valid: false, message: `第${i + 1}步：预期结果不为空时，测试步骤为必填` };
      }
    }
    return { valid: true };
  };

  const getFilteredSteps = () => {
    const filteredSteps = [];
    const filteredExpectedResults = [];
    
    for (let i = 0; i < steps.length; i++) {
      if (!isStepEmpty(i)) {
        filteredSteps.push(steps[i]);
        filteredExpectedResults.push(expectedResults[i]);
      }
    }
    
    if (filteredSteps.length === 0) {
      filteredSteps.push('');
      filteredExpectedResults.push('');
    }
    
    return { steps: filteredSteps, expectedResults: filteredExpectedResults };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name || name.trim() === '') {
      setMessage({ type: 'error', text: '用例名称不能为空' });
      return;
    }
    
    if (name.length > 200) {
      setMessage({ type: 'error', text: '用例名称不能超过200字' });
      return;
    }
    
    if (!directoryId) {
      setMessage({ type: 'error', text: '请选择目录' });
      return;
    }
    
    const validation = validateSteps();
    if (!validation.valid) {
      setMessage({ type: 'error', text: validation.message });
      return;
    }
    
    const { steps: filteredSteps, expectedResults: filteredExpectedResults } = getFilteredSteps();
    
    for (let i = 0; i < filteredSteps.length; i++) {
      if (filteredSteps[i].length > 500) {
        setMessage({ type: 'error', text: `第${i+1}步测试步骤不能超过500字` });
        return;
      }
      if (filteredExpectedResults[i].length > 500) {
        setMessage({ type: 'error', text: `第${i+1}步预期结果不能超过500字` });
        return;
      }
    }
    
    if (description.length > 200) {
      setMessage({ type: 'error', text: '描述不能超过200字' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const response = await axios.put(`/api/testcases/${id}`, {
        name: name.trim(),
        preconditions: preconditions,
        steps: filteredSteps,
        expected_results: filteredExpectedResults,
        description: description,
        priority: priority,
        directory_id: directoryId
      });
      
      if (response.status === 200) {
        setMessage({ type: 'success', text: '用例更新成功！' });
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating test case:', error);
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
        <h1 className="page-title">编辑测试用例</h1>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">编辑测试用例</h1>
      
      {message.text && (
        <div className={message.type === 'success' ? 'success-message' : 'error-message'}>
          {message.text}
        </div>
      )}
      
      <div className="form-container">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">用例名称 <span style={{ color: 'red' }}>*</span></label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={handleNameChange}
              placeholder="请输入用例名称（200字以内）"
              maxLength={200}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">所属目录 <span style={{ color: 'red' }}>*</span></label>
            {directoryId ? (
              <div className="directory-display">
                <span className="directory-name">📁 {directoryName}</span>
                <button
                  type="button"
                  className="change-btn"
                  onClick={openDirectorySelector}
                >
                  更换
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="select-directory-btn"
                onClick={openDirectorySelector}
              >
                选择目录
              </button>
            )}
          </div>
          
          <div className="form-group">
            <label className="form-label">用例等级</label>
            <select
              className="form-input"
              value={priority}
              onChange={handlePriorityChange}
            >
              <option value="P0">P0</option>
              <option value="P1">P1</option>
              <option value="P2">P2</option>
              <option value="P3">P3</option>
              <option value="P4">P4</option>
            </select>
          </div>
          
          <div className="form-group">
            <label className="form-label">前提条件</label>
            <textarea
              className="form-textarea"
              value={preconditions}
              onChange={handlePreconditionsChange}
              placeholder="请输入前提条件"
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">测试步骤与预期结果</label>
            
            <div className="steps-table-container">
              <div className="steps-table-header">
                <div className="step-col-index">序号</div>
                <div className="step-col-action">测试步骤</div>
                <div className="step-col-action">预期结果</div>
                <div className="step-col-buttons">操作</div>
              </div>
              
              {steps.map((step, index) => (
                <div key={index} className="steps-table-row">
                  <div className="step-col-index">{index + 1}</div>
                  <div className="step-col-action">
                    <textarea
                      className="step-textarea"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      placeholder="请输入测试步骤"
                      maxLength={500}
                    />
                  </div>
                  <div className="step-col-action">
                    <textarea
                      className="step-textarea"
                      value={expectedResults[index]}
                      onChange={(e) => handleExpectedResultChange(index, e.target.value)}
                      placeholder="请输入预期结果"
                      maxLength={500}
                    />
                  </div>
                  <div className="step-col-buttons">
                    <button
                      type="button"
                      className="step-btn add-step-inline"
                      onClick={() => addStep()}
                      disabled={!canAddStep()}
                      title="新增步骤"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="step-btn remove-step-inline"
                      onClick={() => removeStep(index)}
                      disabled={steps.length <= 1}
                      title="删除步骤"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="form-group">
            <label className="form-label">描述</label>
            <textarea
              className="form-textarea"
              value={description}
              onChange={handleDescriptionChange}
              placeholder="请输入描述（200字以内）"
              maxLength={200}
            />
            <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#7f8c8d', marginTop: '5px' }}>
              {description.length}/200
            </div>
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

      {showDirectorySelector && (
        <div className="selector-modal">
          <div className="selector-modal-content">
            <iframe
              ref={iframeRef}
              src="/directory-selector"
              className="selector-iframe"
              title="DirectorySelector"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default EditTestCase;
