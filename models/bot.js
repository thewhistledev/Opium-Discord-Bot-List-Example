const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const botSchema = new Schema({
    id: String,
    imageURL: String,
    name: String,
    description: String,
    author: String,
    invite: String
    // Add more fields as needed
});

const Bot = mongoose.model('Bot', botSchema);

module.exports = Bot;  // don't forget to export the model