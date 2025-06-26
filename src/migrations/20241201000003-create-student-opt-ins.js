'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_opt_ins', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      request_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'blood_requests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      opted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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

    // Add unique constraint
    await queryInterface.addConstraint('student_opt_ins', {
      fields: ['student_id', 'request_id'],
      type: 'unique',
      name: 'unique_student_request_opt_in'
    });

    // Add indexes
    await queryInterface.addIndex('student_opt_ins', ['student_id']);
    await queryInterface.addIndex('student_opt_ins', ['request_id']);
    await queryInterface.addIndex('student_opt_ins', ['opted_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('student_opt_ins');
  }
};