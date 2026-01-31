const { sequelize } = require('../models');

async function migrate() {
  try {
    console.log('Starting database migration...\n');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.\n');

    // Sync all models
    console.log('Syncing database models...');
    await sequelize.sync({ force: false, alter: true });
    console.log('✅ All models synchronized successfully.\n');

    console.log('Database migration completed successfully! 🎉\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    try {
      console.error('--- Migration Error Details ---');
      console.error('name:', error?.name);
      console.error('message:', error?.message);
      console.error('sql:', error?.sql);
      console.error('parent.sqlMessage:', error?.parent?.sqlMessage);
      console.error('parent.sqlState:', error?.parent?.sqlState);
      console.error('parent.errno:', error?.parent?.errno);
      console.error('parent.code:', error?.parent?.code);
      console.error('parent.sql:', error?.parent?.sql);
      console.error('original.sqlMessage:', error?.original?.sqlMessage);
      console.error('original.sql:', error?.original?.sql);
      console.error('stack:', error?.stack);
      console.error('--- End Migration Error Details ---');
    } catch (logError) {
      console.error('Failed to print migration error details:', logError);
    }
    process.exit(1);
  }
}

migrate();
