'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Drop the existing certificates table
    await queryInterface.dropTable('certificates');
    
    // Recreate the certificates table with correct snake_case column names
    await queryInterface.createTable('certificates', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      donor_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'blood_requests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      certificate_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      donor_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      blood_group: {
        type: Sequelize.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allowNull: false,
      },
      donation_date: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      hospital_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      units: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'generated'),
        allowNull: false,
        defaultValue: 'pending',
      },
      admin_approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      generated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      certificate_url: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // Add indexes for better performance
    await queryInterface.addIndex('certificates', ['donor_id']);
    await queryInterface.addIndex('certificates', ['request_id']);
    await queryInterface.addIndex('certificates', ['status']);
    await queryInterface.addIndex('certificates', ['certificate_number']);
  },

  async down(queryInterface, Sequelize) {
    // Drop the certificates table
    await queryInterface.dropTable('certificates');
  }
};
