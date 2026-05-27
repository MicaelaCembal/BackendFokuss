const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
    {},
    {
        strict: false,
        collection: 'Usuarios',
    }
);

module.exports = mongoose.model('User', UserSchema);