const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./config/db'); // Init DB
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

app.get('/', (req, res) => {
  res.send('CabalScanner API Running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
