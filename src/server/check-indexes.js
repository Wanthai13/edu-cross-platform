// check-indexes.js
const { MongoClient } = require('mongodb');

async function checkAllIndexes() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db('myapp');
    const collections = await db.listCollections().toArray();
    
    console.log('🔍 Checking all collections for text indexes...\n');
    console.log('='.repeat(60));
    
    for (const coll of collections) {
      const collName = coll.name;
      const collection = db.collection(collName);
      const indexes = await collection.indexes();
      
      console.log(`\n📁 Collection: ${collName}`);
      
      let hasTextIndex = false;
      for (const index of indexes) {
        // Kiểm tra nếu là text index
        const isTextIndex = Object.values(index.key).includes('text');
        
        if (isTextIndex) {
          hasTextIndex = true;
          console.log(`  ❌ TEXT INDEX FOUND: ${index.name}`);
          console.log(`     Key: ${JSON.stringify(index.key)}`);
          if (index.default_language) {
            console.log(`     Language: ${index.default_language}`);
          }
        } else {
          console.log(`  ✅ ${index.name}: ${JSON.stringify(index.key)}`);
        }
      }
      
      // Xóa text indexes nếu có
      if (hasTextIndex) {
        console.log(`\n  🔧 Dropping text indexes in ${collName}...`);
        try {
          // Xóa từng index có chứa text
          for (const index of indexes) {
            const isTextIndex = Object.values(index.key).includes('text');
            if (isTextIndex && index.name !== '_id_') {
              await collection.dropIndex(index.name);
              console.log(`  ✅ Dropped: ${index.name}`);
            }
          }
        } catch (err) {
          console.log(`  ⚠️ Error dropping index: ${err.message}`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Done! Restart your server now.');
    console.log('💡 The server will recreate indexes without language override.\n');
    
  } catch (err) {
    console.error('🔴 Error:', err);
  } finally {
    await client.close();
  }
}

checkAllIndexes();