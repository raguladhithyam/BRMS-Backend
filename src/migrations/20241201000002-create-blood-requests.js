'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('blood_requests', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      requestor_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      blood_group: {
        type: Sequelize.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
        allowNull: false
      },
      units: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      date_time: {
        type: Sequelize.DATE,
        allowNull: false
      },
      hospital_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      location: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      urgency: {
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'fulfilled'),
        allowNull: false,
        defaultValue: 'pending'
      },
      assigned_donor_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex('blood_requests', ['status']);
    await queryInterface.addIndex('blood_requests', ['blood_group']);
    await queryInterface.addIndex('blood_requests', ['urgency']);
    await queryInterface.addIndex('blood_requests', ['date_time']);
    await queryInterface.addIndex('blood_requests', ['assigned_donor_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('blood_requests');
  }
};