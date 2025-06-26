'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('student123', 12);
    
    const students = [
      {
        id: uuidv4(),
        name: 'John Doe',
        email: 'john.doe@university.edu',
        password: hashedPassword,
        role: 'student',
        blood_group: 'O+',
        roll_no: 'CS2021001',
        phone: '+1234567890',
        availability: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Jane Smith',
        email: 'jane.smith@university.edu',
        password: hashedPassword,
        role: 'student',
        blood_group: 'A+',
        roll_no: 'CS2021002',
        phone: '+1234567891',
        availability: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: uuidv4(),
        name: 'Mike Johnson',
        email: 'mike.johnson@university.edu',
        password: hashedPassword,
        role: 'student',
        blood_group: 'B+',
        roll_no: 'CS2021003',
        phone: '+1234567892',
        availability: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];
    
    await queryInterface.bulkInsert('users', students);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', {
      role: 'student'
    });
  }
};