import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/pro.css'; // 스타일 불러오기

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="main-section">
      <App />
    </div>
  </React.StrictMode>
);
