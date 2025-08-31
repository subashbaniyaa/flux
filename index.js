import express from 'express';
import fetch from 'node-fetch';

const app = express();
const port = 3000;

// Hugging Face User Access Token
const HF_API_KEY = "hf_access-token";

app.use(express.json());

async function queryModel(apiKey, modelUrl, data) {
  try {
    const response = await fetch(modelUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('image/')) {

      const buffer = await response.arrayBuffer();
      return { buffer, contentType };
    } else {
      const result = await response.json();
      throw new Error(`Expected image response but received JSON: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error('Error querying Hugging Face API:', error.message);
    throw error;
  }
}

app.get('/flux', async (req, res) => {
  const { gen, model } = req.query;

  if (!gen || !model) {
    return res.status(400).json({ error: 'Query parameters "gen" and "model" are required' });
  }

  let modelUrl;

  if (model === '1') {
    modelUrl = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-dev';
  } else if (model === '2') {
    modelUrl = 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell';
  } else {
    return res.status(400).json({ error: 'Invalid model parameter. Use 1 or 2.' });
  }

  try {
    const { buffer, contentType } = await queryModel(HF_API_KEY, modelUrl, { inputs: gen });
    res.setHeader('Content-Type', contentType);
    res.send(Buffer.from(buffer));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
