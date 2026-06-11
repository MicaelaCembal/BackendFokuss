require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoURI = process.env.MONGODB_URI;

async function hashearPasswords() {
    await mongoose.connect(mongoURI);
    console.log('Conectado a MongoDB');

    const col = mongoose.connection.db.collection('Usuarios');
    const usuarios = await col.find({}).toArray();

    let actualizados = 0;

    for (const u of usuarios) {
        // Si la password ya es un hash de bcrypt, la saltamos
        if (u.password && u.password.startsWith('$2')) {
            continue;
        }
        if (u.password) {
            const hash = await bcrypt.hash(u.password, 10);
            await col.updateOne({ _id: u._id }, { $set: { password: hash } });
            actualizados++;
        }
    }

    console.log(`Listo. ${actualizados} contraseñas hasheadas.`);
    await mongoose.disconnect();
}

hashearPasswords();