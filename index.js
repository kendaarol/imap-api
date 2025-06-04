const express = require('express');
const imaps = require('imap-simple');
const moment = require('moment');

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  if (req.headers.authorization !== `Bearer ${process.env.API_KEY}`) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  next();
});

app.post('/fetch-inbox', async (req, res) => {
  const { email, password, host, port, ssl } = req.body;

  const config = {
    imap: {
      user: email,
      password,
      host,
      port,
      tls: ssl,
      authTimeout: 5000
    }
  };

  try {
    const connection = await imaps.connect(config);
    await connection.openBox('INBOX');

    const yesterday = moment().subtract(1, 'days').format('DD-MMM-YYYY');
    const searchCriteria = [['SINCE', yesterday]];
    const fetchOptions = {
      bodies: ['HEADER.FIELDS (FROM TO SUBJECT DATE)'],
      markSeen: false
    };

    const messages = await connection.search(searchCriteria, fetchOptions);
    const emails = messages.map(item => {
      const header = item.parts[0].body;
      return {
        from: header.from,
        subject: header.subject,
        date: header.date
      };
    });

    res.json(emails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`IMAP API listening on port ${PORT}`));
