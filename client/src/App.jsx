import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState([]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const res = await axios.post('/chat', { message: input });
    setHistory([{ message: input, reply: res.data.reply }, ...history]);
    setInput('');
  };

  const loadHistory = async () => {
    const res = await axios.get('/history');
    setHistory(res.data.history);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ textAlign: 'center' }}>AI 채팅</h1>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input 
          value={input} 
          onChange={e => setInput(e.target.value)}
          style={{ flex: 1, padding: '10px' }}
          placeholder="메시지를 입력하세요..."
        />
        <button 
          onClick={sendMessage}
          style={{ padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          보내기
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {history.map((item, i) => (
          <div key={i} style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <div style={{ marginBottom: '10px' }}>
              <b style={{ color: '#007bff' }}>나:</b> {item.message}
            </div>
            <div>
              <b style={{ color: '#28a745' }}>AI:</b> {item.reply}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App; 