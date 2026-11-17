const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  if (env.nodeEnv === 'production') app.set('trust proxy', true);

  app.use(helmet());
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  if (env.nodeEnv === 'development') app.use(morgan('dev'));

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = createApp;
