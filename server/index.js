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

// .env 파일 경로 설정
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = 3000;  // 명시적으로 3000 포트 설정
const mongoUrl = process.env.MONGODB_URL;
const openaiApiKey = process.env.OPENAI_API_KEY;

// 환경 변수 확인 및 로깅
console.log('환경 변수 확인:');
console.log('PORT:', port);
console.log('MONGODB_URL:', mongoUrl ? '설정됨' : '설정되지 않음');
console.log('OPENAI_API_KEY:', openaiApiKey ? '설정됨' : '설정되지 않음');

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

// OpenAI 초기화
const openai = new OpenAI({ 
    apiKey: openaiApiKey,
    timeout: 30000,
});

// CORS 설정
app.use(cors());

// Body parser 미들웨어
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 설정
const staticPath = path.join(__dirname, '../dist');

// dist 디렉토리 존재 확인
if (!fs.existsSync(staticPath)) {
    console.error(`❌ dist 디렉토리를 찾을 수 없습니다: ${staticPath}`);
    process.exit(1);
}

// index.html 파일 존재 확인
const indexPath = path.join(staticPath, 'index.html');
if (!fs.existsSync(indexPath)) {
    console.error(`❌ index.html 파일을 찾을 수 없습니다: ${indexPath}`);
    process.exit(1);
}

console.log(`✅ 정적 파일 경로: ${staticPath}`);
console.log(`✅ index.html 경로: ${indexPath}`);

// API 라우트 먼저 설정
//app.use('/api', apiRouter);

// API 엔드포인트들을 먼저 정의
app.post('/api/chat', async (req, res) => {
    const { message, image } = req.body;
    
    // 필수 파라미터 검증
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: '유효한 메시지가 필요합니다.' });
    }
    
    console.log('받은 메시지:', message);
    if (image) console.log('이미지 데이터 포함');
    
    try {
        const isConnected = await connectToMongo();
        if (!isConnected) {
            return res.status(500).json({ error: 'MongoDB 연결 실패' });
        }

        const systemMessage = `당신은 친절한 AI 어시스턴트입니다. 사용자의 질문에 명확하고 도움이 되는 답변을 제공해주세요. 환영 메시지는 출력하지 마세요. 이미지가 포함된 경우 이미지 내용을 분석하여 답변해주세요.`;
        
        let messages = [
            { role: 'system', content: systemMessage }
        ];

        // 이미지가 있는 경우 이미지 분석 요청 추가
        if (image) {
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: message },
                    { type: 'image_url', image_url: { url: image } }
                ]
            });
        } else {
            messages.push({ role: 'user', content: message });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4-turbo', // 이미지 분석을 위한 모델로 변경
            messages: messages,
            max_tokens: 1000,
        });

        const reply = completion.choices[0].message.content;
        console.log('AI 응답:', reply);
        
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
    } catch (error) {
        console.error('오류 발생:', error);
        res.status(500).json({ error: '요청 처리 중 오류가 발생했습니다.' });
    }
});

app.get('/api/history', async (req, res) => {
    try {
        const isConnected = await connectToMongo();
        if (!isConnected) {
            return res.status(500).json({ error: 'MongoDB 연결 실패' });
        }

        const db = client.db(dbName);
        const history = await db.collection(collectionName)
            .find()
            .sort({ timestamp: 1 })
            .toArray();
        
        console.log('채팅 기록 조회:', history.length + '개의 메시지');
        res.json({ history });
    } catch (err) {
        console.error('기록 불러오기 실패:', err);
        res.status(500).json({ error: '기록 불러오기 실패' });
    }
});

app.post('/api/rate-message', async (req, res) => {
    const { messageId, rating } = req.body;
    
    // 필수 파라미터 검증
    if (!messageId) {
        return res.status(400).json({ error: '메시지 ID가 필요합니다.' });
    }
    
    if (rating === undefined || rating === null || isNaN(parseInt(rating)) || rating < 0 || rating > 5) {
        return res.status(400).json({ error: '유효한 별점(0-5)이 필요합니다.' });
    }
    
    try {
        const isConnected = await connectToMongo();
        if (!isConnected) {
            return res.status(500).json({ error: 'MongoDB 연결 실패' });
        }

        // ObjectId 유효성 검사
        if (!ObjectId.isValid(messageId)) {
            return res.status(400).json({ error: '유효하지 않은 메시지 ID입니다.' });
        }

        const db = client.db(dbName);
        const result = await db.collection(collectionName).updateOne(
            { "_id": new ObjectId(messageId) },
            { $set: { satisfaction: parseInt(rating) } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: '메시지를 찾을 수 없습니다.' });
        }

        console.log(`메시지 ID ${messageId}의 별점이 ${rating}으로 업데이트되었습니다.`);
        res.json({ success: true });
    } catch (err) {
        console.error('별점 저장 오류:', err);
        res.status(500).json({ error: '별점 저장에 실패했습니다.' });
    }
});

// 정적 파일 서빙 설정
app.use(express.static(staticPath));

// 클라이언트 라우팅을 위한 폴백 (마지막에 정의)
app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
        res.sendFile(indexPath);
    }
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
        
        return true;
    } catch (err) {
        console.error('❌ MongoDB 연결 실패:', err);
        return false;
    }
}

// 서버 시작
app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 서버 실행 중: http://localhost:${port}`);
    connectToMongo().then(() => {
        console.log('초기 MongoDB 연결 완료');
    }).catch(err => {
        console.error('초기 MongoDB 연결 실패:', err);
    });
}); 