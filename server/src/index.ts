import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import deepseekRouter from './routes/deepseeks';

dotenv.config();

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors()); // Enables CORS for frontend
app.use(express.json()); // Parses JSON body

// Route registration
app.use('/api/deepseek', deepseekRouter);

// Fallback route
app.all('*', (_, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
