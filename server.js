
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/ocr', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  try {
    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else if (req.file.mimetype.startsWith('image/')) {
      // Placeholder for actual OCR processing
      text = 'OCR processing for images is not implemented in this demo.';
    } else if (req.file.mimetype === 'text/plain') {
      text = fs.readFileSync(req.file.path, 'utf-8');
    } else {
      return res.status(400).send('Unsupported file type.');
    }
    res.json({ text: text });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing file.');
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
