const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const result_Schema = new Schema({
  name: {
    type: String,
    required: true,
  },
  score: {
    type: Number,
    required: true
  }
});

module.exports = mongoose.model('result', result_Schema);