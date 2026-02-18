
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// ✅ FIX: Create the 'uploads' directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const upload = multer({ dest: uploadDir });

app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/ocr', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(req.file.path);
      const data = await pdf(dataBuffer);
      text = data.text;
    } else if (req.file.mimetype.startsWith('image/')) {
      // Mock OCR processing for images
      text = `[OCR Text from Image: ${req.file.originalname}] This is a mock OCR result for an image. Real OCR would extract text here.`;
    } else if (req.file.mimetype === 'text/plain') {
      text = fs.readFileSync(req.file.path, 'utf-8');
    } else {
        fs.unlinkSync(req.file.path); // Clean up unsupported file
        return res.status(400).json({ error: 'Unsupported file type.' });
    }
    res.json({ text });
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Error processing file.' });
  } finally {
    // ✅ FIX: Ensure file exists before trying to delete it
    if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
    }
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
