import { Router } from 'express';
import fetch from 'node-fetch';

const router = Router();
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

router.post('/', async (req, res) => {
  try {
    const apiResponse = await fetch(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await apiResponse.json();
    res.status(apiResponse.status).json(data);
  } catch (err) {
    console.error('[❌ DeepSeek Proxy Error]', err);
    res.status(500).json({ error: 'Proxy error contacting DeepSeek API' });
  }
});

export default router;

// import { Router } from 'express';
// import fetch from 'node-fetch';

// const router = Router();
// const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

// if (!DEEPSEEK_API_KEY) {
//   console.warn('❌ Missing DEEPSEEK_API_KEY in .env file');
// }

// router.post('/', async (req, res) => {
//   console.log('[📩 Received Request]', req.body);

//   try {
//     // const apiResponse = await fetch(
//     //   'https://api.deepseek.com/v1/chat/completions',
//     //   {
//     //     method: 'POST',
//     //     headers: {
//     //       'Content-Type': 'application/json',
//     //       Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
//     //     },
//     //     body: JSON.stringify(req.body),
//     //   }
//     // );
//     const apiResponse = await fetch(
//       'https://api.deepseek.com/v1/chat/completions',
//       {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
//         },
//         body: JSON.stringify(req.body),
//       }
//     );

//     const data = await apiResponse.json();
//     res.status(apiResponse.status).json(data);
//   } catch (err) {
//     console.error('[❌ Proxy Error]', err);
//     res.status(500).json({ error: 'DeepSeek proxy error' });
//   }
// });

// export default router;
