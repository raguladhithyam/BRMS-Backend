import { User } from './User';
import { BloodRequest } from './BloodRequest';
import { StudentOptIn } from './StudentOptIn';
import { Notification } from './Notification';
import { LoginHistory } from './LoginHistory';
import { Certificate } from './Certificate';
import { SystemLog } from './SystemLog';

// User associations
User.hasMany(StudentOptIn, { foreignKey: 'studentId', as: 'optIns' });
User.hasMany(BloodRequest, { foreignKey: 'assignedDonorId', as: 'assignedRequests' });
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
User.hasMany(LoginHistory, { foreignKey: 'userId', as: 'loginHistory' });
User.hasMany(Certificate, { foreignKey: 'donorId', as: 'certificates' });

// BloodRequest associations
BloodRequest.belongsTo(User, { foreignKey: 'assignedDonorId', as: 'assignedDonor' });
BloodRequest.hasMany(StudentOptIn, { foreignKey: 'requestId', as: 'optedInStudents' });
BloodRequest.hasMany(Certificate, { foreignKey: 'requestId', as: 'certificates' });

// StudentOptIn associations
StudentOptIn.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
StudentOptIn.belongsTo(BloodRequest, { foreignKey: 'requestId', as: 'request' });

// Notification associations
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// LoginHistory associations
LoginHistory.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Certificate associations
Certificate.belongsTo(User, { foreignKey: 'donorId', as: 'donor' });
Certificate.belongsTo(BloodRequest, { foreignKey: 'requestId', as: 'request' });

export {
  User,
  BloodRequest,
  StudentOptIn,
  Notification,
  LoginHistory,
  Certificate,
  SystemLog,
};