'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add the new enum value to the type column
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_notifications_type" ADD VALUE 'donation_completed';
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Note: PostgreSQL doesn't support removing enum values easily
    // This would require recreating the enum type
    console.log('Warning: Cannot easily remove enum value in PostgreSQL');
  }
}; 