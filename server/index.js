// server/index.js
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3000;
const mongoUrl = process.env.MONGODB_URL;
const openaiApiKey = process.env.OPENAI_API_KEY;

console.log('환경 변수 확인:');
console.log('PORT:', port);
console.log('MONGODB_URL:', mongoUrl ? '설정됨' : '설정되지 않음');
console.log('OPENAI_API_KEY:', openaiApiKey ? '설정됨' : '설정되지 않음');

if (!mongoUrl || !openaiApiKey) {
  console.error('필수 환경 변수가 누락되었습니다.');
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

const openai = new OpenAI({ 
  apiKey: openaiApiKey,
  timeout: 30000,
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const staticPath = path.join(__dirname, '../dist');
const indexPath = path.join(staticPath, 'index.html');

if (!fs.existsSync(staticPath)) {
  console.error(`❌ dist 디렉토리를 찾을 수 없습니다: ${staticPath}`);
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error(`❌ index.html 파일을 찾을 수 없습니다: ${indexPath}`);
  process.exit(1);
}

console.log(`✅ 정적 파일 경로: ${staticPath}`);
console.log(`✅ index.html 경로: ${indexPath}`);

app.post('/api/chat', async (req, res) => {
  try {
    const { message, image } = req.body;

    console.log('📥 수신된 message:', message);
    if (image) console.log('🖼️ 이미지 포함');

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '유효한 메시지가 필요합니다.' });
    }

    const isConnected = await connectToMongo();
    if (!isConnected) return res.status(500).json({ error: 'MongoDB 연결 실패' });

    const systemMessage = `당신은 친절한 AI 어시스턴트입니다. 사용자의 질문에 명확하고 도움이 되는 답변을 제공해주세요.`;

    const messages = image ? [
      { role: 'system', content: systemMessage },
      { role: 'user', content: [
        { type: 'text', text: message },
        { type: 'image_url', image_url: { url: image } }
      ]}
    ] : [
      { role: 'system', content: systemMessage },
      { role: 'user', content: message }
    ];

    console.log('🟢 OpenAI 호출 중...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: 1000,
    });

    const reply = completion.choices[0].message.content;
    console.log('✅ OpenAI 응답:', reply);

    const db = client.db(dbName);
    const result = await db.collection(collectionName).insertMany([
      { type: 'user', message, image: image || null, timestamp: new Date(), satisfaction: 0 },
      { type: 'ai', reply, timestamp: new Date(), satisfaction: 0 }
    ]);

    res.json({ reply, messageId: result.insertedIds[1] });
  } catch (error) {
    console.error('🔥 오류 발생:', error);
    res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const isConnected = await connectToMongo();
    if (!isConnected) return res.status(500).json({ error: 'MongoDB 연결 실패' });

    const db = client.db(dbName);
    const history = await db.collection(collectionName).find().sort({ timestamp: 1 }).toArray();

    res.json({ history });
  } catch (err) {
    console.error('기록 불러오기 실패:', err);
    res.status(500).json({ error: '기록 불러오기 실패' });
  }
});

app.post('/api/rate-message', async (req, res) => {
  const { messageId, rating } = req.body;

  if (!messageId || isNaN(parseInt(rating)) || rating < 0 || rating > 5) {
    return res.status(400).json({ error: '유효한 입력값이 필요합니다.' });
  }

  let objectId;
  try {
    objectId = new ObjectId(messageId);
  } catch (err) {
    return res.status(400).json({ error: '유효하지 않은 메시지 ID 형식입니다.' });
  }

  try {
    const isConnected = await connectToMongo();
    if (!isConnected) return res.status(500).json({ error: 'MongoDB 연결 실패' });

    const db = client.db(dbName);
    const result = await db.collection(collectionName).updateOne(
      { _id: objectId },
      { $set: { satisfaction: parseInt(rating) } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('별점 저장 오류:', err);
    res.status(500).json({ error: '별점 저장에 실패했습니다.' });
  }
});

app.use(express.static(staticPath));

app.get('/*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(indexPath);
  }
});

async function connectToMongo() {
  try {
    await client.connect();
    return true;
  } catch (err) {
    console.error('❌ MongoDB 연결 실패:', err);
    return false;
  }
}

const startServer = async (port) => {
  try {
    await new Promise((resolve, reject) => {
      const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 서버 실행 중: http://localhost:${port}`);
        resolve();
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`⚠️ 포트 ${port}가 이미 사용 중입니다. 다음 포트로 시도합니다...`);
          resolve(false);
        } else {
          reject(err);
        }
      });
    });

    await connectToMongo().then(() => {
      console.log('✅ 초기 MongoDB 연결 완료');
    }).catch(err => {
      console.error('❌ 초기 MongoDB 연결 실패:', err);
    });

  } catch (err) {
    console.error('서버 시작 실패:', err);
    process.exit(1);
  }
};

const tryPorts = async (startPort, maxAttempts = 5) => {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const success = await startServer(port);
    if (success !== false) return;
  }
  console.error(`❌ ${maxAttempts}번의 시도 후에도 사용 가능한 포트를 찾지 못했습니다.`);
  process.exit(1);
};

const initialPort = process.env.PORT || 3000;
tryPorts(parseInt(initialPort));
