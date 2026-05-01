import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import TestCaseList from './pages/TestCaseList';
import CreateTestCase from './pages/CreateTestCase';
import './App.css';

function Navigation() {
  const location = useLocation();
  const [activeMenu, setActiveMenu] = useState('用例管理');

  const getActiveClass = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navigation">
      <div className="nav-header">
        <h1>测试平台</h1>
      </div>
      <div className="nav-menu">
        <div className="nav-item">
          <div className="nav-section">
            <span className="nav-section-title">用例管理</span>
            <div className="nav-submenu">
              <Link 
                to="/" 
                className={`nav-link ${getActiveClass('/')}`}
                onClick={() => setActiveMenu('用例管理')}
              >
                用例列表
              </Link>
              <Link 
                to="/create" 
                className={`nav-link ${getActiveClass('/create')}`}
                onClick={() => setActiveMenu('新增测试用例')}
              >
                新增测试用例
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<TestCaseList />} />
            <Route path="/create" element={<CreateTestCase />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
