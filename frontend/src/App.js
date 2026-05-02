import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import TestCaseList from './pages/TestCaseList';
import CreateTestCase from './pages/CreateTestCase';
import EditTestCase from './pages/EditTestCase';
import TestPlanList from './pages/TestPlanList';
import CreateTestPlan from './pages/CreateTestPlan';
import TestCaseSelector from './pages/TestCaseSelector';
import './App.css';

function Navigation() {
  const location = useLocation();

  const getActiveClass = (path) => {
    if (path === '/testplan' && location.pathname.startsWith('/testplan')) {
      return 'active';
    }
    if (path === '/' && (location.pathname === '/' || location.pathname === '/create' || location.pathname.startsWith('/edit'))) {
      return 'active';
    }
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
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                用例列表
              </Link>
              <Link 
                to="/create" 
                className={`nav-link ${location.pathname === '/create' ? 'active' : ''}`}
              >
                新增测试用例
              </Link>
            </div>
          </div>
        </div>
        
        <div className="nav-item">
          <div className="nav-section">
            <span className="nav-section-title">测试计划</span>
            <div className="nav-submenu">
              <Link 
                to="/testplan" 
                className={`nav-link ${location.pathname === '/testplan' ? 'active' : ''}`}
              >
                测试计划列表
              </Link>
              <Link 
                to="/testplan/create" 
                className={`nav-link ${location.pathname === '/testplan/create' ? 'active' : ''}`}
              >
                创建测试计划
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
            <Route path="/edit/:id" element={<EditTestCase />} />
            <Route path="/testplan" element={<TestPlanList />} />
            <Route path="/testplan/create" element={<CreateTestPlan />} />
            <Route path="/selector" element={<TestCaseSelector />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
