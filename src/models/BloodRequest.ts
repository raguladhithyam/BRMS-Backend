import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';

interface BloodRequestAttributes {
  id: string;
  requestorName: string;
  email: string;
  phone: string;
  bloodGroup: string;
  units: number;
  dateTime: Date;
  hospitalName: string;
  location: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  notes?: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  assignedDonorId?: string;
  rejectionReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BloodRequestCreationAttributes extends Optional<BloodRequestAttributes, 'id' | 'status' | 'createdAt' | 'updatedAt'> {}

class BloodRequest extends Model<BloodRequestAttributes, BloodRequestCreationAttributes> implements BloodRequestAttributes {
  public id!: string;
  public requestorName!: string;
  public email!: string;
  public phone!: string;
  public bloodGroup!: string;
  public units!: number;
  public dateTime!: Date;
  public hospitalName!: string;
  public location!: string;
  public urgency!: 'low' | 'medium' | 'high' | 'critical';
  public notes?: string;
  public status!: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  public assignedDonorId?: string;
  public rejectionReason?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

BloodRequest.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    requestorName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 100],
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 15],
      },
    },
    bloodGroup: {
      type: DataTypes.ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      allowNull: false,
    },
    units: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 10,
      },
    },
    dateTime: {
      type: DataTypes.DATE,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: new Date().toISOString(),
      },
    },
    hospitalName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [2, 200],
      },
    },
    location: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [5, 500],
      },
    },
    urgency: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium',
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'fulfilled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    assignedDonorId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    rejectionReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'BloodRequest',
    tableName: 'blood_requests',
  }
);

export { BloodRequest };