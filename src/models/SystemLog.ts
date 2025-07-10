import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface SystemLogAttributes {
  id: string;
  timestamp: Date;
  level: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  user: string; // username/firstname or 'system'
  role: string; // admin, student, or empty
  message: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SystemLogCreationAttributes extends Optional<SystemLogAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class SystemLog extends Model<SystemLogAttributes, SystemLogCreationAttributes> implements SystemLogAttributes {
  public id!: string;
  public timestamp!: Date;
  public level!: 'INFO' | 'ERROR' | 'WARN' | 'DEBUG';
  public user!: string;
  public role!: string;
  public message!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SystemLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    level: {
      type: DataTypes.ENUM('INFO', 'ERROR', 'WARN', 'DEBUG'),
      allowNull: false,
      defaultValue: 'INFO',
    },
    user: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'system',
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'SystemLog',
    tableName: 'system_logs',
  }
);

export { SystemLog }; 