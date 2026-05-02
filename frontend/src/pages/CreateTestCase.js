import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function CreateTestCase() {
  const navigate = useNavigate();
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
  const iframeRef = useRef(null);

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

  const addStep = () => {
    setSteps([...steps, '']);
    setExpectedResults([...expectedResults, '']);
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
    
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].length > 500) {
        setMessage({ type: 'error', text: `第${i+1}步测试步骤不能超过500字` });
        return;
      }
      if (expectedResults[i].length > 500) {
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
      const response = await axios.post('/api/testcases', {
        name: name.trim(),
        preconditions: preconditions,
        steps: steps,
        expected_results: expectedResults,
        description: description,
        priority: priority,
        directory_id: directoryId
      });
      
      if (response.status === 201) {
        setMessage({ type: 'success', text: '用例创建成功！' });
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating test case:', error);
      if (error.response && error.response.data && error.response.data.error) {
        setMessage({ type: 'error', text: error.response.data.error });
      } else {
        setMessage({ type: 'error', text: '创建失败，请稍后重试' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">新增测试用例</h1>
      
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>测试步骤与预期结果</label>
              <button
                type="button"
                className="add-step-btn"
                onClick={addStep}
              >
                + 新增步骤
              </button>
            </div>
            
            {steps.map((step, index) => (
              <div key={index} className="step-container">
                <div className="step-header">
                  <span className="step-number">步骤 {index + 1}</span>
                </div>
                
                <div className="form-group" style={{ marginBottom: '15px' }}>
                  <label className="form-label">测试步骤</label>
                  <textarea
                    className="form-textarea"
                    value={step}
                    onChange={(e) => handleStepChange(index, e.target.value)}
                    placeholder="请输入测试步骤（500字以内）"
                    maxLength={500}
                  />
                </div>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">预期结果</label>
                  <textarea
                    className="form-textarea"
                    value={expectedResults[index]}
                    onChange={(e) => handleExpectedResultChange(index, e.target.value)}
                    placeholder="请输入预期结果（500字以内）"
                    maxLength={500}
                  />
                </div>
              </div>
            ))}
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
            {loading ? '创建中...' : '创建用例'}
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

export default CreateTestCase;
