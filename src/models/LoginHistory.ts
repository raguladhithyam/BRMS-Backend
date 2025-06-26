import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface LoginHistoryAttributes {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  loginTime: Date;
  logoutTime?: Date;
  isActive: boolean;
  location?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface LoginHistoryCreationAttributes extends Optional<LoginHistoryAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class LoginHistory extends Model<LoginHistoryAttributes, LoginHistoryCreationAttributes> implements LoginHistoryAttributes {
  public id!: string;
  public userId!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public loginTime!: Date;
  public logoutTime?: Date;
  public isActive!: boolean;
  public location?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LoginHistory.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    loginTime: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    logoutTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'LoginHistory',
    tableName: 'login_history',
  }
);

export { LoginHistory };