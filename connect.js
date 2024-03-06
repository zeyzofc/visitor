const mongoose = require('mongoose');
const { dbURI } = require('./setting');

function connectMongoDb() {
    mongoose.connect(dbURI, { 
      useNewUrlParser: true, 
      useUnifiedTopology: true,
      useFindAndModify: false // Tambahkan opsi ini
    });
    const db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', () => {
      console.log('[INFO] Berjaya Bersambung Dengan Database Mongo DB');
    });
}

module.exports.connectMongoDb = connectMongoDb;
