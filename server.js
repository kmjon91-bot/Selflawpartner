
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

app.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const dataBuffer = fs.readFileSync(req.file.path);

  try {
    const data = await pdf(dataBuffer);
    const text = data.text;
    res.json({ text: text });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error processing PDF.');
  } finally {
    fs.unlinkSync(req.file.path);
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
