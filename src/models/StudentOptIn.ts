import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface StudentOptInAttributes {
  id: string;
  studentId: string;
  requestId: string;
  optedAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

interface StudentOptInCreationAttributes extends Optional<StudentOptInAttributes, 'id' | 'optedAt' | 'createdAt' | 'updatedAt'> {}

class StudentOptIn extends Model<StudentOptInAttributes, StudentOptInCreationAttributes> implements StudentOptInAttributes {
  public id!: string;
  public studentId!: string;
  public requestId!: string;
  public optedAt!: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

StudentOptIn.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    studentId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    requestId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'blood_requests',
        key: 'id',
      },
    },
    optedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'StudentOptIn',
    tableName: 'student_opt_ins',
    indexes: [
      {
        unique: true,
        fields: ['student_id', 'request_id'],
      },
    ],
  }
);

export { StudentOptIn };