// Test UUID Generation
import { generateUUID, isValidUUID } from './src/lib/uuid.js';
import { prepareNewEntity } from './src/lib/entityHelpers.js';

// Generate and test some UUIDs
console.log('Testing UUID generation:');
const uuid1 = generateUUID();
const uuid2 = generateUUID();

console.log(`UUID 1: ${uuid1}`);
console.log(`UUID 2: ${uuid2}`);
console.log(`UUID 1 is valid: ${isValidUUID(uuid1)}`);
console.log(`UUID 2 is valid: ${isValidUUID(uuid2)}`);
console.log(`UUIDs are different: ${uuid1 !== uuid2}`);

// Test entity preparation
console.log('\nTesting entity preparation:');
const testEntity = prepareNewEntity({ 
  name: 'Test Entity', 
  description: 'This is a test entity' 
});

console.log('Prepared entity:', testEntity);
console.log(`Entity has UUID: ${!!testEntity.id}`);
console.log(`UUID is valid: ${isValidUUID(testEntity.id)}`);

// Output an example of how to use UUIDs in code
console.log('\nExample usage in code:');
console.log(`
import { prepareNewEntity } from './lib/entityHelpers';

// When creating a new entity in the database:
async function createRecord(data) {
  // This will add id (UUID)
  const entityData = prepareNewEntity(data);
  
  const { data: result, error } = await supabase
    .from('your_table')
    .insert(entityData)
    .select()
    .single();
    
  return result;
}
`);
