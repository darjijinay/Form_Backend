const mongoose = require('mongoose');

// Use MONGO_URI from env or fallback to localhost
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/users_db';

async function dropNameIndex() {
  try {
    console.log('Connecting to', MONGO_URI);
    // Mongoose 6+ handles parser/topology options internally
    await mongoose.connect(MONGO_URI);

    const db = mongoose.connection.db;
    const collectionName = 'users';

    const collections = await db.listCollections({ name: collectionName }).toArray();
    if (!collections.length) {
      console.log(`Collection '${collectionName}' does not exist. Nothing to do.`);
      return process.exit(0);
    }

    const coll = db.collection(collectionName);
    const indexes = await coll.indexes();
    console.log('Existing indexes:', indexes.map(i => i.name));

    // Preferentially remove any unique index on 'name' or 'username'
    const targetKeys = ['name', 'username'];
    let dropped = false;
    for (const keyName of targetKeys) {
      const idx = indexes.find((i) => i.key && i.key[keyName] === 1);
      if (idx) {
        if (idx.unique) {
          console.log(`Dropping unique index '${idx.name}' on '${keyName}'`);
          await coll.dropIndex(idx.name);
          console.log('Index dropped successfully.');
          dropped = true;
          break;
        } else {
          console.log(`Index '${idx.name}' on '${keyName}' is not unique; skipping drop.`);
          dropped = true;
          break;
        }
      }
    }

    if (!dropped) {
      console.log("No index on 'name' or 'username' found. Nothing to drop.");
    }

    process.exit(0);
  } catch (err) {
    console.error('Error while dropping index:', err);
    process.exit(1);
  } finally {
    try {
      await mongoose.disconnect();
    } catch (e) {
      // ignore
    }
  }
}

dropNameIndex();
