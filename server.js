require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`JOOLA Track API running on port ${PORT} [${process.env.NODE_ENV}]`);
});
