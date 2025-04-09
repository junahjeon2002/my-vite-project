import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import dns from 'dns';

dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const mongoUrl = process.env.MONGODB_URL;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (!mongoUrl) {
    console.error('MONGODB_URL 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

if (!openaiApiKey) {
    console.error('OPENAI_API_KEY 환경 변수가 설정되지 않았습니다.');
    process.exit(1);
}

console.log('MongoDB URL:', mongoUrl);
console.log('OpenAI API Key:', openaiApiKey.substring(0, 5) + '...');

const dbName = 'chatApp';
const collectionName = 'messages';

const client = new MongoClient(mongoUrl, {
    connectTimeoutMS: 5000,
    socketTimeoutMS: 30000,
});

// CORS 설정
app.use(cors({
    origin: ['http://localhost:5173', 'http://3.35.24.104:3001'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));  // 정적 파일을 public 폴더에서 제공

// 정적 파일 (React) 서빙
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// MongoDB 연결
async function connectToMongo() {
  try {
    await client.connect();
    console.log('✅ MongoDB 연결 성공');
    
    // 연결 테스트
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    console.log('✅ MongoDB 데이터베이스 접근 성공');
    
    // 에러 이벤트 리스너 추가
    client.on('error', (error) => {
      console.error('MongoDB 에러 발생:', error);
    });
    
    client.on('close', () => {
      console.log('MongoDB 연결이 닫혔습니다. 재연결 시도...');
      setTimeout(connectToMongo, 5000);
    });
    
  } catch (err) {
    console.error('❌ MongoDB 연결 실패:', err);
    console.log('5초 후 재연결 시도...');
    setTimeout(connectToMongo, 5000);
  }
}

// 초기 연결 시도
connectToMongo();

// OpenAI 설정
const openai = new OpenAI({ 
    apiKey: openaiApiKey,
    timeout: 30000,
});

// 채팅 요청 처리
app.post('/chat', async (req, res) => {
  const { message, image } = req.body;
  console.log('받은 메시지:', message);
  if (image) console.log('이미지 데이터 포함');
  
  try {
    // MongoDB 연결 상태 확인
    if (!client.topology || !client.topology.isConnected()) {
      console.error('MongoDB 연결이 끊어졌습니다.');
      await connectToMongo();
    }

    const systemMessage = `당신은 친절한 AI 어시스턴트입니다. 사용자의 질문에 명확하고 도움이 되는 답변을 제공해주세요.`;
    
    let messages = [
      { role: 'system', content: systemMessage }
    ];

    if (image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          {
            type: 'image_url',
            image_url: {
              url: image
            }
          }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    // OpenAI API 호출
    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: messages,
        max_tokens: 1000,
      });
    } catch (openaiError) {
      console.error('OpenAI API 오류:', openaiError);
      return res.status(500).json({ error: 'AI 응답 생성 실패', details: openaiError.message });
    }

    const reply = completion.choices[0].message.content;
    console.log('AI 응답:', reply);
    
    // MongoDB 저장
    try {
      const db = client.db(dbName);
      
      // 사용자 메시지 저장
      const userMessage = {
        type: 'user',
        message: message,
        image: image || null,
        timestamp: new Date(),
        satisfaction: 0
      };
      
      const userResult = await db.collection(collectionName).insertOne(userMessage);
      
      // AI 응답 저장
      const aiMessage = {
        type: 'ai',
        reply: reply,
        timestamp: new Date(),
        satisfaction: 0
      };
      
      const aiResult = await db.collection(collectionName).insertOne(aiMessage);

      res.json({ 
        reply,
        messageId: aiResult.insertedId 
      });
    } catch (dbError) {
      console.error('MongoDB 저장 오류:', dbError);
      // 데이터베이스 저장은 실패했지만 AI 응답은 반환
      res.json({ 
        reply,
        messageId: null,
        warning: '대화 저장에 실패했습니다.'
      });
    }
  } catch (error) {
    console.error('전체 처리 오류:', error);
    res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
  }
});

// 기록 불러오기
app.get('/history', async (req, res) => {
  try {
    const db = client.db(dbName);
    const history = await db.collection(collectionName)
      .find()
      .sort({ timestamp: 1 })  // 오래된 순으로 정렬
      .toArray();
    
    console.log('채팅 기록 조회:', history.length + '개의 메시지');
    res.json({ history });
  } catch (err) {
    console.error('기록 불러오기 실패:', err);
    res.status(500).json({ error: '기록 불러오기 실패' });
  }
});

// 별점 저장 엔드포인트
app.post('/rate-message', async (req, res) => {
  const { messageId, rating } = req.body;
  
  try {
    const db = client.db(dbName);
    const result = await db.collection(collectionName).updateOne(
      { "_id": new ObjectId(messageId) },
      { $set: { satisfaction: parseInt(rating) } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
      return;
    }

    console.log(`메시지 ID ${messageId}의 별점이 ${rating}으로 업데이트되었습니다.`);
    res.json({ success: true });
  } catch (err) {
    console.error('별점 저장 오류:', err);
    res.status(500).json({ error: '별점 저장에 실패했습니다.' });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 서버 실행 중: http://localhost:${port}`);
}); 