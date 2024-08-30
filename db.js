const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);

// const User = mongoose.model('User', {
//     userID: String,
//     balance: Number,
//     imageCount: Number
// });

const Image = mongoose.model('Image', {
    userID: String,
    prompt: String,
    token: String,
    imageID: String,
    url: String
});

module.exports = {
    // User,
    Image
};