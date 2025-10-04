const db = require('./src/config/database.js');

(async () => {
  try {
    console.log('Checking subsections in database...\n');

    // Check subsections for section 11
    const [subsections] = await db.execute(`
      SELECT * FROM estimation_subsections WHERE section_id = 11
    `);
    
    console.log(`Subsections for section 11: ${subsections.length}`);
    subsections.forEach(sub => {
      console.log(`  ID: ${sub.id}, Name: ${sub.subsection_name}, Order: ${sub.subsection_order}`);
    });

    // Check all subsections
    const [allSubs] = await db.execute(`
      SELECT * FROM estimation_subsections ORDER BY section_id, subsection_order
    `);
    
    console.log(`\nTotal subsections in database: ${allSubs.length}`);
    allSubs.forEach(sub => {
      console.log(`  Section ${sub.section_id}, ID: ${sub.id}, Name: ${sub.subsection_name}`);
    });

    process.exit(0);
  } catch(error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();