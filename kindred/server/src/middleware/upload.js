const multer = require('multer');
const AppError = require('../utils/AppError');

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (the app shrinks photos before upload)
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Keeps the file in memory; the controller saves it to MongoDB.
const photoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('Only JPG, PNG, WebP or GIF images are allowed', 400));
  },
}).single('photo');

module.exports = { photoUpload, MAX_BYTES };
